// @ts-nocheck - Supabase type inference issues
import { supabase } from '../supabase/client';
import { supabaseAdmin } from '../supabase/server-client';
import { Table } from '@/models/entities/Table';
import { TableStatus } from '@/models/enums/TableStatus';
import { AppError } from '@/lib/errors/AppError';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/models/database.types';

/**
 * TableRepository
 * Handles all database operations for restaurant tables
 */
export class TableRepository {
  /**
   * Get all tables
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getAll(client?: SupabaseClient<Database>): Promise<Table[]> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('restaurant_tables')
        .select('*')
        .eq('is_active', true)
        .order('table_number', { ascending: true });

      if (error) throw new AppError(error.message, 500);
      return data as Table[];
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch tables', 500);
    }
  }

  /**
   * Get table by ID
   * @param id - Table ID
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getById(id: string, client?: SupabaseClient<Database>): Promise<Table | null> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('restaurant_tables')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new AppError(error.message, 500);
      }

      return data as Table;
    } catch (error) {
      console.error('Error fetching table:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch table', 500);
    }
  }

  /**
   * Get table by table number
   * @param tableNumber - Table number
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getByTableNumber(tableNumber: string, client?: SupabaseClient<Database>): Promise<Table | null> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('restaurant_tables')
        .select('*')
        .eq('table_number', tableNumber)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new AppError(error.message, 500);
      }

      return data as Table;
    } catch (error) {
      console.error('Error fetching table by number:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch table', 500);
    }
  }

  /**
   * Get tables by status
   * @param status - Table status
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getByStatus(status: TableStatus, client?: SupabaseClient<Database>): Promise<Table[]> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('restaurant_tables')
        .select('*')
        .eq('status', status)
        .eq('is_active', true)
        .order('table_number', { ascending: true });

      if (error) throw new AppError(error.message, 500);
      return data as Table[];
    } catch (error) {
      console.error('Error fetching tables by status:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch tables', 500);
    }
  }

  /**
   * Get tables by area
   * @param area - Table area
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getByArea(area: string, client?: SupabaseClient<Database>): Promise<Table[]> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('restaurant_tables')
        .select('*')
        .eq('area', area)
        .eq('is_active', true)
        .order('table_number', { ascending: true });

      if (error) throw new AppError(error.message, 500);
      return data as Table[];
    } catch (error) {
      console.error('Error fetching tables by area:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch tables', 500);
    }
  }

  /**
   * Update table status
   * @param id - Table ID
   * @param status - New table status
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async updateStatus(id: string, status: TableStatus, client?: SupabaseClient<Database>): Promise<Table> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('restaurant_tables')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Table;
    } catch (error) {
      console.error('Error updating table status:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update table status', 500);
    }
  }

  /**
   * Assign order to table
   * Marks table as OCCUPIED and links it to the order
   * Uses admin client to bypass RLS policies
   */
  static async assignOrder(id: string, orderId: string): Promise<Table> {
    try {
      console.log(`🔍 [TableRepository.assignOrder] Updating table ${id} with order ${orderId}`);
      
      // Use admin client to bypass RLS issues
      const { data, error } = await supabaseAdmin
        .from('restaurant_tables')
        .update({ 
          current_order_id: orderId,
          status: TableStatus.OCCUPIED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`❌ [TableRepository.assignOrder] Database error:`, error);
        throw new AppError(error.message, 500);
      }
      
      console.log(`✅ [TableRepository.assignOrder] Successfully updated table:`, {
        id: data.id,
        table_number: data.table_number,
        status: data.status,
        current_order_id: data.current_order_id
      });
      
      return data as Table;
    } catch (error) {
      console.error(`❌ [TableRepository.assignOrder] Failed to assign order:`, error);
      throw error instanceof AppError ? error : new AppError('Failed to assign order', 500);
    }
  }

  /**
   * Release table (set status to available)
   * Uses admin client to bypass RLS policies
   */
  static async releaseTable(id: string): Promise<Table> {
    try {
      // Use admin client to bypass RLS issues
      const { data, error } = await supabaseAdmin
        .from('restaurant_tables')
        .update({ 
          current_order_id: null,
          status: TableStatus.AVAILABLE,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Table;
    } catch (error) {
      console.error('Error releasing table:', error);
      throw error instanceof AppError ? error : new AppError('Failed to release table', 500);
    }
  }

  /**
   * Create new table (admin/manager only)
   * @param table - Table data (table_number and capacity are required)
   */
  static async create(table: Partial<Table> & { table_number: string; capacity: number }): Promise<Table> {
    try {
      const { data, error } = await supabaseAdmin
        .from('restaurant_tables')
        .insert({
          table_number: table.table_number,
          capacity: table.capacity,
          area: table.area || null,
          status: table.status || TableStatus.AVAILABLE,
          is_active: table.is_active !== undefined ? table.is_active : true,
          notes: table.notes || null,
          current_order_id: table.current_order_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Table;
    } catch (error) {
      console.error('Error creating table:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create table', 500);
    }
  }

  /**
   * Update table
   */
  static async update(id: string, updates: Partial<Table>): Promise<Table> {
    try {
      const { data, error } = await supabaseAdmin
        .from('restaurant_tables')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Table;
    } catch (error) {
      console.error('Error updating table:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update table', 500);
    }
  }

  /**
   * Get available tables count
   */
  static async getAvailableCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('restaurant_tables')
        .select('*', { count: 'exact', head: true })
        .eq('status', TableStatus.AVAILABLE)
        .eq('is_active', true);

      if (error) throw new AppError(error.message, 500);
      return count || 0;
    } catch (error) {
      console.error('Error getting available tables count:', error);
      return 0;
    }
  }

  /**
   * Deactivate a table
   * Sets is_active to false and ensures table is available before deactivation
   * @param id - Table ID
   * @param client - Optional Supabase client instance (for server-side usage)
   * @returns Updated table
   */
  static async deactivate(id: string, client?: SupabaseClient<Database>): Promise<Table> {
    try {
      const db = client || supabaseAdmin;
      
      // First, check if table is occupied or has active order
      const table = await TableRepository.getById(id, db);
      if (!table) {
        throw new AppError('Table not found', 404);
      }

      if (table.status === TableStatus.OCCUPIED || table.current_order_id) {
        throw new AppError('Cannot deactivate table with active order', 400);
      }

      // Deactivate the table
      const { data, error } = await db
        .from('restaurant_tables')
        .update({ 
          is_active: false,
          status: TableStatus.AVAILABLE, // Reset to available when deactivating
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Table;
    } catch (error) {
      console.error('Error deactivating table:', error);
      throw error instanceof AppError ? error : new AppError('Failed to deactivate table', 500);
    }
  }

  /**
   * Reactivate a table
   * Sets is_active to true and status to available
   * @param id - Table ID
   * @param client - Optional Supabase client instance (for server-side usage)
   * @returns Updated table
   */
  static async reactivate(id: string, client?: SupabaseClient<Database>): Promise<Table> {
    try {
      const db = client || supabaseAdmin;
      
      const { data, error } = await db
        .from('restaurant_tables')
        .update({ 
          is_active: true,
          status: TableStatus.AVAILABLE,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Table;
    } catch (error) {
      console.error('Error reactivating table:', error);
      throw error instanceof AppError ? error : new AppError('Failed to reactivate table', 500);
    }
  }

  /**
   * Get all inactive tables
   * @param client - Optional Supabase client instance (for server-side usage)
   * @returns Array of inactive tables
   */
  static async getInactive(client?: SupabaseClient<Database>): Promise<Table[]> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('restaurant_tables')
        .select('*')
        .eq('is_active', false)
        .order('table_number', { ascending: true });

      if (error) throw new AppError(error.message, 500);
      return data as Table[];
    } catch (error) {
      console.error('Error fetching inactive tables:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch inactive tables', 500);
    }
  }

  /**
   * Get all tables including inactive ones (admin only)
   * @param client - Optional Supabase client instance (for server-side usage)
   * @returns Array of all tables
   */
  static async getAllIncludingInactive(client?: SupabaseClient<Database>): Promise<Table[]> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('restaurant_tables')
        .select('*')
        .order('is_active', { ascending: false })
        .order('table_number', { ascending: true });

      if (error) throw new AppError(error.message, 500);
      return data as Table[];
    } catch (error) {
      console.error('Error fetching all tables:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch all tables', 500);
    }
  }
}
