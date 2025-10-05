import { NextRequest, NextResponse } from 'next/server';
import { CurrentOrderRepository } from '@/data/repositories/CurrentOrderRepository';

/**
 * GET /api/current-orders/[orderId]
 * Fetch a specific current order by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const searchParams = request.nextUrl.searchParams;
    const cashierId = searchParams.get('cashierId');

    if (!cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cashier ID is required',
        },
        { status: 400 }
      );
    }

    const order = await CurrentOrderRepository.getById(orderId, cashierId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found or access denied',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('Error fetching current order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch order',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/current-orders/[orderId]
 * Update a current order
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await request.json();
    const { cashierId, customerId, tableId, orderNotes, isOnHold } = body;

    if (!cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cashier ID is required',
        },
        { status: 400 }
      );
    }

    const order = await CurrentOrderRepository.update(orderId, cashierId, {
      customer_id: customerId,
      table_id: tableId,
      order_notes: orderNotes,
      is_on_hold: isOnHold,
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating current order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update order',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/current-orders/[orderId]
 * Delete a current order (cancel draft)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const searchParams = request.nextUrl.searchParams;
    const cashierId = searchParams.get('cashierId');

    if (!cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cashier ID is required',
        },
        { status: 400 }
      );
    }

    await CurrentOrderRepository.delete(orderId, cashierId);

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting current order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete order',
      },
      { status: 500 }
    );
  }
}
