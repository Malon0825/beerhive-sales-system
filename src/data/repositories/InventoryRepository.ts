import { supabaseAdmin } from '../supabase/server-client';
import { AppError } from '@/lib/errors/AppError';

/**
 * InventoryRepository
 * Data access layer for inventory movements and stock management
 * Uses supabaseAdmin for server-side operations to bypass RLS
 */
export class InventoryRepository {
  /**
   * Get all inventory movements with optional filters
   */
  static async getAllMovements(filters?: {
    productId?: string;
    movementType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) {
    try {
      let query = supabaseAdmin
        .from('inventory_movements')
        .select(`
          *,
          products(id, sku, name, unit_of_measure),
          performed_by:users!inventory_movements_performed_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }

      if (filters?.movementType) {
        query = query.eq('movement_type', filters.movementType);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new AppError(`Failed to fetch inventory movements: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get inventory movements error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch inventory movements', 500);
    }
  }

  /**
   * Get inventory movement by ID
   */
  static async getMovementById(id: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('inventory_movements')
        .select(`
          *,
          products(id, sku, name, unit_of_measure),
          performed_by:users!inventory_movements_performed_by_fkey(id, full_name),
          approved_by:users!inventory_movements_approved_by_fkey(id, full_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new AppError(`Failed to fetch movement: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Get movement by ID error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch movement', 500);
    }
  }

  /**
   * Log inventory movement
   */
  static async logMovement(movement: {
    product_id: string;
    movement_type: string;
    reason: string;
    quantity_change: number;
    quantity_before: number;
    quantity_after: number;
    unit_cost?: number;
    total_cost?: number;
    order_id?: string;
    reference_number?: string;
    performed_by?: string;
    approved_by?: string;
    notes?: string;
  }) {
    try {
      const { data, error } = await supabaseAdmin
        .from('inventory_movements')
        .insert(movement)
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to log movement: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Log movement error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to log movement', 500);
    }
  }

  /**
   * Get products with low stock
   */
  static async getLowStockProducts() {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .lte('current_stock', supabaseAdmin.rpc('get_reorder_point', {}))
        .eq('is_active', true)
        .order('current_stock', { ascending: true });

      if (error) {
        // Fallback query if RPC doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('current_stock', { ascending: true });

        if (fallbackError) {
          throw new AppError(`Failed to fetch low stock products: ${fallbackError.message}`, 500);
        }

        // Filter manually
        return (fallbackData || []).filter(p => p.current_stock <= p.reorder_point);
      }

      return data || [];
    } catch (error) {
      console.error('Get low stock products error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch low stock products', 500);
    }
  }

  /**
   * Update product stock
   */
  static async updateStock(productId: string, newStock: number) {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .update({ current_stock: newStock })
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to update stock: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Update stock error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update stock', 500);
    }
  }

  /**
   * Adjust stock with movement logging
   */
  static async adjustStock(
    productId: string,
    quantityChange: number,
    movementType: string,
    reason: string,
    performedBy: string,
    notes?: string,
    unitCost?: number
  ) {
    try {
      // Get current product
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) {
        throw new AppError(`Product not found: ${productError.message}`, 404);
      }

      const quantityBefore = product.current_stock;
      const quantityAfter = quantityBefore + quantityChange;

      // Validate stock doesn't go negative
      if (quantityAfter < 0) {
        throw new AppError('Insufficient stock', 400);
      }

      // Update stock
      await this.updateStock(productId, quantityAfter);

      // Log movement
      const totalCost = unitCost ? Math.abs(quantityChange) * unitCost : undefined;

      await this.logMovement({
        product_id: productId,
        movement_type: movementType,
        reason,
        quantity_change: quantityChange,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        unit_cost: unitCost,
        total_cost: totalCost,
        performed_by: performedBy,
        notes,
      });

      return { success: true, quantityBefore, quantityAfter };
    } catch (error) {
      console.error('Adjust stock error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to adjust stock', 500);
    }
  }

  /**
   * Get stock level statistics
   */
  static async getStockStatistics() {
    try {
      const { data: products, error } = await supabaseAdmin
        .from('products')
        .select('current_stock, reorder_point')
        .eq('is_active', true);

      if (error) {
        throw new AppError(`Failed to fetch statistics: ${error.message}`, 500);
      }

      const total = products?.length || 0;
      const lowStock = products?.filter(p => p.current_stock <= p.reorder_point).length || 0;
      const outOfStock = products?.filter(p => p.current_stock <= 0).length || 0;
      const adequate = total - lowStock - outOfStock;

      return {
        total,
        lowStock,
        outOfStock,
        adequate,
      };
    } catch (error) {
      console.error('Get stock statistics error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch statistics', 500);
    }
  }

  /**
   * Get movements by product
   */
  static async getMovementsByProduct(productId: string, limit: number = 50) {
    try {
      const { data, error } = await supabaseAdmin
        .from('inventory_movements')
        .select(`
          *,
          performed_by:users!inventory_movements_performed_by_fkey(id, full_name)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new AppError(`Failed to fetch movements: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get movements by product error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch movements', 500);
    }
  }
}
