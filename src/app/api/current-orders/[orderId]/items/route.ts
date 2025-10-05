import { NextRequest, NextResponse } from 'next/server';
import { CurrentOrderRepository, CurrentOrderItem } from '@/data/repositories/CurrentOrderRepository';

/**
 * POST /api/current-orders/[orderId]/items
 * Add item to current order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await request.json();
    const { cashierId, item } = body;

    if (!cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cashier ID is required',
        },
        { status: 400 }
      );
    }

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: 'Item data is required',
        },
        { status: 400 }
      );
    }

    const addedItem = await CurrentOrderRepository.addItem(
      orderId,
      cashierId,
      item as CurrentOrderItem
    );

    return NextResponse.json(
      {
        success: true,
        data: addedItem,
        message: 'Item added successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding item to current order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to add item',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/current-orders/[orderId]/items
 * Clear all items from current order
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

    await CurrentOrderRepository.clearItems(orderId, cashierId);

    return NextResponse.json({
      success: true,
      message: 'All items cleared successfully',
    });
  } catch (error: any) {
    console.error('Error clearing items from current order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to clear items',
      },
      { status: 500 }
    );
  }
}
