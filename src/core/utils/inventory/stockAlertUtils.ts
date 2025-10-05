/**
 * Stock Alert Utilities
 * Client-safe utility functions for inventory stock alerts
 * These functions can be used in both client and server components
 */

/**
 * Calculate urgency score (0-100) based on current stock and reorder point
 * @param currentStock - Current stock level
 * @param reorderPoint - Reorder threshold
 * @returns Urgency score from 0 to 100
 */
export function calculateUrgency(currentStock: number, reorderPoint: number): number {
  if (currentStock <= 0) return 100; // Critical - out of stock
  if (currentStock <= reorderPoint * 0.5) return 90; // Very urgent
  if (currentStock <= reorderPoint * 0.75) return 70; // Urgent
  if (currentStock <= reorderPoint) return 50; // Moderate
  if (currentStock <= reorderPoint * 1.25) return 30; // Low
  return 10; // Minimal
}

/**
 * Get urgency color for UI display
 * @param urgency - Urgency score (0-100)
 * @returns Hex color code
 */
export function getUrgencyColor(urgency: number): string {
  if (urgency >= 90) return '#DC2626'; // Red - Critical
  if (urgency >= 70) return '#EA580C'; // Orange - Very Urgent
  if (urgency >= 50) return '#F59E0B'; // Amber - Urgent
  if (urgency >= 30) return '#FCD34D'; // Yellow - Moderate
  return '#9CA3AF'; // Gray - Low
}

/**
 * Get urgency label for UI display
 * @param urgency - Urgency score (0-100)
 * @returns Human-readable urgency label
 */
export function getUrgencyLabel(urgency: number): string {
  if (urgency >= 90) return 'Critical';
  if (urgency >= 70) return 'Very Urgent';
  if (urgency >= 50) return 'Urgent';
  if (urgency >= 30) return 'Moderate';
  return 'Low';
}

/**
 * Estimate days of stock remaining (simplified calculation)
 * @param currentStock - Current stock level
 * @param estimatedDailyUsage - Optional daily usage override
 * @returns Estimated days remaining
 */
export function estimateDaysOfStock(
  currentStock: number,
  estimatedDailyUsage: number = 5
): number {
  if (currentStock <= 0) return 0;
  return Math.floor(currentStock / estimatedDailyUsage);
}

/**
 * Check if product needs reordering
 * @param currentStock - Current stock level
 * @param reorderPoint - Reorder threshold
 * @returns True if stock is at or below reorder point
 */
export function needsReorder(currentStock: number, reorderPoint: number): boolean {
  return currentStock <= reorderPoint;
}

/**
 * Should send notification based on urgency
 * @param urgency - Urgency score (0-100)
 * @param threshold - Notification threshold (default: 70)
 * @returns True if urgency meets or exceeds threshold
 */
export function shouldNotify(urgency: number, threshold: number = 70): boolean {
  return urgency >= threshold;
}

/**
 * Get stock status badge variant
 * @param currentStock - Current stock level
 * @param reorderPoint - Reorder threshold
 * @returns Status: 'critical' | 'low' | 'adequate'
 */
export function getStockStatus(
  currentStock: number,
  reorderPoint: number
): 'critical' | 'low' | 'adequate' {
  if (currentStock <= 0) return 'critical';
  if (currentStock <= reorderPoint) return 'low';
  return 'adequate';
}
