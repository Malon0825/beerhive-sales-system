import { NextRequest, NextResponse } from 'next/server';
import { HappyHourRepository } from '@/data/repositories/HappyHourRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/happy-hours/:happyHourId
 * Get happy hour by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ happyHourId: string }> }
) {
  try {
    const { happyHourId } = await params;
    const happyHour = await HappyHourRepository.getById(happyHourId);

    if (!happyHour) {
      return NextResponse.json(
        { success: false, error: 'Happy hour not found' },
        { status: 404 }
      );
    }

    // Also get associated products
    const products = await HappyHourRepository.getHappyHourProducts(happyHourId);

    return NextResponse.json({
      success: true,
      data: {
        ...happyHour,
        products,
      },
    });
  } catch (error) {
    console.error('Get happy hour error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch happy hour' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/happy-hours/:happyHourId
 * Update happy hour
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ happyHourId: string }> }
) {
  try {
    const { happyHourId } = await params;
    const body = await request.json();

    // Validate time format if provided
    if (body.start_time || body.end_time) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (body.start_time && !timeRegex.test(body.start_time)) {
        return NextResponse.json(
          { success: false, error: 'Invalid start_time format. Use HH:MM:SS' },
          { status: 400 }
        );
      }
      if (body.end_time && !timeRegex.test(body.end_time)) {
        return NextResponse.json(
          { success: false, error: 'Invalid end_time format. Use HH:MM:SS' },
          { status: 400 }
        );
      }
    }

    const happyHour = await HappyHourRepository.update(happyHourId, body);

    return NextResponse.json({
      success: true,
      data: happyHour,
      message: 'Happy hour updated successfully',
    });
  } catch (error) {
    console.error('Update happy hour error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update happy hour' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/happy-hours/:happyHourId
 * Delete happy hour (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ happyHourId: string }> }
) {
  try {
    const { happyHourId } = await params;
    await HappyHourRepository.delete(happyHourId);

    return NextResponse.json({
      success: true,
      message: 'Happy hour deleted successfully',
    });
  } catch (error) {
    console.error('Delete happy hour error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete happy hour' },
      { status: 500 }
    );
  }
}
