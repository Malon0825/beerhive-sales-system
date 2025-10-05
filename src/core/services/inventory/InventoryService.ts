/**
 * InventoryService
 * Business logic utilities for inventory management (client-side safe)
 * Note: This service only contains pure utility functions.
 * For data access, use API routes that call InventoryRepository server-side.
 */
export class InventoryService {
  /**
   * Validate stock adjustment
   */
  static validateAdjustment(
    currentStock: number,
    adjustment: number,
    adjustmentType: string
  ): { valid: boolean; error?: string } {
    const newStock = currentStock + adjustment;

    // Check for negative stock
    if (newStock < 0) {
      return {
        valid: false,
        error: `Adjustment would result in negative stock (${newStock})`,
      };
    }

    // Check for large adjustments (>50% of current stock)
    const percentageChange = Math.abs((adjustment / currentStock) * 100);
    if (percentageChange > 50 && currentStock > 0) {
      return {
        valid: true,
        error: `Warning: Large adjustment (${percentageChange.toFixed(1)}% of current stock)`,
      };
    }

    return { valid: true };
  }

  /**
   * Check if adjustment requires manager approval
   */
  static requiresManagerApproval(
    currentStock: number,
    adjustment: number,
    threshold: number = 10
  ): boolean {
    if (currentStock === 0) return false;
    
    const percentageChange = Math.abs((adjustment / currentStock) * 100);
    return percentageChange > threshold;
  }

  /**
   * Calculate reorder quantity
   */
  static calculateReorderQuantity(
    currentStock: number,
    reorderPoint: number,
    reorderQuantity?: number
  ): number {
    if (currentStock > reorderPoint) {
      return 0; // No need to reorder
    }

    if (reorderQuantity && reorderQuantity > 0) {
      return reorderQuantity;
    }

    // Default: order enough to reach 2x reorder point
    return (reorderPoint * 2) - currentStock;
  }

  /**
   * Get stock status label
   */
  static getStockStatus(
    currentStock: number,
    reorderPoint: number
  ): 'out_of_stock' | 'low_stock' | 'warning' | 'adequate' {
    if (currentStock <= 0) return 'out_of_stock';
    if (currentStock <= reorderPoint) return 'low_stock';
    if (currentStock <= reorderPoint * 1.5) return 'warning';
    return 'adequate';
  }

  /**
   * Format stock level for display
   */
  static formatStockLevel(stock: number, unit: string = 'piece'): string {
    return `${stock.toFixed(2)} ${unit}${stock !== 1 ? 's' : ''}`;
  }

  /**
   * Calculate stock value
   */
  static calculateStockValue(stock: number, costPrice: number): number {
    return Math.round(stock * costPrice * 100) / 100;
  }

  /**
   * Get movement type label
   */
  static getMovementTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      stock_in: 'Stock In',
      stock_out: 'Stock Out',
      transfer: 'Transfer',
      physical_count: 'Physical Count',
      sale: 'Sale',
      void_return: 'Void Return',
    };

    return labels[type] || type;
  }

  /**
   * Get reason label
   */
  static getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      purchase: 'Purchase',
      damaged: 'Damaged',
      expired: 'Expired',
      theft: 'Theft',
      waste: 'Waste',
      count_correction: 'Count Correction',
      transfer_in: 'Transfer In',
      transfer_out: 'Transfer Out',
      sale_deduction: 'Sale Deduction',
      void_return: 'Void Return',
    };

    return labels[reason] || reason;
  }
}
