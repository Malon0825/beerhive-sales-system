/**
 * GET /api/inventory/package-impact/:productId
 * 
 * Returns information about which packages are affected by a specific product
 * Shows package availability based on this product's stock level
 * 
 * Use Case:
 * - Display on product inventory page to show package dependencies
 * - Low stock alerts showing affected packages
 * - Restock decision making
 * 
 * Response Format:
 * {
 *   success: true,
 *   data: {
 *     product_id: string,
 *     product_name: string,
 *     current_stock: number,
 *     affected_packages: [
 *       {
 *         package_id: string,
 *         package_name: string,
 *         quantity_per_package: number,
 *         max_sellable: number,
 *         package_type: 'vip_only' | 'regular' | 'promotional'
 *       }
 *     ],
 *     total_packages_impacted: number,
 *     minimum_package_availability: number
 *   },
 *   meta: {
 *     timestamp: string
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
  { params }: { params: Promise<{ productId: string }> }
) {
  const startTime = Date.now();

  try {
    const { productId } = await params;

    console.log('[API] GET /api/inventory/package-impact/:productId', {
      productId,
    });

    // Validate productId format
    if (!productId || productId.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PRODUCT_ID',
            message: 'Invalid product ID format',
          },
        },
        { status: 400 }
      );
    }

    // Get package impact information
    const impact = await PackageAvailabilityService.getProductPackageImpact(productId);

    const duration = Date.now() - startTime;

    console.log('[API] GET /api/inventory/package-impact/:productId completed', {
      productId,
      productName: impact.product_name,
      packagesImpacted: impact.total_packages_impacted,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      data: impact,
      meta: {
        timestamp: new Date().toISOString(),
        duration_ms: duration,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/inventory/package-impact/:productId error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.statusCode === 404 ? 'PRODUCT_NOT_FOUND' : 'IMPACT_CALCULATION_ERROR',
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
          message: 'Failed to calculate package impact',
        },
      },
      { status: 500 }
    );
  }
}
