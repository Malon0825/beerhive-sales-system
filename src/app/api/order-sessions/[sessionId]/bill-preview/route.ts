import { NextRequest, NextResponse } from 'next/server';
import { OrderSessionService } from '@/core/services/orders/OrderSessionService';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/order-sessions/[sessionId]/bill-preview
 * Get bill preview for a session (non-final, shows current status)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const billPreview = await OrderSessionService.getBillPreview(sessionId);

    return NextResponse.json({
      success: true,
      data: billPreview,
    });
  } catch (error) {
    console.error('Get bill preview error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get bill preview' },
      { status: 500 }
    );
  }
}
