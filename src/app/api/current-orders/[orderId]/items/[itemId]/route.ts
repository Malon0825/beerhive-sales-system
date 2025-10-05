import { NextRequest, NextResponse } from 'next/server';
import { CurrentOrderRepository } from '@/data/repositories/CurrentOrderRepository';

/**
 * PATCH /api/current-orders/[orderId]/items/[itemId]
 * Update an item in current order
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string; itemId: string } }
) {
  try {
    const { orderId, itemId } = params;
    const body = await request.json();
    const { cashierId, updates } = body;

    if (!cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cashier ID is required',
        },
        { status: 400 }
      );
    }

    const updatedItem = await CurrentOrderRepository.updateItem(
      itemId,
      orderId,
      cashierId,
      updates
    );

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Item updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update item',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/current-orders/[orderId]/items/[itemId]
 * Remove an item from current order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string; itemId: string } }
) {
  try {
    const { orderId, itemId } = params;
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

    await CurrentOrderRepository.removeItem(itemId, orderId, cashierId);

    return NextResponse.json({
      success: true,
      message: 'Item removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to remove item',
      },
      { status: 500 }
    );
  }
}
