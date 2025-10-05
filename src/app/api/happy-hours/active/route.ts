import { NextRequest, NextResponse } from 'next/server';
import { HappyHourRepository } from '@/data/repositories/HappyHourRepository';
import { HappyHourPricing } from '@/core/services/pricing/HappyHourPricing';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/happy-hours/active
 * Get currently active happy hours
 */
export async function GET(request: NextRequest) {
  try {
    const happyHours = await HappyHourRepository.getActive();

    // Filter by active status
    const activeHappyHours = happyHours.filter(hh => HappyHourPricing.isActive(hh));

    return NextResponse.json({
      success: true,
      data: activeHappyHours,
      count: activeHappyHours.length,
      isHappyHourActive: activeHappyHours.length > 0,
    });
  } catch (error) {
    console.error('Get active happy hours error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch active happy hours' },
      { status: 500 }
    );
  }
}
