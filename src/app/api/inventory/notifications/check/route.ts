import { NextRequest, NextResponse } from 'next/server';
import { InventoryNotificationService } from '@/core/services/notifications/InventoryNotificationService';

/**
 * POST /api/inventory/notifications/check
 * 
 * Manually trigger inventory notification checks
 * 
 * Request Body (optional):
 * - package_id?: string - Check specific package
 * - check_bottlenecks?: boolean - Check for bottlenecks
 * - check_all?: boolean - Run all scheduled checks
 * 
 * Response:
 * - success: boolean
 * - data: notification results
 * 
 * @security Requires manager role (should add auth middleware)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Check specific package
    if (body.package_id) {
      const result = await InventoryNotificationService.checkAndNotifyPackageAvailability(
        body.package_id
      );

      return NextResponse.json({
        success: true,
        data: {
          type: 'package_check',
          package_id: body.package_id,
          result
        }
      });
    }

    // Check bottlenecks
    if (body.check_bottlenecks) {
      const results = await InventoryNotificationService.checkAndNotifyBottlenecks();

      return NextResponse.json({
        success: true,
        data: {
          type: 'bottleneck_check',
          results,
          notifications_sent: results.filter(r => r.triggered).length
        }
      });
    }

    // Run all checks (default)
    const summary = await InventoryNotificationService.runScheduledChecks();

    return NextResponse.json({
      success: true,
      data: {
        type: 'full_check',
        summary
      }
    });

  } catch (error) {
    console.error('Inventory notification check failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOTIFICATION_CHECK_FAILED',
          message: 'Failed to check inventory notifications',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inventory/notifications/check
 * 
 * Get notification cooldown statistics
 * 
 * Response:
 * - success: boolean
 * - data: cooldown statistics
 */
export async function GET() {
  try {
    const stats = InventoryNotificationService.getCooldownStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Failed to get cooldown stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'STATS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve cooldown statistics'
        }
      },
      { status: 500 }
    );
  }
}
