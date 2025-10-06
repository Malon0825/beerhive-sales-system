// @ts-nocheck - Supabase type inference issues
import { supabase } from '../supabase/client';
import { supabaseAdmin } from '../supabase/server-client';
import { Order } from '@/models/entities/Order';
import { OrderStatus } from '@/models/enums/OrderStatus';
import { AppError } from '@/lib/errors/AppError';

/**
 * OrderRepository
 * Handles all database operations for orders
 */
export class OrderRepository {
  /**
   * Create new order with items
   * Uses admin client to bypass RLS policies for order creation
   */
  static async create(orderData: any, orderItems: any[]): Promise<Order> {
    try {
      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Use admin client to bypass RLS issues
      // Create order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          ...orderData,
          order_number: orderNumber,
          status: OrderStatus.PENDING,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) throw new AppError(orderError.message, 500);

      // Create order items
      const itemsWithOrderId = orderItems.map(item => ({
        ...item,
        order_id: order.id,
        created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(itemsWithOrderId);

      if (itemsError) {
        // Rollback order creation
        await supabaseAdmin.from('orders').delete().eq('id', order.id);
        throw new AppError(itemsError.message, 500);
      }

      return order as Order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create order', 500);
    }
  }

  /**
   * Get order by ID with items
   * Uses admin client to bypass RLS policies when joining with users table
   */
  static async getById(id: string): Promise<any | null> {
    try {
      // Use admin client to bypass RLS issues with users table join
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          cashier:users!orders_cashier_id_fkey(id, username, full_name),
          table:restaurant_tables(*),
          order_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new AppError(error.message, 500);
      }

      return data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch order', 500);
    }
  }

  /**
   * Get active orders
   * Uses admin client to bypass RLS policies when joining with users table
   */
  static async getActive(): Promise<any[]> {
    try {
      // Use admin client to bypass RLS issues with users table join
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          customer:customers(id, full_name, customer_number, tier),
          cashier:users!orders_cashier_id_fkey(id, username, full_name),
          table:restaurant_tables(id, table_number, area),
          order_items(*)
        `)
        .in('status', [OrderStatus.PENDING, OrderStatus.ON_HOLD])
        .order('created_at', { ascending: false });

      if (error) throw new AppError(error.message, 500);
      return data || [];
    } catch (error) {
      console.error('Error fetching active orders:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch active orders', 500);
    }
  }

  /**
   * Update order status
   * Automatically releases table only when order is voided.
   * IMPORTANT: Do NOT auto-release on COMPLETED; FOH will release manually via Tables UI.
   * Uses admin client to bypass RLS policies
   */
  static async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === OrderStatus.COMPLETED) {
        updates.completed_at = new Date().toISOString();
      }

      // Use admin client to bypass RLS issues
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      
      // Auto-release table only when order is voided.
      // For COMPLETED orders, keep the table occupied until staff explicitly releases it.
      if (status === OrderStatus.VOIDED && data.table_id) {
        try {
          const { TableRepository } = await import('./TableRepository');
          await TableRepository.releaseTable(data.table_id);
          console.log(`✅ Table ${data.table_id} released (order voided)`);
        } catch (tableError) {
          // Log error but don't fail the status update
          console.error('⚠️ Failed to release table (non-fatal):', tableError);
        }
      }
      
      return data as Order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update order', 500);
    }
  }

  /**
   * Update order
   * Uses admin client to bypass RLS policies
   */
  static async update(id: string, updates: Partial<Order>): Promise<Order> {
    try {
      // Use admin client to bypass RLS issues
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Order;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update order', 500);
    }
  }

  /**
   * Void order
   */
  static async void(id: string, voidedBy: string, reason: string): Promise<Order> {
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({
          status: OrderStatus.VOIDED,
          voided_by: voidedBy,
          voided_reason: reason,
          voided_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Order;
    } catch (error) {
      console.error('Error voiding order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to void order', 500);
    }
  }

  /**
   * Get orders by date range
   * Uses admin client to bypass RLS policies
   */
  static async getByDateRange(startDate: string, endDate: string): Promise<Order[]> {
    try {
      // Use admin client to bypass RLS issues
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw new AppError(error.message, 500);
      return data as Order[];
    } catch (error) {
      console.error('Error fetching orders by date:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch orders', 500);
    }
  }

  /**
   * Get orders by customer
   * Uses admin client to bypass RLS policies
   * Includes order items and table information
   */
  static async getByCustomer(customerId: string, limit: number = 50): Promise<any[]> {
    try {
      // Use admin client to bypass RLS issues
      const { data, error } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items(*),
          table:restaurant_tables(id, table_number, area)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new AppError(error.message, 500);
      return data || [];
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch orders', 500);
    }
  }

  /**
   * Get all orders with full details for order board display
   * Uses admin client to bypass RLS policies
   * Includes customer, table, and order items information
   */
  static async getAllWithDetails(options?: {
    status?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = supabaseAdmin
        .from('orders')
        .select(`
          *,
          customer:customers(id, full_name, customer_number, tier),
          table:restaurant_tables(id, table_number, area),
          order_items(
            id,
            item_name,
            quantity,
            unit_price,
            total,
            notes
          )
        `)
        .order('created_at', { ascending: false });

      // Apply status filter if provided
      if (options?.status) {
        query = query.eq('status', options.status as OrderStatus);
      }

      // Apply limit if provided
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw new AppError(error.message, 500);
      return data || [];
    } catch (error) {
      console.error('Error fetching all orders with details:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch orders', 500);
    }
  }

  /**
   * Generate unique order number with retry logic to prevent duplicates
   * Format: ORD + YYMMDD + sequence (4 digits) + milliseconds (3 digits)
   * Example: ORD250106-0001-234
   */
  private static async generateOrderNumber(): Promise<string> {
    const maxRetries = 10;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const now = new Date();
        const prefix = 'ORD';
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const datePart = `${year}${month}${day}`;

        // Get count of orders created today
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

        // Use admin client to bypass RLS issues
        const { count } = await supabaseAdmin
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay)
          .lt('created_at', endOfDay);

        // Add milliseconds for additional uniqueness
        const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
        const sequence = ((count || 0) + 1 + attempt).toString().padStart(4, '0');
        
        // Format: ORD250106-0001-234
        const orderNumber = `${prefix}${datePart}-${sequence}-${milliseconds}`;

        // Verify uniqueness before returning
        const { data: existing } = await supabaseAdmin
          .from('orders')
          .select('order_number')
          .eq('order_number', orderNumber)
          .single();

        if (!existing) {
          console.log(`✅ [OrderRepository] Generated unique order number: ${orderNumber}`);
          return orderNumber;
        }

        // If duplicate found, retry with increased sequence
        console.warn(`⚠️ [OrderRepository] Order number ${orderNumber} already exists, retrying...`);
        
        // Add small delay to reduce race condition probability
        await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)));
        
      } catch (error: any) {
        // If the error is "no rows found" (PGRST116), it means the number is unique
        if (error?.code === 'PGRST116') {
          // This means the order number doesn't exist yet - it's unique!
          const now = new Date();
          const year = now.getFullYear().toString().slice(-2);
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const day = now.getDate().toString().padStart(2, '0');
          const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
          
          const { count } = await supabaseAdmin
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString())
            .lt('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString());
          
          const sequence = ((count || 0) + 1 + attempt).toString().padStart(4, '0');
          return `${prefix}${year}${month}${day}-${sequence}-${milliseconds}`;
        }
        
        console.error(`❌ [OrderRepository] Error generating order number (attempt ${attempt + 1}):`, error);
      }
    }

    // Fallback: Use timestamp for guaranteed uniqueness
    const timestamp = Date.now();
    const fallbackNumber = `ORD${timestamp}`;
    console.error(`❌ [OrderRepository] Failed to generate order number after ${maxRetries} attempts, using fallback: ${fallbackNumber}`);
    return fallbackNumber;
  }
}
