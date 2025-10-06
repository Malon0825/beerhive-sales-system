import { NextRequest, NextResponse } from 'next/server';
import { HappyHourRepository } from '@/data/repositories/HappyHourRepository';
import { AppError } from '@/lib/errors/AppError';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/happy-hours
 * Get all happy hours
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const happyHours = await HappyHourRepository.getAll(includeInactive);

    return NextResponse.json({
      success: true,
      data: happyHours,
      count: happyHours.length,
    });
  } catch (error) {
    console.error('Get happy hours error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch happy hours' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/happy-hours
 * Create new happy hour
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get user ID from headers (set by middleware/auth) or use null
    const userId = request.headers.get('x-user-id') || null;

    // Validate required fields
    if (!body.name || !body.start_time || !body.end_time) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(body.start_time) || !timeRegex.test(body.end_time)) {
      return NextResponse.json(
        { success: false, error: 'Invalid time format. Use HH:MM:SS' },
        { status: 400 }
      );
    }

    // Validate discount value
    if (body.discount_value === undefined || body.discount_value < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid discount value' },
        { status: 400 }
      );
    }

    // Validate days of week
    if (body.days_of_week && !Array.isArray(body.days_of_week)) {
      return NextResponse.json(
        { success: false, error: 'Days of week must be an array' },
        { status: 400 }
      );
    }

    const happyHour = await HappyHourRepository.create(body, userId);

    return NextResponse.json(
      {
        success: true,
        data: happyHour,
        message: 'Happy hour created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create happy hour error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create happy hour' },
      { status: 500 }
    );
  }
}
