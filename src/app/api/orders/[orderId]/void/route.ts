import { NextRequest, NextResponse } from 'next/server';
import { VoidOrderService } from '@/core/services/orders/VoidOrderService';
import { AppError } from '@/lib/errors/AppError';

/**
 * POST /api/orders/[orderId]/void
 * Void an order (requires manager authorization)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.manager_user_id) {
      return NextResponse.json(
        { success: false, error: 'Manager user ID required' },
        { status: 400 }
      );
    }

    if (!body.reason) {
      return NextResponse.json(
        { success: false, error: 'Void reason required' },
        { status: 400 }
      );
    }

    // Validate reason
    if (!VoidOrderService.validateVoidReason(body.reason)) {
      return NextResponse.json(
        { success: false, error: 'Invalid void reason. Must be at least 10 characters.' },
        { status: 400 }
      );
    }

    // Void order
    const voidedOrder = await VoidOrderService.voidOrder(
      params.orderId,
      body.manager_user_id,
      body.reason,
      body.return_inventory !== false // Default true
    );

    return NextResponse.json({
      success: true,
      data: voidedOrder,
      message: 'Order voided successfully',
    });
  } catch (error) {
    console.error('POST /api/orders/[orderId]/void error:', error);
    
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
