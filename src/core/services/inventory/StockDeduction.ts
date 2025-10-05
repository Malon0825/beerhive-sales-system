import { InventoryRepository } from '@/data/repositories/InventoryRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * StockDeduction Service
 * Automatically deducts inventory when orders are completed
 */
export class StockDeduction {
  /**
   * Deduct stock for completed order
   */
  static async deductForOrder(
    orderId: string,
    orderItems: Array<{
      product_id: string | null;
      quantity: number;
    }>,
    userId: string
  ): Promise<void> {
    try {
      const deductions: Array<{
        productId: string;
        quantity: number;
      }> = [];

      // Collect all product deductions
      for (const item of orderItems) {
        if (!item.product_id) continue; // Skip package items or non-product items

        deductions.push({
          productId: item.product_id,
          quantity: item.quantity,
        });
      }

      // Process each deduction
      for (const deduction of deductions) {
        await InventoryRepository.adjustStock(
          deduction.productId,
          -deduction.quantity, // Negative for deduction
          'sale',
          'sale_deduction',
          userId,
          `Auto deduction for order ${orderId}`
        );
      }
    } catch (error) {
      console.error('Stock deduction error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to deduct stock for order', 500);
    }
  }

  /**
   * Return stock for voided order
   */
  static async returnForVoidedOrder(
    orderId: string,
    orderItems: Array<{
      product_id: string | null;
      quantity: number;
    }>,
    userId: string
  ): Promise<void> {
    try {
      const returns: Array<{
        productId: string;
        quantity: number;
      }> = [];

      // Collect all product returns
      for (const item of orderItems) {
        if (!item.product_id) continue;

        returns.push({
          productId: item.product_id,
          quantity: item.quantity,
        });
      }

      // Process each return
      for (const returnItem of returns) {
        await InventoryRepository.adjustStock(
          returnItem.productId,
          returnItem.quantity, // Positive for return
          'void_return',
          'void_return',
          userId,
          `Stock return for voided order ${orderId}`
        );
      }
    } catch (error) {
      console.error('Stock return error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to return stock for voided order', 500);
    }
  }

  /**
   * Check if order items have sufficient stock
   */
  static async checkStockAvailability(
    orderItems: Array<{
      product_id: string | null;
      quantity: number;
    }>
  ): Promise<{
    available: boolean;
    insufficientItems: Array<{
      productId: string;
      requested: number;
      available: number;
    }>;
  }> {
    try {
      const insufficientItems: Array<{
        productId: string;
        requested: number;
        available: number;
      }> = [];

      for (const item of orderItems) {
        if (!item.product_id) continue;

        // Get product
        const { data: product, error } = await (await import('@/data/supabase/client')).supabase
          .from('products')
          .select('id, current_stock')
          .eq('id', item.product_id)
          .single();

        if (error || !product) {
          insufficientItems.push({
            productId: item.product_id,
            requested: item.quantity,
            available: 0,
          });
          continue;
        }

        if (product.current_stock < item.quantity) {
          insufficientItems.push({
            productId: item.product_id,
            requested: item.quantity,
            available: product.current_stock,
          });
        }
      }

      return {
        available: insufficientItems.length === 0,
        insufficientItems,
      };
    } catch (error) {
      console.error('Check stock availability error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to check stock availability', 500);
    }
  }

  /**
   * Reserve stock for pending order (optional feature)
   */
  static async reserveStock(
    orderId: string,
    orderItems: Array<{
      product_id: string | null;
      quantity: number;
    }>
  ): Promise<void> {
    // This is a placeholder for future implementation
    // Could track reserved stock separately to prevent overselling
    console.log('Reserve stock feature not yet implemented', orderId, orderItems);
  }

  /**
   * Release reserved stock (optional feature)
   */
  static async releaseReservedStock(orderId: string): Promise<void> {
    // This is a placeholder for future implementation
    console.log('Release reserved stock feature not yet implemented', orderId);
  }
}
