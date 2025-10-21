/**
 * Inventory Monitor Background Job
 * 
 * Scheduled job that runs periodically to check inventory conditions
 * and trigger notifications for package availability, bottlenecks, etc.
 * 
 * ARCHITECTURE:
 * - This is a background worker/cron job service
 * - Should be called by a scheduler (e.g., Vercel Cron, node-cron, or serverless function)
 * - Runs independently of user requests
 * 
 * USAGE:
 * ```typescript
 * // In a cron route or scheduled task
 * import { InventoryMonitorJob } from '@/core/services/jobs/InventoryMonitorJob';
 * 
 * export async function GET() {
 *   const result = await InventoryMonitorJob.run();
 *   return Response.json(result);
 * }
 * ```
 * 
 * @module core/services/jobs/InventoryMonitorJob
 */

import { InventoryNotificationService } from '../notifications/InventoryNotificationService';

export interface JobRunResult {
  success: boolean;
  timestamp: string;
  duration_ms: number;
  summary: {
    packages_checked: number;
    notifications_sent: number;
    bottlenecks_detected: number;
    errors: string[];
  };
}

export class InventoryMonitorJob {
  /**
   * Run the inventory monitoring job
   * 
   * This method should be called by a scheduler at regular intervals
   * (recommended: every 5-10 minutes during business hours)
   * 
   * @returns Job execution result
   * 
   * @example
   * ```typescript
   * // Set up with node-cron
   * cron.schedule('*/5 * * * *', async () => {
   *   const result = await InventoryMonitorJob.run();
   *   console.log('Job completed:', result);
   * });
   * ```
   */
  static async run(): Promise<JobRunResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      console.log(`[InventoryMonitorJob] Starting job at ${timestamp}`);

      // Run all scheduled inventory checks
      const summary = await InventoryNotificationService.runScheduledChecks();

      const duration = Date.now() - startTime;

      console.log(`[InventoryMonitorJob] Completed in ${duration}ms`, summary);

      return {
        success: true,
        timestamp,
        duration_ms: duration,
        summary
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[InventoryMonitorJob] Job failed:', error);

      return {
        success: false,
        timestamp,
        duration_ms: duration,
        summary: {
          packages_checked: 0,
          notifications_sent: 0,
          bottlenecks_detected: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        }
      };
    }
  }

  /**
   * Health check - verify job can run successfully
   * 
   * @returns True if job is healthy
   */
  static async healthCheck(): Promise<boolean> {
    try {
      // Simple check - just verify the notification service is accessible
      const stats = InventoryNotificationService.getCooldownStats();
      return stats !== null;
    } catch (error) {
      console.error('[InventoryMonitorJob] Health check failed:', error);
      return false;
    }
  }
}
