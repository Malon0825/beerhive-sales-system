import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { OrderStatus } from '@/models/enums/OrderStatus';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/orders/by-table/[tableNumber]
 * Fetch current order for a specific table by table number
 * Public endpoint - accessible by customers viewing their bill
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableNumber: string }> }
) {
  try {
    const { tableNumber } = await params;

    if (!tableNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Table number is required',
        },
        { status: 400 }
      );
    }

    // First, find the table by table number
    const { data: table, error: tableError } = await supabaseAdmin
      .from('restaurant_tables')
      .select('id, table_number, area, current_order_id')
      .eq('table_number', tableNumber)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        {
          success: false,
          error: 'Table not found',
        },
        { status: 404 }
      );
    }

    // If no current order, return empty
    if (!table.current_order_id) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No current order for this table',
      });
    }

    // Fetch the current order with items
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customer:customers(id, full_name, customer_number, tier),
        table:restaurant_tables(id, table_number, area),
        order_items(
          id,
          item_name,
          quantity,
          unit_price,
          subtotal,
          discount_amount,
          total,
          notes,
          is_vip_price,
          is_complimentary
        )
      `)
      .eq('id', table.current_order_id)
      .in('status', [OrderStatus.PENDING, OrderStatus.ON_HOLD])
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        // Order not found or not active
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No active order for this table',
        });
      }
      throw new AppError(orderError.message, 500);
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('Error fetching order by table:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch order',
      },
      { status: 500 }
    );
  }
}
