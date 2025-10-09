import { NextRequest, NextResponse } from 'next/server';
import { KitchenStatus } from '@/core/services/kitchen/KitchenStatus';
import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { AppError } from '@/lib/errors/AppError';

/**
 * PATCH /api/kitchen/orders/[orderId]/status
 * Update kitchen order status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const { status, notes } = body;

    // Validate status
    if (!Object.values(KitchenOrderStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from authenticated session
    const userId = request.headers.get('x-user-id') || undefined;

    let result;

    // Use specific methods based on status
    switch (status) {
      case KitchenOrderStatus.PREPARING:
        result = await KitchenStatus.markPreparing(orderId, userId);
        break;
      case KitchenOrderStatus.READY:
        result = await KitchenStatus.markReady(orderId, notes);
        break;
      case KitchenOrderStatus.SERVED:
        result = await KitchenStatus.markServed(orderId);
        break;
      default:
        result = await KitchenStatus.updateStatus(orderId, status, userId, notes);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Status updated to ${status}`,
    });
  } catch (error) {
    console.error('PATCH /api/kitchen/orders/[orderId]/status error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
