import { supabaseAdmin } from '@/data/supabase/server-client';
import { AppError } from '@/lib/errors/AppError';

/**
 * StockValidationService
 * 
 * Handles stock validation and availability checks for orders
 * Works for both POS and Tab modules
 * 
 * @remarks
 * This service provides robust stock checking before order creation/confirmation
 * to ensure inventory reliability and prevent overselling
 */
export class StockValidationService {
  /**
   * Check if a product is a drink/beverage
   * Drinks require strict stock validation (cannot be served without stock)
   * 
   * @param categoryName - Product category name
   * @returns true if product is a drink/beverage
   */
  private static isDrinkProduct(categoryName: string): boolean {
    const normalizedCategory = categoryName?.toLowerCase() || '';
    return (
      normalizedCategory.includes('beer') ||
      normalizedCategory.includes('beverage') ||
      normalizedCategory.includes('drink') ||
      normalizedCategory.includes('alcohol')
    );
  }

  /**
   * Check stock availability for a single product
   * 
   * @param productId - Product UUID
   * @param requestedQuantity - Quantity requested
   * @returns Stock availability details
   */
  static async checkProductStock(
    productId: string,
    requestedQuantity: number
  ): Promise<{
    available: boolean;
    currentStock: number;
    productName: string;
    categoryName: string;
    isDrink: boolean;
    message?: string;
  }> {
    try {
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select(`
          id,
          name,
          current_stock,
          is_active,
          category:product_categories(name)
        `)
        .eq('id', productId)
        .single();

      if (error || !product) {
        throw new AppError(`Product not found: ${productId}`, 404);
      }

      if (!product.is_active) {
        return {
          available: false,
          currentStock: product.current_stock ?? 0,
          productName: product.name,
          categoryName: (product.category as any)?.name || '',
          isDrink: false,
          message: 'Product is not active',
        };
      }

      const currentStock = product.current_stock ?? 0;
      const categoryName = (product.category as any)?.name || '';
      const isDrink = this.isDrinkProduct(categoryName);

      // For drinks, stock must be sufficient
      if (isDrink) {
        if (currentStock <= 0) {
          return {
            available: false,
            currentStock,
            productName: product.name,
            categoryName,
            isDrink: true,
            message: 'Product is out of stock',
          };
        }

        if (currentStock < requestedQuantity) {
          return {
            available: false,
            currentStock,
            productName: product.name,
            categoryName,
            isDrink: true,
            message: `Insufficient stock. Available: ${currentStock}, Requested: ${requestedQuantity}`,
          };
        }
      }

      // For food items, always available (kitchen confirms)
      return {
        available: true,
        currentStock,
        productName: product.name,
        categoryName,
        isDrink,
        message: currentStock <= 0 ? 'Low stock - kitchen confirmation required' : undefined,
      };
    } catch (error) {
      console.error('Check product stock error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to check stock', 500);
    }
  }

  /**
   * Validate stock availability for multiple order items
   * 
   * @param items - Array of order items with product_id and quantity
   * @returns Validation result with list of unavailable items
   */
  static async validateOrderStock(
    items: Array<{
      product_id: string | null;
      quantity: number;
      item_name?: string;
    }>
  ): Promise<{
    valid: boolean;
    unavailableItems: Array<{
      productId: string;
      productName: string;
      requested: number;
      available: number;
      message: string;
    }>;
    warnings: Array<{
      productId: string;
      productName: string;
      message: string;
    }>;
  }> {
    const unavailableItems: Array<{
      productId: string;
      productName: string;
      requested: number;
      available: number;
      message: string;
    }> = [];

    const warnings: Array<{
      productId: string;
      productName: string;
      message: string;
    }> = [];

    // Group items by product_id to handle multiple quantities
    const productQuantities = new Map<string, number>();
    
    for (const item of items) {
      if (!item.product_id) continue; // Skip package items or null products

      const existing = productQuantities.get(item.product_id) || 0;
      productQuantities.set(item.product_id, existing + item.quantity);
    }

    // Check stock for each unique product
    for (const [productId, totalQuantity] of productQuantities.entries()) {
      const stockCheck = await this.checkProductStock(productId, totalQuantity);

      if (!stockCheck.available) {
        unavailableItems.push({
          productId,
          productName: stockCheck.productName,
          requested: totalQuantity,
          available: stockCheck.currentStock,
          message: stockCheck.message || 'Not available',
        });
      } else if (stockCheck.message) {
        warnings.push({
          productId,
          productName: stockCheck.productName,
          message: stockCheck.message,
        });
      }
    }

    return {
      valid: unavailableItems.length === 0,
      unavailableItems,
      warnings,
    };
  }

  /**
   * Get products with low or out of stock
   * Useful for inventory alerts
   * 
   * @returns List of products needing attention
   */
  static async getLowStockProducts(): Promise<
    Array<{
      id: string;
      name: string;
      sku: string;
      currentStock: number;
      reorderPoint: number;
      categoryName: string;
      status: 'out_of_stock' | 'low_stock';
    }>
  > {
    try {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select(`
          id,
          name,
          sku,
          current_stock,
          reorder_point,
          is_active,
          category:product_categories(name)
        `)
        .eq('is_active', true)
        .order('current_stock', { ascending: true });

      if (error) {
        throw new AppError(`Failed to fetch low stock products: ${error.message}`, 500);
      }

      return (products || [])
        .filter(p => (p.current_stock ?? 0) <= (p.reorder_point ?? 0))
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: p.current_stock ?? 0,
          reorderPoint: p.reorder_point ?? 0,
          categoryName: (p.category as any)?.name || '',
          status: (p.current_stock ?? 0) <= 0 ? 'out_of_stock' : 'low_stock',
        }));
    } catch (error) {
      console.error('Get low stock products error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch low stock products', 500);
    }
  }

  /**
   * Check if product should be visible in product selection
   * Based on stock levels and category
   * 
   * @param product - Product to check
   * @returns true if product should be displayed
   */
  static shouldDisplayProduct(product: {
    current_stock: number;
    is_active: boolean;
    category?: { name: string };
  }): boolean {
    // Inactive products are never displayed
    if (!product.is_active) {
      return false;
    }

    const categoryName = product.category?.name || '';
    const isDrink = this.isDrinkProduct(categoryName);

    // Drinks with no stock are hidden
    if (isDrink && product.current_stock <= 0) {
      return false;
    }

    // All other products are shown (food items show even with 0 stock)
    return true;
  }

  /**
   * Get stock status label for UI display
   * 
   * @param currentStock - Current stock level
   * @param reorderPoint - Reorder point threshold
   * @param categoryName - Product category
   * @returns Stock status with label and variant
   */
  static getStockStatus(
    currentStock: number,
    reorderPoint: number,
    categoryName: string
  ): {
    status: 'out_of_stock' | 'low_stock' | 'adequate';
    label: string;
    variant: 'destructive' | 'warning' | 'success';
    shouldWarn: boolean;
  } {
    const isDrink = this.isDrinkProduct(categoryName);

    if (currentStock <= 0) {
      return {
        status: 'out_of_stock',
        label: isDrink ? 'Out of Stock' : 'Out of Stock (Kitchen Confirm)',
        variant: 'destructive',
        shouldWarn: isDrink,
      };
    }

    if (currentStock <= reorderPoint) {
      return {
        status: 'low_stock',
        label: `Low Stock (${currentStock})`,
        variant: 'warning',
        shouldWarn: true,
      };
    }

    return {
      status: 'adequate',
      label: `In Stock (${currentStock})`,
      variant: 'success',
      shouldWarn: false,
    };
  }
}
