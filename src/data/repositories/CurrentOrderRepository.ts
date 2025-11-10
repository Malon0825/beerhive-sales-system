// @ts-nocheck - Complex Supabase nested queries cause deep type instantiation errors
import { supabase } from '../supabase/client';
import { supabaseAdmin } from '../supabase/server-client';
import { AppError } from '@/lib/errors/AppError';

/**
 * Current Order Item Interface
 * Represents an item in a draft order
 */
export interface CurrentOrderItem {
  id?: string;
  current_order_id?: string;
  product_id?: string;
  package_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  is_vip_price?: boolean;
  is_complimentary?: boolean;
  notes?: string;
  addons?: CurrentOrderItemAddon[];
}

/**
 * Current Order Item Addon Interface
 */
export interface CurrentOrderItemAddon {
  id?: string;
  addon_id: string;
  addon_name: string;
  addon_price: number;
  quantity: number;
}

/**
 * Current Order Interface
 * Represents a draft order being built in POS
 */
export interface CurrentOrder {
  id?: string;
  cashier_id: string;
  customer_id?: string;
  table_id?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  applied_event_offer_id?: string;
  order_notes?: string;
  is_on_hold?: boolean;
  created_at?: string;
  updated_at?: string;
  items?: CurrentOrderItem[];
  customer?: any;
  table?: any;
}

/**
 * CurrentOrderRepository
 * 
 * Handles all database operations for current (draft) orders in POS
 * Each cashier has isolated current orders - they only see their own
 */
export class CurrentOrderRepository {
  /**
   * Get all current orders for a specific cashier
   * Returns only orders belonging to the specified cashier
   * Uses admin client to bypass RLS
   */
  static async getByCashier(cashierId: string): Promise<CurrentOrder[]> {
    try {
      const { data, error } = (await supabaseAdmin
        .from('current_orders')
        .select(`
          *,
          customer:customers(id, full_name, customer_number, tier),
          table:restaurant_tables(id, table_number, area),
          cashier:users!current_orders_cashier_id_fkey(id, full_name, username),
          items:current_order_items(
            *,
            addons:current_order_item_addons(*)
          )
        `)
        .eq('cashier_id', cashierId)
        .order('created_at', { ascending: false })) as any;

      if (error) throw new AppError(error.message, 500);
      return (data || []) as any as CurrentOrder[];
    } catch (error) {
      console.error('Error fetching current orders:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch current orders', 500);
    }
  }

  /**
   * Get all current orders (for staff monitoring dashboard)
   * Returns all current orders across all cashiers
   */
  static async getAll(): Promise<CurrentOrder[]> {
    try {
      const { data, error } = (await supabaseAdmin
        .from('current_orders')
        .select(`
          *,
          customer:customers(id, full_name, customer_number, tier),
          table:restaurant_tables(id, table_number, area),
          cashier:users!current_orders_cashier_id_fkey(id, full_name, username),
          items:current_order_items(
            *,
            addons:current_order_item_addons(*)
          )
        `)
        .order('created_at', { ascending: false })) as any;

      if (error) throw new AppError(error.message, 500);
      return (data || []) as any as CurrentOrder[];
    } catch (error) {
      console.error('Error fetching all current orders:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch current orders', 500);
    }
  }

  /**
   * Get active (non-held) current order for a cashier
   * Most cashiers work on one order at a time
   * Uses admin client to bypass RLS
   */
  static async getActiveByCashier(cashierId: string): Promise<CurrentOrder | null> {
    try {
      const { data, error } = (await supabaseAdmin
        .from('current_orders')
        .select(`
          *,
          customer:customers(id, full_name, customer_number, tier),
          table:restaurant_tables(id, table_number, area),
          items:current_order_items(
            *,
            addons:current_order_item_addons(*)
          )
        `)
        .eq('cashier_id', cashierId)
        .eq('is_on_hold', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()) as any;

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw new AppError(error.message, 500);
      }

      return data as any as CurrentOrder;
    } catch (error) {
      console.error('Error fetching active current order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch active order', 500);
    }
  }

  /**
   * Get current order by ID
   * Validates that the order belongs to the requesting cashier
   * Uses admin client to bypass RLS
   */
  static async getById(orderId: string, cashierId: string): Promise<CurrentOrder | null> {
    try {
      const { data, error } = (await supabaseAdmin
        .from('current_orders')
        .select(`
          *,
          customer:customers(id, full_name, customer_number, tier),
          table:restaurant_tables(id, table_number, area),
          items:current_order_items(
            *,
            addons:current_order_item_addons(*)
          )
        `)
        .eq('id', orderId)
        .eq('cashier_id', cashierId)
        .single()) as any;

      if (error) {
        // No active order - this is normal
        return null;
      }

      return data as any as CurrentOrder;
    } catch (error) {
      console.error('Error fetching current order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch order', 500);
    }
  }

  /**
   * Create a new current order for a cashier
   * Uses supabaseAdmin to bypass RLS (security validated in API layer)
   */
  static async create(orderData: Partial<CurrentOrder>): Promise<CurrentOrder> {
    try {
      const { data, error } = (await supabaseAdmin
        .from('current_orders')
        .insert({
          cashier_id: orderData.cashier_id,
          customer_id: orderData.customer_id,
          table_id: orderData.table_id,
          subtotal: 0,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: 0,
          applied_event_offer_id: orderData.applied_event_offer_id,
          order_notes: orderData.order_notes,
          is_on_hold: orderData.is_on_hold || false,
        })
        .select()
        .single()) as any;

      if (error) throw new AppError(error.message, 500);
      return data as CurrentOrder;
    } catch (error) {
      console.error('Error creating current order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create order', 500);
    }
  }

  /**
   * Update current order details
   * Uses supabaseAdmin to bypass RLS (security validated via cashier_id check)
   */
  static async update(orderId: string, cashierId: string, updates: Partial<CurrentOrder>): Promise<CurrentOrder> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Only include fields that are provided
      if (updates.customer_id !== undefined) updateData.customer_id = updates.customer_id;
      if (updates.table_id !== undefined) updateData.table_id = updates.table_id;
      if (updates.order_notes !== undefined) updateData.order_notes = updates.order_notes;
      if (updates.is_on_hold !== undefined) updateData.is_on_hold = updates.is_on_hold;
      if (updates.applied_event_offer_id !== undefined) updateData.applied_event_offer_id = updates.applied_event_offer_id;
      if (updates.discount_amount !== undefined) updateData.discount_amount = updates.discount_amount;

      const { data, error } = await supabaseAdmin
        .from('current_orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('cashier_id', cashierId)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as CurrentOrder;
    } catch (error) {
      console.error('Error updating current order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update order', 500);
    }
  }

  /**
   * Delete a current order (cancel draft)
   * Cascade will automatically delete items and addons
   * Uses supabaseAdmin to bypass RLS (security validated via cashier_id check)
   */
  static async delete(orderId: string, cashierId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('current_orders')
        .delete()
        .eq('id', orderId)
        .eq('cashier_id', cashierId);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error deleting current order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to delete order', 500);
    }
  }

  /**
   * Add item to current order
   * Automatically triggers total recalculation via database trigger
   * Uses supabaseAdmin to bypass RLS (security validated via order ownership check)
   */
  static async addItem(orderId: string, cashierId: string, item: CurrentOrderItem): Promise<CurrentOrderItem> {
    try {
      // Verify order belongs to cashier using admin client
      const { data: order, error: orderError } = await supabaseAdmin
        .from('current_orders')
        .select('id, cashier_id')
        .eq('id', orderId)
        .eq('cashier_id', cashierId)
        .single();
      
      if (orderError || !order) throw new AppError('Order not found or access denied', 404);

      const { data, error } = await supabaseAdmin
        .from('current_order_items')
        .insert({
          current_order_id: orderId,
          product_id: item.product_id,
          package_id: item.package_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          discount_amount: item.discount_amount || 0,
          total: item.total,
          is_vip_price: item.is_vip_price || false,
          is_complimentary: item.is_complimentary || false,
          notes: item.notes,
        })
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);

      // Add addons if provided
      if (item.addons && item.addons.length > 0 && data.id) {
        await this.addItemAddons(data.id, item.addons);
      }

      return data as CurrentOrderItem;
    } catch (error) {
      console.error('Error adding item to current order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to add item', 500);
    }
  }

  /**
   * Update item in current order
   * Uses supabaseAdmin to bypass RLS (security validated via order ownership check)
   */
  static async updateItem(
    itemId: string,
    orderId: string,
    cashierId: string,
    updates: Partial<CurrentOrderItem>
  ): Promise<CurrentOrderItem> {
    try {
      // Verify order belongs to cashier using admin client
      const { data: order, error: orderError } = await supabaseAdmin
        .from('current_orders')
        .select('id, cashier_id')
        .eq('id', orderId)
        .eq('cashier_id', cashierId)
        .single();
      
      if (orderError || !order) throw new AppError('Order not found or access denied', 404);

      const { data, error } = await supabaseAdmin
        .from('current_order_items')
        .update({
          quantity: updates.quantity,
          unit_price: updates.unit_price,
          subtotal: updates.subtotal,
          discount_amount: updates.discount_amount,
          total: updates.total,
          notes: updates.notes,
          is_vip_price: updates.is_vip_price,
          is_complimentary: updates.is_complimentary,
        })
        .eq('id', itemId)
        .eq('current_order_id', orderId)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as CurrentOrderItem;
    } catch (error) {
      console.error('Error updating current order item:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update item', 500);
    }
  }

  /**
   * Remove item from current order
   * Automatically triggers total recalculation via database trigger
   * Uses supabaseAdmin to bypass RLS (security validated via order ownership check)
   */
  static async removeItem(itemId: string, orderId: string, cashierId: string): Promise<void> {
    try {
      // Verify order belongs to cashier using admin client
      const { data: order, error: orderError } = await supabaseAdmin
        .from('current_orders')
        .select('id, cashier_id')
        .eq('id', orderId)
        .eq('cashier_id', cashierId)
        .single();
      
      if (orderError || !order) throw new AppError('Order not found or access denied', 404);

      const { error } = await supabaseAdmin
        .from('current_order_items')
        .delete()
        .eq('id', itemId)
        .eq('current_order_id', orderId);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error removing item from current order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to remove item', 500);
    }
  }

  /**
   * Add addons to an order item
   * Uses supabaseAdmin to bypass RLS
   */
  static async addItemAddons(itemId: string, addons: CurrentOrderItemAddon[]): Promise<void> {
    try {
      const addonData = addons.map(addon => ({
        current_order_item_id: itemId,
        addon_id: addon.addon_id,
        addon_name: addon.addon_name,
        addon_price: addon.addon_price,
        quantity: addon.quantity,
      }));

      const { error } = await supabaseAdmin
        .from('current_order_item_addons')
        .insert(addonData);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error adding item addons:', error);
      throw error instanceof AppError ? error : new AppError('Failed to add addons', 500);
    }
  }

  /**
   * Hold current order (pause to work on another order)
   */
  static async holdOrder(orderId: string, cashierId: string): Promise<CurrentOrder> {
    try {
      return await this.update(orderId, cashierId, { is_on_hold: true });
    } catch (error) {
      console.error('Error holding current order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to hold order', 500);
    }
  }

  /**
   * Resume held order (make it active again)
   */
  static async resumeOrder(orderId: string, cashierId: string): Promise<CurrentOrder> {
    try {
      return await this.update(orderId, cashierId, { is_on_hold: false });
    } catch (error) {
      console.error('Error resuming current order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to resume order', 500);
    }
  }

  /**
   * Clear all items from current order
   * Uses supabaseAdmin to bypass RLS (security validated via order ownership check)
   */
  static async clearItems(orderId: string, cashierId: string): Promise<void> {
    try {
      // Verify order belongs to cashier using admin client
      const { data: order, error: orderError } = await supabaseAdmin
        .from('current_orders')
        .select('id, cashier_id')
        .eq('id', orderId)
        .eq('cashier_id', cashierId)
        .single();
      
      if (orderError || !order) throw new AppError('Order not found or access denied', 404);

      const { error } = await supabaseAdmin
        .from('current_order_items')
        .delete()
        .eq('current_order_id', orderId);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error clearing current order items:', error);
      throw error instanceof AppError ? error : new AppError('Failed to clear items', 500);
    }
  }

  /**
   * Clear all current orders for a specific cashier
   * Deletes all draft orders belonging to the specified cashier
   * Uses supabaseAdmin to bypass RLS (security validated via cashier_id match)
   * 
   * @param {string} cashierId - The ID of the cashier whose orders to clear
   * @returns {Promise<number>} Number of orders deleted
   * 
   * @example
   * const deletedCount = await CurrentOrderRepository.clearAllByCashier('cashier-123');
   */
  static async clearAllByCashier(cashierId: string): Promise<number> {
    try {
      // First get count of orders to be deleted
      const { data: orders, error: countError } = await supabaseAdmin
        .from('current_orders')
        .select('id')
        .eq('cashier_id', cashierId);
      
      if (countError) throw new AppError(countError.message, 500);
      
      const orderCount = orders?.length || 0;
      
      if (orderCount === 0) {
        return 0; // No orders to delete
      }

      // Delete all current orders for this cashier
      // Cascade delete will automatically remove all items and addons
      const { error } = await supabaseAdmin
        .from('current_orders')
        .delete()
        .eq('cashier_id', cashierId);

      if (error) throw new AppError(error.message, 500);
      
      return orderCount;
    } catch (error) {
      console.error('Error clearing all current orders for cashier:', error);
      throw error instanceof AppError ? error : new AppError('Failed to clear all orders', 500);
    }
  }
}
