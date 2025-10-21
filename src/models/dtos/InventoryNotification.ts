/**
 * Inventory Notification DTOs
 * Data Transfer Objects for inventory notification configuration and triggers
 */

/**
 * Configuration for inventory notification thresholds
 */
export interface InventoryNotificationConfig {
  /**
   * Percentage threshold for package low stock warning (default: 20%)
   * Package is considered low stock when availability < (normal_availability * threshold)
   */
  packageLowStockThreshold: number;

  /**
   * Days ahead to predict stockout (default: 7 days)
   */
  stockoutPredictionDays: number;

  /**
   * Minimum number of packages affected to trigger bottleneck alert (default: 2)
   */
  bottleneckMinPackages: number;

  /**
   * Cooldown period in hours to prevent duplicate notifications (default: 24h)
   */
  notificationCooldownHours: number;
}

/**
 * Default notification configuration
 */
export const DEFAULT_NOTIFICATION_CONFIG: InventoryNotificationConfig = {
  packageLowStockThreshold: 0.2, // 20%
  stockoutPredictionDays: 7,
  bottleneckMinPackages: 2,
  notificationCooldownHours: 24,
};

/**
 * Package availability change event
 */
export interface PackageAvailabilityChange {
  package_id: string;
  package_name: string;
  previous_availability: number;
  current_availability: number;
  bottleneck_product: {
    product_id: string;
    product_name: string;
    current_stock: number;
    required_per_package: number;
  };
}

/**
 * Bottleneck detection result
 */
export interface BottleneckDetection {
  product_id: string;
  product_name: string;
  current_stock: number;
  affected_packages: Array<{
    package_id: string;
    package_name: string;
    package_type: string;
    current_max_sellable: number;
    revenue_per_package: number;
  }>;
  total_revenue_at_risk: number;
  recommended_reorder: number;
}

/**
 * Stockout prediction result
 */
export interface StockoutPrediction {
  product_id: string;
  product_name: string;
  current_stock: number;
  daily_velocity: number;
  days_until_stockout: number;
  affected_packages: string[]; // Package names
  recommended_action: string;
}

/**
 * Notification trigger result
 */
export interface NotificationTriggerResult {
  triggered: boolean;
  notification_id?: string;
  reason?: string; // Why notification was not triggered (e.g., "cooldown period active")
}
