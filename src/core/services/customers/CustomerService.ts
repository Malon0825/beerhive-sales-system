import { CustomerRepository } from '@/data/repositories/CustomerRepository';
import { Customer } from '@/models/entities/Customer';
import { CustomerTier } from '@/models/enums/CustomerTier';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/models/database.types';

/**
 * CustomerService
 * Business logic for customer management
 */
export class CustomerService {
  /**
   * Quick registration for walk-in customers
   * @param name - Customer full name
   * @param phone - Customer phone number
   * @param client - Optional Supabase client (defaults to admin for server-side)
   */
  static async quickRegister(name: string, phone: string, client?: SupabaseClient<Database>): Promise<Customer> {
    try {
      // Use admin client by default for server-side operations
      const db = client || supabaseAdmin;
      
      // Check if customer exists
      const existing = await CustomerRepository.getByPhone(phone, db);
      if (existing) {
        return existing;
      }

      // Create new customer with minimal info
      const customer = await CustomerRepository.create({
        full_name: name,
        phone,
        tier: CustomerTier.REGULAR,
        is_active: true,
      }, db);

      return customer;
    } catch (error) {
      console.error('Quick register error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to register customer', 500);
    }
  }

  /**
   * Full customer registration with all details
   * @param customerData - Customer data to register
   * @param client - Optional Supabase client (defaults to admin for server-side)
   */
  static async register(customerData: Partial<Customer>, client?: SupabaseClient<Database>): Promise<Customer> {
    try {
      // Use admin client by default for server-side operations
      const db = client || supabaseAdmin;
      
      // Validate phone uniqueness if provided
      if (customerData.phone) {
        const existing = await CustomerRepository.getByPhone(customerData.phone, db);
        if (existing) {
          throw new AppError('Customer with this phone number already exists', 400);
        }
      }

      const customer = await CustomerRepository.create({
        ...customerData,
        tier: customerData.tier || CustomerTier.REGULAR,
        is_active: true,
      }, db);

      return customer;
    } catch (error) {
      console.error('Register customer error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to register customer', 500);
    }
  }

  /**
   * Update customer tier based on spending
   * @param customerId - Customer ID to update
   * @param client - Optional Supabase client (defaults to admin for server-side)
   */
  static async updateTierBasedOnSpending(customerId: string, client?: SupabaseClient<Database>): Promise<Customer> {
    try {
      // Use admin client by default for server-side operations
      const db = client || supabaseAdmin;
      
      const customer = await CustomerRepository.getById(customerId, db);
      if (!customer) throw new AppError('Customer not found', 404);

      const totalSpent = customer.total_spent || 0;
      let newTier = customer.tier;

      // Tier thresholds (can be configured)
      if (totalSpent >= 100000) {
        newTier = CustomerTier.VIP_PLATINUM;
      } else if (totalSpent >= 50000) {
        newTier = CustomerTier.VIP_GOLD;
      } else if (totalSpent >= 20000) {
        newTier = CustomerTier.VIP_SILVER;
      } else {
        newTier = CustomerTier.REGULAR;
      }

      // Only update if tier changed
      if (newTier !== customer.tier) {
        return await CustomerRepository.update(customerId, { tier: newTier }, db);
      }

      return customer;
    } catch (error) {
      console.error('Update tier error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update customer tier', 500);
    }
  }

  /**
   * Get customer with active offers
   * @param customerId - Customer ID
   * @param client - Optional Supabase client (defaults to admin for server-side)
   */
  static async getCustomerWithOffers(customerId: string, client?: SupabaseClient<Database>) {
    try {
      // Use admin client by default for server-side operations
      const db = client || supabaseAdmin;
      
      const customer = await CustomerRepository.getById(customerId, db);
      if (!customer) throw new AppError('Customer not found', 404);

      const offers = await CustomerRepository.checkEventOffers(customerId);

      return {
        customer,
        activeOffers: offers,
        hasActiveOffers: offers.length > 0,
      };
    } catch (error) {
      console.error('Get customer with offers error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get customer data', 500);
    }
  }

  /**
   * Search customers (for POS autocomplete)
   * Uses admin client to bypass RLS policies
   * @param query - Search query string
   */
  static async searchForPOS(query: string): Promise<Customer[]> {
    try {
      if (query.length < 2) {
        return [];
      }

      // Use admin client to bypass RLS policy issues
      return await CustomerRepository.search(query, supabaseAdmin);
    } catch (error) {
      console.error('Search customers error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to search customers', 500);
    }
  }

  /**
   * Get customer statistics
   * @param customerId - Customer ID
   * @param client - Optional Supabase client (defaults to admin for server-side)
   */
  static async getCustomerStats(customerId: string, client?: SupabaseClient<Database>) {
    try {
      // Use admin client by default for server-side operations
      const db = client || supabaseAdmin;
      
      const customer = await CustomerRepository.getById(customerId, db);
      if (!customer) throw new AppError('Customer not found', 404);

      return {
        totalSpent: customer.total_spent || 0,
        visitCount: customer.visit_count || 0,
        loyaltyPoints: customer.loyalty_points || 0,
        tier: customer.tier,
        memberSince: customer.created_at,
        lastVisit: customer.last_visit_date,
        averageSpend: customer.visit_count 
          ? (customer.total_spent || 0) / customer.visit_count 
          : 0,
      };
    } catch (error) {
      console.error('Get customer stats error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get customer stats', 500);
    }
  }
}
