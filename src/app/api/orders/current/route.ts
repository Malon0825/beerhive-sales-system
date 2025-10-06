import { NextRequest, NextResponse } from 'next/server';
import { OrderRepository } from '@/data/repositories/OrderRepository';
import { OrderStatus } from '@/models/enums/OrderStatus';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/current
 * Fetch all current (pending and on-hold) orders with full details
 * Accessible by cashier, manager, and admin roles
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tableId = searchParams.get('tableId');
    
    // Get all active orders (pending and on-hold)
    const orders = await OrderRepository.getActive();

    // Filter by table if tableId is provided (for customer-facing view)
    if (tableId) {
      const filteredOrders = orders.filter(
        (order) => order.table_id === tableId
      );
      
      return NextResponse.json({
        success: true,
        data: filteredOrders,
      });
    }

    // Return all current orders (for staff view)
    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('Error fetching current orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch current orders',
      },
      { status: 500 }
    );
  }
}
