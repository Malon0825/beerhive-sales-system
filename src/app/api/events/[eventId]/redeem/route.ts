import { NextRequest, NextResponse } from 'next/server';
import { RedemptionService } from '@/core/services/events/RedemptionService';
import { AppError } from '@/lib/errors/AppError';

/**
 * POST /api/events/:eventId/redeem
 * Redeem event offer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = await request.json();

    // Validate order_id
    if (!body.order_id) {
      return NextResponse.json(
        { success: false, error: 'order_id is required' },
        { status: 400 }
      );
    }

    const redeemedEvent = await RedemptionService.redeem(
      eventId,
      body.order_id
    );

    return NextResponse.json({
      success: true,
      data: redeemedEvent,
      message: 'Offer redeemed successfully',
    });
  } catch (error) {
    console.error('Redeem event error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to redeem offer' },
      { status: 500 }
    );
  }
}
