/**
 * GET /api/packages/availability
 * 
 * Returns availability for all active packages
 * Calculates max sellable quantity based on component product stocks
 * 
 * Query Parameters:
 * - includeInactive: boolean - Include inactive packages (default: false)
 * - forceRefresh: boolean - Skip cache and recalculate (default: false)
 * - format: 'full' | 'summary' - Response format (default: 'summary')
 * 
 * Response Format (summary):
 * {
 *   success: true,
 *   data: [
 *     {
 *       package_id: string,
 *       package_name: string,
 *       max_sellable: number,
 *       status: 'available' | 'low_stock' | 'out_of_stock',
 *       bottleneck?: { product_name: string, current_stock: number }
 *     }
 *   ],
 *   meta: {
 *     timestamp: string,
 *     count: number,
 *     cache_stats: { size: number, version: number }
 *   }
 * }
 * 
 * Response Format (full):
 * Returns detailed availability with component breakdown for each package
 */

import { NextRequest, NextResponse } from 'next/server';
import { PackageAvailabilityService } from '@/core/services/inventory/PackageAvailabilityService';
import { AppError } from '@/lib/errors/AppError';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const format = searchParams.get('format') || 'summary';

    console.log('[API] GET /api/packages/availability', {
      includeInactive,
      forceRefresh,
      format,
    });

    // Get availability data based on format
    let data;
    if (format === 'full') {
      // Get detailed availability for all packages
      const availabilityMap = await PackageAvailabilityService.calculateAllPackageAvailability({
        includeInactive,
        forceRefresh,
      });

      // Convert map to array with details
      const packages = await import('@/data/repositories/PackageRepository').then(
        (m) => m.PackageRepository.getActivePackages()
      );

      data = await Promise.all(
        packages.map(async (pkg) => {
          try {
            return await PackageAvailabilityService.calculatePackageAvailability(
              pkg.id,
              forceRefresh
            );
          } catch (error) {
            console.error(`[API] Error calculating availability for ${pkg.id}:`, error);
            return {
              package_id: pkg.id,
              package_name: pkg.name,
              max_sellable: 0,
              component_availability: [],
            };
          }
        })
      );
    } else {
      // Get summary format (default)
      data = await PackageAvailabilityService.getAllPackageSummaries({
        includeInactive,
        forceRefresh,
      });
    }

    // Get cache statistics
    const cacheStats = PackageAvailabilityService.getCacheStats();

    const duration = Date.now() - startTime;

    console.log('[API] GET /api/packages/availability completed', {
      count: Array.isArray(data) ? data.length : 0,
      duration: `${duration}ms`,
      cacheSize: cacheStats.size,
    });

    return NextResponse.json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        count: Array.isArray(data) ? data.length : 0,
        duration_ms: duration,
        cache_stats: cacheStats,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/packages/availability error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AVAILABILITY_CALCULATION_ERROR',
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
