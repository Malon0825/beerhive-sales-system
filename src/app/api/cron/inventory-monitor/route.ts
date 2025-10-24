import { NextRequest, NextResponse } from 'next/server';
import { InventoryMonitorJob } from '@/core/services/jobs/InventoryMonitorJob';

/**
 * GET /api/cron/inventory-monitor
 * 
 * Scheduled job endpoint for inventory monitoring
 * 
 * This endpoint should be called by a cron service at regular intervals
 * (e.g., Vercel Cron, GitHub Actions, external cron service)
 * 
 * SECURITY:
 * - Requires CRON_SECRET environment variable
 * - Provide token in Authorization header or query parameter
 * 
 * AUTHENTICATION:
 * - Bearer token: Authorization: Bearer <CRON_SECRET>
 * - Query param: ?token=<CRON_SECRET>
 * 
 * SETUP:
 * See docs/release-v1.1.0/PHASE_4_TECHNICAL_DOCUMENTATION.md
 * for Vercel Cron and GitHub Actions configuration examples
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    if (expectedToken) {
      const token = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('token');
      
      if (token !== expectedToken) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid cron token'
            }
          },
          { status: 401 }
        );
      }
    }

    // Run the inventory monitor job
    const result = await InventoryMonitorJob.run();

    return NextResponse.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    console.error('Cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'JOB_FAILED',
          message: 'Inventory monitor job failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/inventory-monitor
 * 
 * Manual trigger for testing (same as GET)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
