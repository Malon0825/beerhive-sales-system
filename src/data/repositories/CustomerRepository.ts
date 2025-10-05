import { supabase } from '../supabase/client';
import { supabaseAdmin } from '../supabase/server-client';
import { Customer } from '@/models/entities/Customer';
import { CustomerTier } from '@/models/enums/CustomerTier';
import { AppError } from '@/lib/errors/AppError';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/models/database.types';

/**
 * CustomerRepository
 * Handles all database operations for customers
 */
export class CustomerRepository {
  /**
   * Search customers by name, phone, or customer number
   * Uses admin client to bypass RLS policies for POS operations
   * @param query - Search query string
   * @param client - Optional Supabase client instance (defaults to admin for server-side)
   */
  static async search(query: string, client?: SupabaseClient<Database>): Promise<Customer[]> {
    try {
      const searchTerm = `%${query}%`;
      // Use admin client by default to bypass RLS issues
      const db = client || supabaseAdmin;
      
      const { data, error } = await db
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .or(`full_name.ilike.${searchTerm},phone.ilike.${searchTerm},customer_number.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .order('full_name', { ascending: true })
        .limit(50);

      if (error) throw new AppError(error.message, 500);
      return data as Customer[];
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error instanceof AppError ? error : new AppError('Failed to search customers', 500);
    }
  }

  /**
   * Get customer by ID
   * @param id - Customer ID
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getById(id: string, client?: SupabaseClient<Database>): Promise<Customer | null> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new AppError(error.message, 500);
      }

      return data as Customer;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch customer', 500);
    }
  }

  /**
   * Get customer by phone number
   * @param phone - Customer phone number
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getByPhone(phone: string, client?: SupabaseClient<Database>): Promise<Customer | null> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new AppError(error.message, 500);
      }

      return data as Customer;
    } catch (error) {
      console.error('Error fetching customer by phone:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch customer', 500);
    }
  }

  /**
   * Create new customer
   * @param customer - Customer data to create
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async create(customer: Partial<Customer>, client?: SupabaseClient<Database>): Promise<Customer> {
    try {
      // Validate required fields
      if (!customer.full_name) {
        throw new AppError('Customer name is required', 400);
      }

      // Generate customer number
      const customerNumber = await this.generateCustomerNumber(client);

      const db = client || supabase;
      const { data, error } = await db
        .from('customers')
        .insert({
          full_name: customer.full_name,
          customer_number: customerNumber,
          phone: customer.phone || null,
          email: customer.email || null,
          birth_date: customer.birth_date || null,
          anniversary_date: customer.anniversary_date || null,
          tier: customer.tier || CustomerTier.REGULAR,
          notes: customer.notes || null,
          is_active: customer.is_active ?? true,
          loyalty_points: 0,
          total_spent: 0,
          visit_count: 0,
        } as any)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create customer', 500);
    }
  }

  /**
   * Update customer
   * @param id - Customer ID to update
   * @param updates - Customer fields to update
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async update(id: string, updates: Partial<Customer>, client?: SupabaseClient<Database>): Promise<Customer> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('customers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Customer;
    } catch (error) {
      throw error instanceof AppError ? error : new AppError('Failed to update customer', 500);
    }
  }

  /**
   * Update customer visit info and total spent
   * Uses admin client to bypass RLS policies
   */
  static async updateVisitInfo(id: string, orderTotal: number): Promise<void> {
    try {
      const customer = await this.getById(id, supabaseAdmin);
      if (!customer) throw new AppError('Customer not found', 404);

      // Use admin client to bypass RLS issues
      const { error } = await supabaseAdmin
        .from('customers')
        .update({
          total_spent: (customer.total_spent || 0) + orderTotal,
          visit_count: (customer.visit_count || 0) + 1,
          last_visit_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error updating customer visit info:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update customer', 500);
    }
  }

  /**
   * Check for active event offers (birthday/anniversary)
   * Uses admin client to bypass RLS policies
   */
  static async checkEventOffers(customerId: string): Promise<any[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Use admin client to bypass RLS issues
      const { data, error } = await supabaseAdmin
        .from('customer_events')
        .select('*')
        .eq('customer_id', customerId)
        .eq('event_date', today)
        .eq('is_redeemed', false);

      if (error) throw new AppError(error.message, 500);
      return data || [];
    } catch (error) {
      console.error('Error checking event offers:', error);
      throw error instanceof AppError ? error : new AppError('Failed to check offers', 500);
    }
  }

  /**
   * Get all customers (paginated)
{{ ... }}
   * @param offset - Number of customers to skip
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getAll(limit: number = 100, offset: number = 0, client?: SupabaseClient<Database>): Promise<Customer[]> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw new AppError(error.message, 500);
      return data as Customer[];
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch customers', 500);
    }
  }

  /**
   * Get VIP customers
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  static async getVIPCustomers(client?: SupabaseClient<Database>): Promise<Customer[]> {
    try {
      const db = client || supabase;
      const { data, error } = await db
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .in('tier', ['vip_silver', 'vip_gold', 'vip_platinum'])
        .order('tier', { ascending: false })
        .order('total_spent', { ascending: false });

      if (error) throw new AppError(error.message, 500);
      return data as Customer[];
    } catch (error) {
      console.error('Error fetching VIP customers:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch VIP customers', 500);
    }
  }

  /**
   * Generate unique customer number
   * @param client - Optional Supabase client instance (for server-side usage)
   */
  private static async generateCustomerNumber(client?: SupabaseClient<Database>): Promise<string> {
    try {
      const prefix = 'CUST';
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');

      // Get count of customers created this month
      const db = client || supabase;
      const { count } = await db
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${date.getFullYear()}-${month}-01`)
        .lt('created_at', `${date.getFullYear()}-${parseInt(month) + 1}-01`);

      const sequence = ((count || 0) + 1).toString().padStart(4, '0');
      return `${prefix}${year}${month}${sequence}`;
    } catch (error) {
      console.error('Error generating customer number:', error);
      // Fallback to timestamp-based number
      return `CUST${Date.now()}`;
    }
  }
}
