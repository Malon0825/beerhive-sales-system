// @ts-nocheck - Supabase type inference issues
import { supabase } from '../supabase/client';
import { supabaseAdmin } from '../supabase/server-client';
import { KitchenOrder, CreateKitchenOrderInput, UpdateKitchenOrderStatusInput } from '@/models/entities/KitchenOrder';
import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { AppError } from '@/lib/errors/AppError';

/**
 * KitchenOrderRepository
 * Handles all database operations for kitchen orders
 * Uses supabaseAdmin for write operations to bypass RLS policies
 */
export class KitchenOrderRepository {
  /**
   * Create new kitchen order
   * Uses admin client to bypass RLS policies
   */
  static async create(input: CreateKitchenOrderInput): Promise<KitchenOrder> {
    try {
      const { data, error } = await supabaseAdmin
        .from('kitchen_orders')
        .insert({
          order_id: input.order_id,
          order_item_id: input.order_item_id,
          product_name: input.product_name || null,
          destination: input.destination,
          special_instructions: input.special_instructions || null,
          is_urgent: input.is_urgent || false,
          status: KitchenOrderStatus.PENDING,
          sent_at: new Date().toISOString(),
          priority_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);

      return data as KitchenOrder;
    } catch (error) {
      console.error('Error creating kitchen order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create kitchen order', 500);
    }
  }

  /**
   * Create multiple kitchen orders
   * Uses admin client to bypass RLS policies
   */
  static async createBatch(inputs: CreateKitchenOrderInput[]): Promise<KitchenOrder[]> {
    try {
      const insertData = inputs.map(input => ({
        order_id: input.order_id,
        order_item_id: input.order_item_id,
        product_name: input.product_name || null,
        destination: input.destination,
        special_instructions: input.special_instructions || null,
        is_urgent: input.is_urgent || false,
        status: KitchenOrderStatus.PENDING,
        sent_at: new Date().toISOString(),
        priority_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      console.log(`📥 [KitchenOrderRepository.createBatch] Inserting ${insertData.length} kitchen orders...`);
      
      const { data, error } = await supabaseAdmin
        .from('kitchen_orders')
        .insert(insertData)
        .select();

      if (error) {
        console.error('❌ [KitchenOrderRepository.createBatch] Database error:', error);
        throw new AppError(error.message, 500);
      }

      console.log(`✅ [KitchenOrderRepository.createBatch] Successfully created ${data?.length || 0} kitchen orders`);

      return data as KitchenOrder[];
    } catch (error) {
      console.error('Error creating batch kitchen orders:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create kitchen orders', 500);
    }
  }

  /**
   * Get kitchen orders by destination
   * Uses admin client to bypass RLS policies
   */
  static async getByDestination(destination: 'kitchen' | 'bartender' | 'both'): Promise<any[]> {
    try {
      console.log(`🔍 [KitchenOrderRepository.getByDestination] Querying for destination: ${destination}`);
      
      const { data, error } = await supabaseAdmin
        .from('kitchen_orders')
        .select(`
          *,
          order:orders(
            id,
            order_number,
            table:restaurant_tables(table_number, area)
          ),
          order_item:order_items(
            id,
            item_name,
            quantity,
            notes
          )
        `)
        .or(`destination.eq.${destination},destination.eq.both`)
        .neq('status', KitchenOrderStatus.SERVED)
        .order('priority_order', { ascending: false })
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('❌ [KitchenOrderRepository.getByDestination] Query error:', error);
        throw new AppError(error.message, 500);
      }

      console.log(`✅ [KitchenOrderRepository.getByDestination] Found ${data?.length || 0} kitchen orders`);

      return data;
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch kitchen orders', 500);
    }
  }

  /**
   * Get active kitchen orders (pending, preparing, and cancelled)
   * Excludes READY and SERVED orders (ready orders disappear once marked)
   * Uses admin client to bypass RLS policies
   */
  static async getActive(destination?: 'kitchen' | 'bartender'): Promise<any[]> {
    try {
      let query = supabaseAdmin
        .from('kitchen_orders')
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer:customers(full_name),
            table:restaurant_tables(table_number, area)
          ),
          order_item:order_items(
            id,
            item_name,
            quantity,
            notes
          )
        `)
        .in('status', [
          KitchenOrderStatus.PENDING, 
          KitchenOrderStatus.PREPARING, 
          KitchenOrderStatus.CANCELLED
        ]);

      if (destination) {
        query = query.or(`destination.eq.${destination},destination.eq.both`);
      }

      const { data, error } = await query
        .order('is_urgent', { ascending: false })
        .order('priority_order', { ascending: false })
        .order('sent_at', { ascending: true });

      if (error) throw new AppError(error.message, 500);

      return data;
    } catch (error) {
      console.error('Error fetching active kitchen orders:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch active orders', 500);
    }
  }

  /**
   * Get ready kitchen orders (for waiter delivery)
   * Returns only orders with status 'ready'
   * Uses admin client to bypass RLS policies
   */
  static async getReadyOrders(): Promise<any[]> {
    try {
      console.log(`🔍 [KitchenOrderRepository.getReadyOrders] Querying for ready orders...`);
      
      const { data, error } = await supabaseAdmin
        .from('kitchen_orders')
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer:customers(full_name),
            table:restaurant_tables(table_number, area)
          ),
          order_item:order_items(
            id,
            item_name,
            quantity,
            notes
          )
        `)
        .eq('status', KitchenOrderStatus.READY)
        .order('ready_at', { ascending: true }) // Oldest ready first
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('❌ [KitchenOrderRepository.getReadyOrders] Query error:', error);
        throw new AppError(error.message, 500);
      }

      console.log(`✅ [KitchenOrderRepository.getReadyOrders] Found ${data?.length || 0} ready orders`);

      return data;
    } catch (error) {
      console.error('Error fetching ready kitchen orders:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch ready orders', 500);
    }
  }

  /**
   * Get kitchen order by ID
   * Uses admin client to bypass RLS policies
   */
  static async getById(id: string): Promise<any | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('kitchen_orders')
        .select(`
          *,
          order:orders(
            id,
            order_number,
            customer:customers(full_name),
            table:restaurant_tables(table_number, area)
          ),
          order_item:order_items(
            id,
            item_name,
            quantity,
            notes
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new AppError(error.message, 500);
      }

      return data;
    } catch (error) {
      console.error('Error fetching kitchen order:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch kitchen order', 500);
    }
  }

  /**
   * Update kitchen order status
   * Uses admin client to bypass RLS policies
   */
  static async updateStatus(
    id: string,
    statusUpdate: UpdateKitchenOrderStatusInput,
    assignedTo?: string
  ): Promise<KitchenOrder> {
    try {
      const updateData: any = {
        status: statusUpdate.status,
        updated_at: new Date().toISOString(),
      };

      // Set timestamps based on status
      if (statusUpdate.status === KitchenOrderStatus.PREPARING) {
        updateData.started_at = new Date().toISOString();
        if (assignedTo) {
          updateData.assigned_to = assignedTo;
        }
      } else if (statusUpdate.status === KitchenOrderStatus.READY) {
        updateData.ready_at = new Date().toISOString();
      } else if (statusUpdate.status === KitchenOrderStatus.SERVED) {
        updateData.served_at = new Date().toISOString();
      }

      if (statusUpdate.preparation_notes) {
        updateData.preparation_notes = statusUpdate.preparation_notes;
      }

      const { data, error } = await supabaseAdmin
        .from('kitchen_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);

      return data as KitchenOrder;
    } catch (error) {
      console.error('Error updating kitchen order status:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update status', 500);
    }
  }

  /**
   * Mark kitchen order as preparing
   */
  static async markPreparing(id: string, assignedTo?: string): Promise<KitchenOrder> {
    return this.updateStatus(
      id,
      { status: KitchenOrderStatus.PREPARING },
      assignedTo
    );
  }

  /**
   * Mark kitchen order as ready
   */
  static async markReady(id: string, notes?: string): Promise<KitchenOrder> {
    return this.updateStatus(id, {
      status: KitchenOrderStatus.READY,
      preparation_notes: notes,
    });
  }

  /**
   * Mark kitchen order as served
   */
  static async markServed(id: string): Promise<KitchenOrder> {
    return this.updateStatus(id, { status: KitchenOrderStatus.SERVED });
  }

  /**
   * Get kitchen orders by order ID
   * Uses admin client to bypass RLS policies
   */
  static async getByOrderId(orderId: string): Promise<KitchenOrder[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('kitchen_orders')
        .select('*')
        .eq('order_id', orderId)
        .order('sent_at', { ascending: true });

      if (error) throw new AppError(error.message, 500);

      return data as KitchenOrder[];
    } catch (error) {
      console.error('Error fetching kitchen orders by order ID:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch kitchen orders', 500);
    }
  }

  /**
   * Update priority
   * Uses admin client to bypass RLS policies
   */
  static async updatePriority(id: string, priority: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('kitchen_orders')
        .update({ priority_order: priority, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error updating priority:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update priority', 500);
    }
  }
}
