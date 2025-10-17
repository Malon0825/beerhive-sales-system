import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/order-sessions/[sessionId]/manage-items
 * Get all items from all orders in a session for management
 * 
 * Returns items with:
 * - Kitchen status
 * - Modification permissions
 * - Order context
 * 
 * Professional UX: All items in one view for easy management
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Get session with all orders and items
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('order_sessions')
      .select(`
        id,
        session_number,
        status,
        total_amount,
        orders(
          id,
          order_number,
          status,
          order_items(
            id,
            item_name,
            quantity,
            unit_price,
            subtotal,
            discount_amount,
            total,
            product_id,
            package_id,
            is_complimentary,
            is_vip_price,
            notes
          )
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new AppError(`Session not found: ${sessionError.message}`, 404);
    }

    // Get kitchen status for all items
    const allOrderIds = session.orders?.map((o: any) => o.id) || [];
    
    const { data: kitchenOrders } = await supabaseAdmin
      .from('kitchen_orders')
      .select('order_item_id, status')
      .in('order_id', allOrderIds);

    // Build kitchen status map
    const kitchenStatusMap = new Map<string, string>();
    kitchenOrders?.forEach((ko: any) => {
      kitchenStatusMap.set(ko.order_item_id, ko.status);
    });

    // Process items
    const items = [];
    for (const order of (session.orders || [])) {
      const orderItemCount = order.order_items?.length || 0;
      
      for (const item of (order.order_items || [])) {
        const kitchenStatus = kitchenStatusMap.get(item.id);
        const canModify = order.status === 'confirmed'; // Only confirmed orders can be modified
        const isLastItem = orderItemCount === 1;

        items.push({
          id: item.id,
          order_id: order.id,
          order_number: order.order_number,
          order_status: order.status,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          discount_amount: item.discount_amount,
          total: item.total,
          product_id: item.product_id,
          package_id: item.package_id,
          is_complimentary: item.is_complimentary,
          is_vip_price: item.is_vip_price,
          notes: item.notes,
          kitchen_status: kitchenStatus || null,
          can_modify: canModify,
          is_last_item_in_order: isLastItem,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        session_number: session.session_number,
        total_amount: session.total_amount,
        items,
      },
    });
  } catch (error) {
    console.error('GET /api/order-sessions/[sessionId]/manage-items error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to load items' },
      { status: 500 }
    );
  }
}
