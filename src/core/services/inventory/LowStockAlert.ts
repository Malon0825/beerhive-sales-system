import { InventoryRepository } from '@/data/repositories/InventoryRepository';
import { InventoryService } from './InventoryService';
import { AppError } from '@/lib/errors/AppError';

/**
 * LowStockAlert Service
 * Generates and manages low stock alerts
 */
export class LowStockAlert {
  /**
   * Get all low stock products with alert details
   */
  static async getLowStockAlerts() {
    try {
      const lowStockProducts = await InventoryRepository.getLowStockProducts();

      const alerts = lowStockProducts.map((product) => {
        const status = InventoryService.getStockStatus(
          product.current_stock,
          product.reorder_point
        );

        const reorderQty = InventoryService.calculateReorderQuantity(
          product.current_stock,
          product.reorder_point,
          product.reorder_quantity
        );

        return {
          product,
          status,
          stockLevel: product.current_stock,
          reorderPoint: product.reorder_point,
          reorderQuantity: reorderQty,
          urgency: this.calculateUrgency(product.current_stock, product.reorder_point),
          daysOfStock: this.estimateDaysOfStock(product.current_stock),
        };
      });

      // Sort by urgency (most urgent first)
      alerts.sort((a, b) => b.urgency - a.urgency);

      return alerts;
    } catch (error) {
      console.error('Get low stock alerts error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to get low stock alerts', 500);
    }
  }

  /**
   * Calculate urgency score (0-100)
   */
  private static calculateUrgency(currentStock: number, reorderPoint: number): number {
    if (currentStock <= 0) return 100; // Critical - out of stock
    if (currentStock <= reorderPoint * 0.5) return 90; // Very urgent
    if (currentStock <= reorderPoint * 0.75) return 70; // Urgent
    if (currentStock <= reorderPoint) return 50; // Moderate
    if (currentStock <= reorderPoint * 1.25) return 30; // Low
    return 10; // Minimal
  }

  /**
   * Estimate days of stock remaining (simplified calculation)
   */
  private static estimateDaysOfStock(currentStock: number): number {
    // This is a simplified estimate
    // In a real system, you'd calculate based on average daily sales
    const estimatedDailyUsage = 5; // Placeholder
    return Math.floor(currentStock / estimatedDailyUsage);
  }

  /**
   * Get critical alerts (out of stock or very low)
   */
  static async getCriticalAlerts() {
    try {
      const allAlerts = await this.getLowStockAlerts();
      return allAlerts.filter((alert) => alert.urgency >= 70);
    } catch (error) {
      console.error('Get critical alerts error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to get critical alerts', 500);
    }
  }

  /**
   * Get alert summary
   */
  static async getAlertSummary() {
    try {
      const alerts = await this.getLowStockAlerts();

      return {
        total: alerts.length,
        critical: alerts.filter((a) => a.urgency >= 70).length,
        urgent: alerts.filter((a) => a.urgency >= 50 && a.urgency < 70).length,
        moderate: alerts.filter((a) => a.urgency >= 30 && a.urgency < 50).length,
        low: alerts.filter((a) => a.urgency < 30).length,
      };
    } catch (error) {
      console.error('Get alert summary error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to get alert summary', 500);
    }
  }

  /**
   * Check if product needs reordering
   */
  static needsReorder(currentStock: number, reorderPoint: number): boolean {
    return currentStock <= reorderPoint;
  }

  /**
   * Get urgency color for UI
   */
  static getUrgencyColor(urgency: number): string {
    if (urgency >= 90) return '#DC2626'; // Red - Critical
    if (urgency >= 70) return '#EA580C'; // Orange - Very Urgent
    if (urgency >= 50) return '#F59E0B'; // Amber - Urgent
    if (urgency >= 30) return '#FCD34D'; // Yellow - Moderate
    return '#9CA3AF'; // Gray - Low
  }

  /**
   * Get urgency label
   */
  static getUrgencyLabel(urgency: number): string {
    if (urgency >= 90) return 'Critical';
    if (urgency >= 70) return 'Very Urgent';
    if (urgency >= 50) return 'Urgent';
    if (urgency >= 30) return 'Moderate';
    return 'Low';
  }

  /**
   * Should send notification
   */
  static shouldNotify(urgency: number, threshold: number = 70): boolean {
    return urgency >= threshold;
  }

  /**
   * Generate reorder recommendations
   */
  static async getReorderRecommendations() {
    try {
      const alerts = await this.getLowStockAlerts();
      
      return alerts
        .filter((alert) => alert.urgency >= 50)
        .map((alert) => ({
          product: alert.product,
          currentStock: alert.stockLevel,
          recommendedOrderQty: alert.reorderQuantity,
          urgency: alert.urgency,
          urgencyLabel: this.getUrgencyLabel(alert.urgency),
          estimatedCost: alert.product.cost_price
            ? alert.reorderQuantity * alert.product.cost_price
            : null,
        }));
    } catch (error) {
      console.error('Get reorder recommendations error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to get reorder recommendations', 500);
    }
  }
}
