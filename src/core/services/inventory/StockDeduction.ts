import { InventoryRepository } from '@/data/repositories/InventoryRepository';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * StockDeduction Service
 * Automatically deducts inventory when orders are completed
 */
export class StockDeduction {
  /**
   * Deduct stock for completed order
   * 
   * Processes each product independently to ensure all items are attempted
   * even if one fails. Handles user ID validation to prevent UUID errors.
   * 
   * @param orderId - The order ID for reference
   * @param orderItems - Array of order items to deduct
   * @param userId - User performing the deduction (must be valid UUID)
   * @returns Promise that resolves with deduction results
   * @throws AppError if all deductions fail
   */
  static async deductForOrder(
    orderId: string,
    orderItems: Array<{
      product_id: string | null;
      quantity: number;
    }>,
    userId: string
  ): Promise<void> {
    // Validate userId is provided and not empty
    if (!userId || userId.trim() === '') {
      throw new AppError(
        'Valid user ID required for stock deduction. Cannot process order without user attribution.',
        400
      );
    }
    console.log(`📦 [StockDeduction.deductForOrder] Processing ${orderItems.length} items for order ${orderId}`);

    const deductions: Array<{
      productId: string;
      quantity: number;
    }> = [];

    // Collect all product deductions (skip packages and null product_ids)
    for (const item of orderItems) {
      if (!item.product_id) {
        console.log(`⏭️  [StockDeduction.deductForOrder] Skipping item without product_id (likely a package)`);
        continue;
      }

      deductions.push({
        productId: item.product_id,
        quantity: item.quantity,
      });
    }

    console.log(`📦 [StockDeduction.deductForOrder] ${deductions.length} products to deduct`);

    // Track results for each deduction attempt
    const results: Array<{
      productId: string;
      quantity: number;
      success: boolean;
      error?: string;
    }> = [];

    // Process each deduction independently
    for (let i = 0; i < deductions.length; i++) {
      const deduction = deductions[i];
      
      try {
        console.log(
          `📦 [StockDeduction.deductForOrder] [${i + 1}/${deductions.length}] ` +
          `Deducting ${deduction.quantity} units of product ${deduction.productId}`
        );

        await InventoryRepository.adjustStock(
          deduction.productId,
          -deduction.quantity, // Negative for deduction
          'sale',
          'sale_deduction',
          userId,
          `Auto deduction for order ${orderId}`
        );

        results.push({
          productId: deduction.productId,
          quantity: deduction.quantity,
          success: true,
        });

        console.log(
          `✅ [StockDeduction.deductForOrder] [${i + 1}/${deductions.length}] ` +
          `Successfully deducted ${deduction.quantity} units of product ${deduction.productId}`
        );
      } catch (error) {
        // Log the error but continue processing other products
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error(
          `❌ [StockDeduction.deductForOrder] [${i + 1}/${deductions.length}] ` +
          `Failed to deduct product ${deduction.productId}: ${errorMessage}`
        );

        results.push({
          productId: deduction.productId,
          quantity: deduction.quantity,
          success: false,
          error: errorMessage,
        });
      }
    }

    // Check if any deductions failed
    const failures = results.filter(r => !r.success);
    const successes = results.filter(r => r.success);

    console.log(
      `📊 [StockDeduction.deductForOrder] Results: ` +
      `${successes.length} succeeded, ${failures.length} failed`
    );

    // If all deductions failed, throw an error
    if (failures.length > 0 && successes.length === 0) {
      throw new AppError(
        `All stock deductions failed for order ${orderId}. ` +
        `Failed products: ${failures.map(f => f.productId).join(', ')}`,
        500
      );
    }

    // If some failed but some succeeded, log warning but don't throw
    if (failures.length > 0) {
      console.warn(
        `⚠️  [StockDeduction.deductForOrder] Partial failure: ` +
        `${failures.length} product(s) failed to deduct. ` +
        `Manual adjustment may be required for: ${failures.map(f => f.productId).join(', ')}`
      );
      
      // Don't throw error - payment is already processed
      // Admin should handle manual adjustment
    }
  }

  /**
   * Return stock for voided order
   * 
   * Processes each product independently to ensure all items are attempted
   * even if one fails. Handles user ID validation to prevent UUID errors.
   * 
   * @param orderId - The order ID for reference
   * @param orderItems - Array of order items to return
   * @param userId - User performing the return (must be valid UUID)
   * @returns Promise that resolves with return results
   * @throws AppError if all returns fail
   */
  static async returnForVoidedOrder(
    orderId: string,
    orderItems: Array<{
      product_id: string | null;
      quantity: number;
    }>,
    userId: string
  ): Promise<void> {
    // Validate userId is provided and not empty
    if (!userId || userId.trim() === '') {
      throw new AppError(
        'Valid user ID required for stock return. Cannot process voided order without user attribution.',
        400
      );
    }
    console.log(`🔄 [StockDeduction.returnForVoidedOrder] Processing ${orderItems.length} items for order ${orderId}`);

    const returns: Array<{
      productId: string;
      quantity: number;
    }> = [];

    // Collect all product returns (skip packages and null product_ids)
    for (const item of orderItems) {
      if (!item.product_id) {
        console.log(`⏭️  [StockDeduction.returnForVoidedOrder] Skipping item without product_id`);
        continue;
      }

      returns.push({
        productId: item.product_id,
        quantity: item.quantity,
      });
    }

    console.log(`🔄 [StockDeduction.returnForVoidedOrder] ${returns.length} products to return`);

    // Track results for each return attempt
    const results: Array<{
      productId: string;
      quantity: number;
      success: boolean;
      error?: string;
    }> = [];

    // Process each return independently
    for (let i = 0; i < returns.length; i++) {
      const returnItem = returns[i];
      
      try {
        console.log(
          `🔄 [StockDeduction.returnForVoidedOrder] [${i + 1}/${returns.length}] ` +
          `Returning ${returnItem.quantity} units of product ${returnItem.productId}`
        );

        await InventoryRepository.adjustStock(
          returnItem.productId,
          returnItem.quantity, // Positive for return
          'void_return',
          'void_return',
          userId,
          `Stock return for voided order ${orderId}`
        );

        results.push({
          productId: returnItem.productId,
          quantity: returnItem.quantity,
          success: true,
        });

        console.log(
          `✅ [StockDeduction.returnForVoidedOrder] [${i + 1}/${returns.length}] ` +
          `Successfully returned ${returnItem.quantity} units of product ${returnItem.productId}`
        );
      } catch (error) {
        // Log the error but continue processing other products
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error(
          `❌ [StockDeduction.returnForVoidedOrder] [${i + 1}/${returns.length}] ` +
          `Failed to return product ${returnItem.productId}: ${errorMessage}`
        );

        results.push({
          productId: returnItem.productId,
          quantity: returnItem.quantity,
          success: false,
          error: errorMessage,
        });
      }
    }

    // Check if any returns failed
    const failures = results.filter(r => !r.success);
    const successes = results.filter(r => r.success);

    console.log(
      `📊 [StockDeduction.returnForVoidedOrder] Results: ` +
      `${successes.length} succeeded, ${failures.length} failed`
    );

    // If all returns failed, throw an error
    if (failures.length > 0 && successes.length === 0) {
      throw new AppError(
        `All stock returns failed for voided order ${orderId}. ` +
        `Failed products: ${failures.map(f => f.productId).join(', ')}`,
        500
      );
    }

    // If some failed but some succeeded, log warning but don't throw
    if (failures.length > 0) {
      console.warn(
        `⚠️  [StockDeduction.returnForVoidedOrder] Partial failure: ` +
        `${failures.length} product(s) failed to return. ` +
        `Manual adjustment may be required for: ${failures.map(f => f.productId).join(', ')}`
      );
    }
  }

  /**
   * Check if order items have sufficient stock
   * 
   * Uses server-side admin client to bypass RLS and get accurate stock levels
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
      console.log(`🔍 [StockDeduction.checkStockAvailability] Checking stock for ${orderItems.length} items...`);
      
      const insufficientItems: Array<{
        productId: string;
        requested: number;
        available: number;
      }> = [];

      for (const item of orderItems) {
        if (!item.product_id) {
          console.log(`⏭️  [StockDeduction.checkStockAvailability] Skipping item without product_id`);
          continue;
        }

        // Get product using server-side admin client (bypasses RLS)
        const { data: product, error } = await supabaseAdmin
          .from('products')
          .select('id, name, current_stock')
          .eq('id', item.product_id)
          .single();

        if (error) {
          console.error(`❌ [StockDeduction.checkStockAvailability] Error fetching product ${item.product_id}:`, error);
          insufficientItems.push({
            productId: item.product_id,
            requested: item.quantity,
            available: 0,
          });
          continue;
        }

        if (!product) {
          console.warn(`⚠️  [StockDeduction.checkStockAvailability] Product not found: ${item.product_id}`);
          insufficientItems.push({
            productId: item.product_id,
            requested: item.quantity,
            available: 0,
          });
          continue;
        }

        const currentStock = product.current_stock ?? 0;
        console.log(
          `📊 [StockDeduction.checkStockAvailability] Product: ${product.name || item.product_id.substring(0, 8)} ` +
          `- Current: ${currentStock}, Requested: ${item.quantity}`
        );

        if (currentStock < item.quantity) {
          console.warn(
            `⚠️  [StockDeduction.checkStockAvailability] Insufficient stock for ${product.name || item.product_id}: ` +
            `Available ${currentStock}, Requested ${item.quantity}`
          );
          insufficientItems.push({
            productId: item.product_id,
            requested: item.quantity,
            available: currentStock,
          });
        } else {
          console.log(`✅ [StockDeduction.checkStockAvailability] Sufficient stock available`);
        }
      }

      const allAvailable = insufficientItems.length === 0;
      console.log(
        `${allAvailable ? '✅' : '❌'} [StockDeduction.checkStockAvailability] ` +
        `Result: ${allAvailable ? 'All items available' : `${insufficientItems.length} item(s) insufficient`}`
      );

      return {
        available: allAvailable,
        insufficientItems,
      };
    } catch (error) {
      console.error('❌ [StockDeduction.checkStockAvailability] Error:', error);
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
