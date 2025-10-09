import { NextRequest, NextResponse } from 'next/server';
import { OrderSessionService } from '@/core/services/orders/OrderSessionService';
import { AppError } from '@/lib/errors/AppError';

/**
 * POST /api/order-sessions/[sessionId]/close
 * Close a session and process final payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { payment_method, amount_tendered, discount_amount, notes, closed_by } = body;

    // Validation
    if (!payment_method) {
      return NextResponse.json(
        { success: false, error: 'Payment method is required' },
        { status: 400 }
      );
    }

    if (!amount_tendered || amount_tendered <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount tendered must be greater than 0' },
        { status: 400 }
      );
    }

    const result = await OrderSessionService.closeTab(sessionId, {
      payment_method,
      amount_tendered,
      discount_amount,
      notes,
      closed_by,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Tab closed successfully',
    });
  } catch (error) {
    console.error('Close session error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to close tab' },
      { status: 500 }
    );
  }
}
