-- Close a tab, deduct inventory, and finalize its orders in one database
-- transaction. The session row lock makes retries and concurrent payment
-- submissions idempotent: only the first caller can perform the mutations.

create or replace function public.close_order_session_atomic(
  p_session_id uuid,
  p_payment_method text,
  p_amount_tendered numeric,
  p_closed_by uuid,
  p_discount_type text default null,
  p_discount_value numeric default null,
  p_discount_amount numeric default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = 'public'
as $$
declare
  v_session public.order_sessions%rowtype;
  v_net_before_discount numeric;
  v_additional_discount numeric := 0;
  v_final_discount numeric;
  v_final_total numeric;
  v_change numeric;
  v_first_order_id uuid;
  v_adjusted_products integer := 0;
  v_completed_orders integer := 0;
  v_insufficient text;
begin
  if p_closed_by is null then
    raise exception using errcode = '22023', message = 'User ID (closed_by) is required to close tab';
  end if;

  if p_payment_method is null or btrim(p_payment_method) = '' then
    raise exception using errcode = '22023', message = 'Payment method is required';
  end if;

  -- Serialize close attempts. A concurrent retry waits here, then observes the
  -- committed closed state and returns without changing inventory again.
  select *
  into v_session
  from public.order_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Session not found';
  end if;

  if v_session.status = 'closed'::public.session_status then
    return jsonb_build_object(
      'success', true,
      'already_closed', true,
      'session_id', v_session.id,
      'final_discount_total', coalesce(v_session.discount_amount, 0),
      'final_total_amount', coalesce(v_session.total_amount, 0),
      'change_amount', greatest(0, round(coalesce(p_amount_tendered, 0) - coalesce(v_session.total_amount, 0), 2)),
      'stock_products_adjusted', 0,
      'orders_completed', 0
    );
  end if;

  if v_session.status <> 'open'::public.session_status then
    raise exception using errcode = '22023', message = 'Session is not open';
  end if;

  v_net_before_discount := greatest(
    0,
    coalesce(v_session.subtotal, 0) - coalesce(v_session.discount_amount, 0)
  );

  if p_discount_type is not null or p_discount_value is not null then
    if p_discount_type not in ('percentage', 'fixed_amount') or p_discount_value is null or p_discount_value <= 0 then
      raise exception using errcode = '22023', message = 'Invalid discount type or value';
    end if;

    if p_discount_type = 'percentage' then
      if p_discount_value > 100 then
        raise exception using errcode = '22023', message = 'Discount percentage cannot exceed 100';
      end if;
      v_additional_discount := round(v_net_before_discount * p_discount_value / 100, 2);
    else
      if p_discount_value > v_net_before_discount then
        raise exception using errcode = '22023', message = 'Discount amount cannot exceed total';
      end if;
      v_additional_discount := round(p_discount_value, 2);
    end if;
  elsif coalesce(p_discount_amount, 0) > 0 then
    v_additional_discount := least(round(p_discount_amount, 2), v_net_before_discount);
  end if;

  v_final_discount := coalesce(v_session.discount_amount, 0) + v_additional_discount;
  v_final_total := greatest(
    0,
    round(coalesce(v_session.subtotal, 0) - v_final_discount + coalesce(v_session.tax_amount, 0), 2)
  );

  if p_payment_method = 'none' and v_final_total <> 0 then
    raise exception using errcode = '22023', message = 'Payment method none is only valid for zero-amount tabs';
  end if;

  if p_payment_method <> 'none' then
    -- Validate the enum before doing any work.
    perform p_payment_method::public.payment_method;
  end if;

  if coalesce(p_amount_tendered, 0) < v_final_total then
    raise exception using errcode = '22023', message = 'Payment amount is less than total';
  end if;

  v_change := greatest(0, round(coalesce(p_amount_tendered, 0) - v_final_total, 2));

  -- Lock every affected product in a stable order, then validate the complete
  -- requirement set before making any update. This prevents partial deduction.
  perform p.id
  from public.products p
  join (
    select product_id, sum(required_quantity) as required_quantity
    from (
      select oi.product_id, sum(oi.quantity)::numeric as required_quantity
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.session_id = p_session_id
        and o.status in (
          'draft'::public.order_status,
          'pending'::public.order_status,
          'on_hold'::public.order_status
        )
        and oi.product_id is not null
      group by oi.product_id

      union all

      select pi.product_id, sum(oi.quantity * pi.quantity)::numeric as required_quantity
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      join public.package_items pi on pi.package_id = oi.package_id
      where o.session_id = p_session_id
        and o.status in (
          'draft'::public.order_status,
          'pending'::public.order_status,
          'on_hold'::public.order_status
        )
        and oi.package_id is not null
      group by pi.product_id
    ) raw_requirements
    group by product_id
  ) requirements on requirements.product_id = p.id
  order by p.id
  for update of p;

  select string_agg(
    format('%s (available %s, required %s)', p.name, coalesce(p.current_stock, 0), requirements.required_quantity),
    ', '
    order by p.name
  )
  into v_insufficient
  from public.products p
  join (
    select product_id, sum(required_quantity) as required_quantity
    from (
      select oi.product_id, sum(oi.quantity)::numeric as required_quantity
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.session_id = p_session_id
        and o.status in ('draft'::public.order_status, 'pending'::public.order_status, 'on_hold'::public.order_status)
        and oi.product_id is not null
      group by oi.product_id
      union all
      select pi.product_id, sum(oi.quantity * pi.quantity)::numeric as required_quantity
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      join public.package_items pi on pi.package_id = oi.package_id
      where o.session_id = p_session_id
        and o.status in ('draft'::public.order_status, 'pending'::public.order_status, 'on_hold'::public.order_status)
        and oi.package_id is not null
      group by pi.product_id
    ) raw_requirements
    group by product_id
  ) requirements on requirements.product_id = p.id
  where coalesce(p.current_stock, 0) < requirements.required_quantity;

  if v_insufficient is not null then
    raise exception using errcode = '22023', message = 'Insufficient stock: ' || v_insufficient;
  end if;

  -- One statement updates each product once and writes one corresponding audit
  -- movement. Any error rolls back the entire function call.
  with requirements as (
    select product_id, sum(required_quantity) as required_quantity
    from (
      select oi.product_id, sum(oi.quantity)::numeric as required_quantity
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.session_id = p_session_id
        and o.status in ('draft'::public.order_status, 'pending'::public.order_status, 'on_hold'::public.order_status)
        and oi.product_id is not null
      group by oi.product_id
      union all
      select pi.product_id, sum(oi.quantity * pi.quantity)::numeric as required_quantity
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      join public.package_items pi on pi.package_id = oi.package_id
      where o.session_id = p_session_id
        and o.status in ('draft'::public.order_status, 'pending'::public.order_status, 'on_hold'::public.order_status)
        and oi.package_id is not null
      group by pi.product_id
    ) raw_requirements
    group by product_id
  ), updated_products as (
    update public.products p
    set current_stock = coalesce(p.current_stock, 0) - requirements.required_quantity,
        updated_at = now()
    from requirements
    where p.id = requirements.product_id
    returning
      p.id as product_id,
      requirements.required_quantity,
      p.current_stock + requirements.required_quantity as quantity_before,
      p.current_stock as quantity_after
  ), inserted_movements as (
    insert into public.inventory_movements (
      product_id,
      movement_type,
      reason,
      quantity_change,
      quantity_before,
      quantity_after,
      reference_number,
      performed_by,
      notes
    )
    select
      product_id,
      'sale'::public.adjustment_type,
      'sale_deduction'::public.adjustment_reason,
      -required_quantity,
      quantity_before,
      quantity_after,
      v_session.session_number,
      p_closed_by,
      format('Atomic stock deduction for session %s', v_session.session_number)
    from updated_products
    returning id
  )
  select count(*)::integer into v_adjusted_products from inserted_movements;

  update public.orders
  set status = 'completed'::public.order_status,
      cashier_id = p_closed_by,
      payment_method = case
        when p_payment_method = 'none' then payment_method
        else p_payment_method::public.payment_method
      end,
      completed_at = now(),
      updated_at = now()
  where session_id = p_session_id
    and status not in ('completed'::public.order_status, 'voided'::public.order_status);

  get diagnostics v_completed_orders = row_count;

  update public.order_sessions
  set status = 'closed'::public.session_status,
      closed_at = now(),
      closed_by = p_closed_by,
      discount_amount = v_final_discount,
      total_amount = v_final_total,
      updated_at = now()
  where id = p_session_id;

  update public.restaurant_tables
  set current_session_id = null,
      status = 'available',
      updated_at = now()
  where id = v_session.table_id
    and current_session_id = p_session_id;

  if v_additional_discount > 0 then
    select id
    into v_first_order_id
    from public.orders
    where session_id = p_session_id
      and status <> 'voided'::public.order_status
    order by created_at
    limit 1;

    insert into public.discounts (
      discount_amount,
      discount_type,
      discount_value,
      reason,
      cashier_id,
      manager_id,
      order_id,
      order_item_id,
      notes
    ) values (
      v_additional_discount,
      coalesce(p_discount_type, 'fixed_amount')::public.discount_type,
      coalesce(p_discount_value, v_additional_discount),
      coalesce(nullif(btrim(p_notes), ''), 'Tab discount applied at closure'),
      p_closed_by,
      null,
      v_first_order_id,
      null,
      format('Session: %s | Amount: %s', v_session.session_number, v_additional_discount)
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'already_closed', false,
    'session_id', p_session_id,
    'final_discount_total', v_final_discount,
    'final_total_amount', v_final_total,
    'change_amount', v_change,
    'stock_products_adjusted', v_adjusted_products,
    'orders_completed', v_completed_orders
  );
end;
$$;

comment on function public.close_order_session_atomic(uuid, text, numeric, uuid, text, numeric, numeric, text)
is 'Atomically and idempotently closes an order session, deducts aggregated inventory, completes orders, and releases its table.';

revoke all on function public.close_order_session_atomic(uuid, text, numeric, uuid, text, numeric, numeric, text) from public;
revoke all on function public.close_order_session_atomic(uuid, text, numeric, uuid, text, numeric, numeric, text) from anon;
revoke all on function public.close_order_session_atomic(uuid, text, numeric, uuid, text, numeric, numeric, text) from authenticated;
grant execute on function public.close_order_session_atomic(uuid, text, numeric, uuid, text, numeric, numeric, text) to service_role;
