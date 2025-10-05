import { AppError } from '@/lib/errors/AppError';

/**
 * OrderCalculation Service
 * Handles all order calculation logic
 */
export class OrderCalculation {
  private static readonly TAX_RATE = 0; // 0% tax (configurable in settings)

  /**
   * Calculate subtotal from items
   */
  static calculateSubtotal(items: Array<{ quantity: number; unit_price: number; discount_amount?: number }>): number {
    return items.reduce((total, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const itemDiscount = item.discount_amount || 0;
      return total + (itemSubtotal - itemDiscount);
    }, 0);
  }

  /**
   * Apply discount to amount
   */
  static applyDiscount(
    amount: number,
    discountType: 'percentage' | 'fixed_amount',
    discountValue: number
  ): { discountedAmount: number; discountAmount: number } {
    try {
      let discountAmount = 0;

      if (discountType === 'percentage') {
        if (discountValue < 0 || discountValue > 100) {
          throw new AppError('Discount percentage must be between 0 and 100', 400);
        }
        discountAmount = Math.round((amount * discountValue) / 100 * 100) / 100;
      } else {
        if (discountValue < 0 || discountValue > amount) {
          throw new AppError('Discount amount cannot exceed total', 400);
        }
        discountAmount = discountValue;
      }

      const discountedAmount = amount - discountAmount;

      return {
        discountedAmount: Math.max(0, Math.round(discountedAmount * 100) / 100),
        discountAmount: Math.round(discountAmount * 100) / 100,
      };
    } catch (error) {
      console.error('Apply discount error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to apply discount', 500);
    }
  }

  /**
   * Calculate tax on amount
   */
  static calculateTax(amount: number, taxRate: number = this.TAX_RATE): number {
    if (taxRate === 0) return 0;
    return Math.round((amount * taxRate) * 100) / 100;
  }

  /**
   * Calculate final total
   */
  static calculateTotal(subtotal: number, discountAmount: number = 0, taxAmount: number = 0): number {
    const total = subtotal - discountAmount + taxAmount;
    return Math.max(0, Math.round(total * 100) / 100);
  }

  /**
   * Calculate change amount
   */
  static calculateChange(totalAmount: number, amountTendered: number): number {
    const change = amountTendered - totalAmount;
    return Math.max(0, Math.round(change * 100) / 100);
  }

  /**
   * Validate split payment amounts
   */
  static validateSplitPayments(
    totalAmount: number,
    payments: Array<{ amount: number }>
  ): { isValid: boolean; totalPaid: number; difference: number } {
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const roundedTotalPaid = Math.round(totalPaid * 100) / 100;
    const roundedTotal = Math.round(totalAmount * 100) / 100;
    const difference = Math.round((roundedTotalPaid - roundedTotal) * 100) / 100;

    return {
      isValid: Math.abs(difference) < 0.01, // Allow 1 cent difference for rounding
      totalPaid: roundedTotalPaid,
      difference,
    };
  }

  /**
   * Calculate order item total
   */
  static calculateOrderItemTotal(
    quantity: number,
    unitPrice: number,
    discountAmount: number = 0
  ): number {
    const subtotal = quantity * unitPrice;
    const total = subtotal - discountAmount;
    return Math.max(0, Math.round(total * 100) / 100);
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount: number, currency: string = 'PHP'): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Round to 2 decimal places
   */
  static roundAmount(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
