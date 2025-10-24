import { NotificationService } from './NotificationService';
import { 
  NotificationType, 
  NotificationPriority 
} from '@/models/enums/NotificationType';
import type { 
  InventoryNotificationConfig,
  PackageAvailabilityChange,
  BottleneckDetection,
  StockoutPrediction,
  NotificationTriggerResult,
  DEFAULT_NOTIFICATION_CONFIG
} from '@/models/dtos/InventoryNotification';
import { PackageAvailabilityService } from '../inventory/PackageAvailabilityService';
import { BottleneckAnalyzer } from '../inventory/BottleneckAnalyzer';

/**
 * InventoryNotificationService
 * 
 * Manages automated inventory notifications for package availability,
 * bottlenecks, and stockout predictions.
 * 
 * SOLID Principles Applied:
 * - SRP: Single responsibility - inventory notifications only
 * - OCP: Open for extension via configuration
 * - DIP: Depends on abstractions (NotificationService, PackageAvailabilityService)
 * 
 * Architecture:
 * - Service Layer: Business logic for notification triggers
 * - Depends on: NotificationService (notification creation)
 * - Depends on: PackageAvailabilityService (availability calculations)
 * - Depends on: BottleneckAnalyzer (bottleneck detection)
 * 
 * @example
 * ```typescript
 * // Check and notify about package unavailability
 * await InventoryNotificationService.checkAndNotifyPackageAvailability('package-123');
 * 
 * // Check all packages (scheduled job)
 * await InventoryNotificationService.runScheduledChecks();
 * ```
 */
export class InventoryNotificationService {
  /**
   * In-memory cache for notification cooldown tracking
   * Key: `${notification_type}_${reference_id}`
   * Value: timestamp of last notification
   */
  private static notificationCache = new Map<string, number>();

  /**
   * Configuration for notification thresholds
   * Can be overridden per method call or set globally
   */
  private static config: InventoryNotificationConfig = {
    packageLowStockThreshold: 0.2,
    stockoutPredictionDays: 7,
    bottleneckMinPackages: 2,
    notificationCooldownHours: 24,
  };

  /**
   * Update global configuration
   * 
   * @param config - Partial configuration to update
   */
  static configure(config: Partial<InventoryNotificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if notification cooldown is active
   * Prevents duplicate notifications within cooldown period
   * 
   * @param notificationType - Type of notification
   * @param referenceId - Reference ID (product/package)
   * @param cooldownHours - Cooldown period in hours
   * @returns True if cooldown is active (notification should be suppressed)
   * 
   * @private
   */
  private static isInCooldown(
    notificationType: NotificationType,
    referenceId: string,
    cooldownHours: number
  ): boolean {
    const cacheKey = `${notificationType}_${referenceId}`;
    const lastNotified = this.notificationCache.get(cacheKey);

    if (!lastNotified) return false;

    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const now = Date.now();

    return (now - lastNotified) < cooldownMs;
  }

  /**
   * Record notification timestamp for cooldown tracking
   * 
   * @param notificationType - Type of notification
   * @param referenceId - Reference ID
   * @private
   */
  private static recordNotification(
    notificationType: NotificationType,
    referenceId: string
  ): void {
    const cacheKey = `${notificationType}_${referenceId}`;
    this.notificationCache.set(cacheKey, Date.now());
  }

  /**
   * Check package availability and notify if unavailable or low stock
   * 
   * @param packageId - Package ID to check
   * @param config - Optional configuration override
   * @returns Notification trigger result
   * 
   * @throws Error if package not found or calculation fails
   */
  static async checkAndNotifyPackageAvailability(
    packageId: string,
    config?: Partial<InventoryNotificationConfig>
  ): Promise<NotificationTriggerResult> {
    const cfg = { ...this.config, ...config };

    try {
      // Calculate package availability
      const availability = await PackageAvailabilityService.calculatePackageAvailability(packageId);

      // Check if package is unavailable (max_sellable = 0)
      if (availability.max_sellable === 0) {
        return await this.notifyPackageUnavailable(
          packageId,
          availability.package_name || 'Unknown Package',
          availability.bottleneck_product,
          cfg.notificationCooldownHours
        );
      }

      // Check if package is low stock
      // TODO: Need to determine "normal availability" - for now, use threshold of 20 units
      const normalAvailability = 100; // This should be calculated from historical data
      const threshold = normalAvailability * cfg.packageLowStockThreshold;

      if (availability.max_sellable > 0 && availability.max_sellable <= threshold) {
        return await this.notifyPackageLowStock(
          packageId,
          availability.package_name || 'Unknown Package',
          availability.max_sellable,
          normalAvailability,
          availability.bottleneck_product,
          cfg.notificationCooldownHours
        );
      }

      return {
        triggered: false,
        reason: 'Package availability is adequate'
      };

    } catch (error) {
      console.error(`Failed to check package availability for ${packageId}:`, error);
      throw error;
    }
  }

  /**
   * Notify that a package has become unavailable
   * 
   * @param packageId - Package ID
   * @param packageName - Package name
   * @param bottleneckProduct - Product causing bottleneck
   * @param cooldownHours - Cooldown period
   * @returns Notification trigger result
   * @private
   */
  private static async notifyPackageUnavailable(
    packageId: string,
    packageName: string,
    bottleneckProduct: any,
    cooldownHours: number
  ): Promise<NotificationTriggerResult> {
    // Check cooldown
    if (this.isInCooldown(NotificationType.PACKAGE_UNAVAILABLE, packageId, cooldownHours)) {
      return {
        triggered: false,
        reason: `Cooldown active (${cooldownHours}h)`
      };
    }

    // Create notification
    const notification = await NotificationService.notifySystemAlert(
      '📦 Package Unavailable',
      `${packageName} is now unavailable due to ${bottleneckProduct?.product_name || 'component'} stock depletion`,
      NotificationPriority.URGENT,
      'manager'
    );

    // Record notification timestamp
    this.recordNotification(NotificationType.PACKAGE_UNAVAILABLE, packageId);

    return {
      triggered: true,
      notification_id: notification.id
    };
  }

  /**
   * Notify that a package has low stock
   * 
   * @param packageId - Package ID
   * @param packageName - Package name
   * @param currentAvailability - Current max sellable
   * @param normalAvailability - Normal availability
   * @param bottleneckProduct - Product causing limitation
   * @param cooldownHours - Cooldown period
   * @returns Notification trigger result
   * @private
   */
  private static async notifyPackageLowStock(
    packageId: string,
    packageName: string,
    currentAvailability: number,
    normalAvailability: number,
    bottleneckProduct: any,
    cooldownHours: number
  ): Promise<NotificationTriggerResult> {
    // Check cooldown
    if (this.isInCooldown(NotificationType.PACKAGE_LOW_STOCK, packageId, cooldownHours)) {
      return {
        triggered: false,
        reason: `Cooldown active (${cooldownHours}h)`
      };
    }

    const percentageRemaining = ((currentAvailability / normalAvailability) * 100).toFixed(0);

    // Create notification
    const notification = await NotificationService.notifySystemAlert(
      '⚠️ Package Low Stock',
      `${packageName} has limited availability: ${currentAvailability} packages remaining (${percentageRemaining}% of normal). Limited by ${bottleneckProduct?.product_name || 'component stock'}.`,
      NotificationPriority.HIGH,
      'manager'
    );

    // Record notification timestamp
    this.recordNotification(NotificationType.PACKAGE_LOW_STOCK, packageId);

    return {
      triggered: true,
      notification_id: notification.id
    };
  }

  /**
   * Check for bottleneck products and notify
   * 
   * @param config - Optional configuration override
   * @returns Array of notification trigger results
   * 
   * @throws Error if bottleneck analysis fails
   */
  static async checkAndNotifyBottlenecks(
    config?: Partial<InventoryNotificationConfig>
  ): Promise<NotificationTriggerResult[]> {
    const cfg = { ...this.config, ...config };
    const results: NotificationTriggerResult[] = [];

    try {
      // Get bottleneck analysis
      const analysis = await BottleneckAnalyzer.identifyBottlenecks();
      const bottlenecks = analysis.bottlenecks;

      // Filter bottlenecks affecting minimum number of packages
      const criticalBottlenecks = bottlenecks.filter(
        (b: any) => b.affected_packages.length >= cfg.bottleneckMinPackages
      );

      // Notify for each critical bottleneck
      for (const bottleneck of criticalBottlenecks) {
        // Convert BottleneckProduct to BottleneckDetection format
        const detection: BottleneckDetection = {
          product_id: bottleneck.product_id,
          product_name: bottleneck.product_name,
          current_stock: bottleneck.current_stock,
          affected_packages: bottleneck.affected_packages.map(pkg => ({
            package_id: pkg.package_id,
            package_name: pkg.package_name,
            package_type: 'regular', // Type not available in BottleneckProduct
            current_max_sellable: pkg.max_sellable,
            revenue_per_package: pkg.potential_revenue
          })),
          total_revenue_at_risk: bottleneck.total_revenue_impact,
          recommended_reorder: bottleneck.optimal_restock
        };
        
        const result = await this.notifyBottleneck(detection, cfg.notificationCooldownHours);
        results.push(result);
      }

      return results;

    } catch (error) {
      console.error('Failed to check bottlenecks:', error);
      throw error;
    }
  }

  /**
   * Notify about a bottleneck product
   * 
   * @param bottleneck - Bottleneck detection result
   * @param cooldownHours - Cooldown period
   * @returns Notification trigger result
   * @private
   */
  private static async notifyBottleneck(
    bottleneck: BottleneckDetection,
    cooldownHours: number
  ): Promise<NotificationTriggerResult> {
    const productId = bottleneck.product_id;

    // Check cooldown
    if (this.isInCooldown(NotificationType.PACKAGE_BOTTLENECK, productId, cooldownHours)) {
      return {
        triggered: false,
        reason: `Cooldown active (${cooldownHours}h)`
      };
    }

    const packageNames = bottleneck.affected_packages
      .map(p => p.package_name)
      .slice(0, 3)
      .join(', ');
    const morePackages = bottleneck.affected_packages.length > 3 
      ? ` +${bottleneck.affected_packages.length - 3} more` 
      : '';

    // Create notification
    const notification = await NotificationService.notifySystemAlert(
      '🚨 Bottleneck Alert',
      `${bottleneck.product_name} (${bottleneck.current_stock.toFixed(2)} units) is limiting ${bottleneck.affected_packages.length} packages: ${packageNames}${morePackages}. Revenue at risk: ₱${bottleneck.total_revenue_at_risk.toFixed(2)}`,
      NotificationPriority.URGENT,
      'manager'
    );

    // Record notification timestamp
    this.recordNotification(NotificationType.PACKAGE_BOTTLENECK, productId);

    return {
      triggered: true,
      notification_id: notification.id
    };
  }

  /**
   * Check for predicted stockouts and notify
   * 
   * This method analyzes consumption velocity and predicts
   * when products will run out of stock
   * 
   * @param config - Optional configuration override
   * @returns Array of notification trigger results
   * 
   * @throws Error if prediction analysis fails
   * 
   * @remarks
   * Requires historical sales data for velocity calculation.
   * Velocity is calculated as: total_consumed / days_in_period
   */
  static async checkAndNotifyStockoutPredictions(
    config?: Partial<InventoryNotificationConfig>
  ): Promise<NotificationTriggerResult[]> {
    const cfg = { ...this.config, ...config };
    const results: NotificationTriggerResult[] = [];

    try {
      // This would require implementing velocity calculation
      // For now, return empty array as this needs historical data analysis
      // TODO: Implement in future enhancement

      console.log('Stockout prediction check not yet implemented');
      return results;

    } catch (error) {
      console.error('Failed to check stockout predictions:', error);
      throw error;
    }
  }

  /**
   * Run all scheduled notification checks
   * 
   * This method should be called by a scheduled job (cron/background worker)
   * to periodically check inventory conditions and send notifications
   * 
   * @param config - Optional configuration override
   * @returns Summary of triggered notifications
   * 
   * @example
   * ```typescript
   * // In a cron job or background worker
   * setInterval(async () => {
   *   const summary = await InventoryNotificationService.runScheduledChecks();
   *   console.log('Notifications sent:', summary);
   * }, 5 * 60 * 1000); // Every 5 minutes
   * ```
   */
  static async runScheduledChecks(
    config?: Partial<InventoryNotificationConfig>
  ): Promise<{
    packages_checked: number;
    notifications_sent: number;
    bottlenecks_detected: number;
    errors: string[];
  }> {
    const summary = {
      packages_checked: 0,
      notifications_sent: 0,
      bottlenecks_detected: 0,
      errors: [] as string[]
    };

    try {
      // Check all active packages
      const availabilityMap = await PackageAvailabilityService.calculateAllPackageAvailability();
      summary.packages_checked = availabilityMap.size;

      for (const [packageId, _] of availabilityMap) {
        try {
          const result = await this.checkAndNotifyPackageAvailability(packageId, config);
          if (result.triggered) {
            summary.notifications_sent++;
          }
        } catch (error) {
          summary.errors.push(`Package ${packageId}: ${error}`);
        }
      }

      // Check bottlenecks
      try {
        const bottleneckResults = await this.checkAndNotifyBottlenecks(config);
        summary.bottlenecks_detected = bottleneckResults.filter(r => r.triggered).length;
        summary.notifications_sent += summary.bottlenecks_detected;
      } catch (error) {
        summary.errors.push(`Bottleneck check: ${error}`);
      }

      return summary;

    } catch (error) {
      console.error('Scheduled checks failed:', error);
      summary.errors.push(`Fatal error: ${error}`);
      return summary;
    }
  }

  /**
   * Clear notification cooldown cache
   * Useful for testing or manual override
   * 
   * @param notificationType - Optional: clear specific notification type only
   * @param referenceId - Optional: clear specific reference ID only
   */
  static clearCooldownCache(
    notificationType?: NotificationType,
    referenceId?: string
  ): void {
    if (notificationType && referenceId) {
      const cacheKey = `${notificationType}_${referenceId}`;
      this.notificationCache.delete(cacheKey);
    } else {
      this.notificationCache.clear();
    }
  }

  /**
   * Get cooldown cache statistics
   * Useful for monitoring and debugging
   * 
   * @returns Cache statistics
   */
  static getCooldownStats(): {
    total_entries: number;
    by_type: Record<string, number>;
  } {
    const stats = {
      total_entries: this.notificationCache.size,
      by_type: {} as Record<string, number>
    };

    for (const key of this.notificationCache.keys()) {
      const type = key.split('_')[0];
      stats.by_type[type] = (stats.by_type[type] || 0) + 1;
    }

    return stats;
  }
}
