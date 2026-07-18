-- One-time production repair for the partial inventory deductions created by
-- timed-out close attempts on TAB-20260717-074.
--
-- The repair normalizes inventory to exactly one deduction for the order and
-- marks the already-served order as served, so both the legacy and atomic close
-- paths skip a second deduction. Original movement rows remain for audit.

begin;

lock table public.products, public.inventory_movements, public.orders
  in share row exclusive mode;

do $$
declare
  v_session_status public.session_status;
  v_order_status public.order_status;
  v_line_count integer;
  v_expected_units numeric;
  v_failed_movement_count integer;
begin
  if exists (
    select 1
    from public.inventory_movements
    where reference_number = 'REPAIR-TAB-20260717-074-V1'
  ) then
    raise exception 'Repair REPAIR-TAB-20260717-074-V1 was already applied';
  end if;

  select status into v_session_status
  from public.order_sessions
  where id = '14cb3128-4e91-4837-b9ea-e93ad5e53172'::uuid
  for update;

  select status into v_order_status
  from public.orders
  where id = 'a9a9a82f-120d-401d-971e-c2274fd449ff'::uuid
    and session_id = '14cb3128-4e91-4837-b9ea-e93ad5e53172'::uuid
  for update;

  select count(*) into v_line_count
  from public.order_items
  where order_id = 'a9a9a82f-120d-401d-971e-c2274fd449ff'::uuid;

  select coalesce(sum(required_quantity), 0)
  into v_expected_units
  from (
    select oi.product_id, sum(oi.quantity)::numeric as required_quantity
    from public.order_items oi
    where oi.order_id = 'a9a9a82f-120d-401d-971e-c2274fd449ff'::uuid
      and oi.product_id is not null
    group by oi.product_id
    union all
    select pi.product_id, sum(oi.quantity * pi.quantity)::numeric
    from public.order_items oi
    join public.package_items pi on pi.package_id = oi.package_id
    where oi.order_id = 'a9a9a82f-120d-401d-971e-c2274fd449ff'::uuid
      and oi.package_id is not null
    group by pi.product_id
  ) requirements;

  select count(*) into v_failed_movement_count
  from public.inventory_movements
  where notes = 'Auto deduction for order a9a9a82f-120d-401d-971e-c2274fd449ff';

  if v_session_status <> 'open'::public.session_status
     or v_order_status <> 'draft'::public.order_status
     or v_line_count <> 31
     or v_expected_units <> 140
     or v_failed_movement_count < 347 then
    raise exception
      'Repair guard failed (session %, order %, lines %, expected units %, failed movements %)',
      v_session_status, v_order_status, v_line_count, v_expected_units, v_failed_movement_count;
  end if;
end;
$$;

create temporary table tab_repair_requirements on commit drop as
select product_id, sum(required_quantity) as expected_required
from (
  select oi.product_id, sum(oi.quantity)::numeric as required_quantity
  from public.order_items oi
  where oi.order_id = 'a9a9a82f-120d-401d-971e-c2274fd449ff'::uuid
    and oi.product_id is not null
  group by oi.product_id
  union all
  select pi.product_id, sum(oi.quantity * pi.quantity)::numeric
  from public.order_items oi
  join public.package_items pi on pi.package_id = oi.package_id
  where oi.order_id = 'a9a9a82f-120d-401d-971e-c2274fd449ff'::uuid
    and oi.package_id is not null
  group by pi.product_id
) raw_requirements
group by product_id;

create temporary table tab_repair_adjustments on commit drop as
select
  coalesce(expected.product_id, actual.product_id) as product_id,
  coalesce(actual.actual_deducted, 0) - coalesce(expected.expected_required, 0) as quantity_change
from tab_repair_requirements expected
full join (
  select product_id, -sum(quantity_change)::numeric as actual_deducted
  from public.inventory_movements
  where notes = 'Auto deduction for order a9a9a82f-120d-401d-971e-c2274fd449ff'
  group by product_id
) actual using (product_id);

do $$
declare
  v_invalid text;
begin
  select string_agg(
    format('%s would become %s', p.name, coalesce(p.current_stock, 0) + repair.quantity_change),
    ', '
  )
  into v_invalid
  from tab_repair_adjustments repair
  join public.products p on p.id = repair.product_id
  where coalesce(p.current_stock, 0) + repair.quantity_change < 0;

  if v_invalid is not null then
    raise exception 'Repair would create negative inventory: %', v_invalid;
  end if;
end;
$$;

with updated_products as (
  update public.products p
  set current_stock = coalesce(p.current_stock, 0) + repair.quantity_change,
      updated_at = now()
  from tab_repair_adjustments repair
  where p.id = repair.product_id
    and repair.quantity_change <> 0
  returning
    p.id as product_id,
    repair.quantity_change,
    p.current_stock - repair.quantity_change as quantity_before,
    p.current_stock as quantity_after
)
insert into public.inventory_movements (
  product_id,
  movement_type,
  reason,
  quantity_change,
  quantity_before,
  quantity_after,
  order_id,
  reference_number,
  notes
)
select
  product_id,
  case
    when quantity_change > 0 then 'void_return'::public.adjustment_type
    else 'sale'::public.adjustment_type
  end,
  case
    when quantity_change > 0 then 'void_return'::public.adjustment_reason
    else 'sale_deduction'::public.adjustment_reason
  end,
  quantity_change,
  quantity_before,
  quantity_after,
  'a9a9a82f-120d-401d-971e-c2274fd449ff'::uuid,
  'REPAIR-TAB-20260717-074-V1',
  'Normalized inventory after repeated timed-out tab-close attempts'
from updated_products;

update public.orders
set status = 'served'::public.order_status,
    updated_at = now()
where id = 'a9a9a82f-120d-401d-971e-c2274fd449ff'::uuid
  and status = 'draft'::public.order_status;

commit;
