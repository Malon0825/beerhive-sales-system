/**
 * GET /api/packages/:packageId/availability
 * 
 * Returns detailed availability for a single package
 * Includes component breakdown and bottleneck identification
 * 
 * Query Parameters:
 * - forceRefresh: boolean - Skip cache and recalculate (default: false)
 * 
 * Response Format:
 * {
 *   success: true,
 *   data: {
 *     package_id: string,
 *     package_name: string,
 *     max_sellable: number,
 *     bottleneck_product?: {
 *       product_id: string,
 *       product_name: string,
 *       current_stock: number,
 *       required_per_package: number
 *     },
 *     component_availability: [
 *       {
 *         product_id: string,
 *         product_name: string,
 *         current_stock: number,
 *         required_per_package: number,
 *         max_packages: number
 *       }
 *     ]
 *   },
 *   meta: {
 *     timestamp: string,
 *     cached: boolean
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { PackageAvailabilityService } from '@/core/services/inventory/PackageAvailabilityService';
import { AppError } from '@/lib/errors/AppError';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { packageId: string } }
) {
  const startTime = Date.now();

  try {
    const packageId = params.packageId;
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    console.log('[API] GET /api/packages/:packageId/availability', {
      packageId,
      forceRefresh,
    });

    // Validate packageId format (basic UUID check)
    if (!packageId || packageId.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PACKAGE_ID',
            message: 'Invalid package ID format',
          },
        },
        { status: 400 }
      );
    }

    // Calculate availability
    const availability = await PackageAvailabilityService.calculatePackageAvailability(
      packageId,
      forceRefresh
    );

    const duration = Date.now() - startTime;

    console.log('[API] GET /api/packages/:packageId/availability completed', {
      packageId,
      packageName: availability.package_name,
      maxSellable: availability.max_sellable,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      data: availability,
      meta: {
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        cached: !forceRefresh,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/packages/:packageId/availability error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.statusCode === 404 ? 'PACKAGE_NOT_FOUND' : 'AVAILABILITY_ERROR',
            message: error.message,
          },
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to calculate package availability',
        },
      },
      { status: 500 }
    );
  }
}
