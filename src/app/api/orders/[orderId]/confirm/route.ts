import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/core/services/orders/OrderService';
import { AppError } from '@/lib/errors/AppError';

/**
 * PATCH /api/orders/[orderId]/confirm
 * Confirm an order and send to kitchen/bartender
 * This triggers food preparation WITHOUT requiring payment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const confirmedOrder = await OrderService.confirmOrder(orderId);

    return NextResponse.json({
      success: true,
      data: confirmedOrder,
      message: 'Order confirmed and sent to kitchen',
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to confirm order' },
      { status: 500 }
    );
  }
}
