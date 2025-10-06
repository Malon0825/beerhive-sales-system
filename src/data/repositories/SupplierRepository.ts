// @ts-nocheck - Supabase type inference issues
import { supabase } from '../supabase/client';
import { AppError } from '@/lib/errors/AppError';

export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lead_time_days: number;
  payment_terms: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierInput {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  lead_time_days?: number;
  payment_terms?: string;
  notes?: string;
}

/**
 * SupplierRepository
 * Data access layer for supplier management
 */
export class SupplierRepository {
  /**
   * Generate unique supplier code
   */
  private static async generateSupplierCode(): Promise<string> {
    const { count, error } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new AppError('Failed to generate supplier code', 500);
    }

    const nextNumber = (count || 0) + 1;
    return `SUP${nextNumber.toString().padStart(5, '0')}`;
  }

  /**
   * Get all suppliers
   */
  static async getAll(includeInactive: boolean = false): Promise<Supplier[]> {
    try {
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new AppError(`Failed to fetch suppliers: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get all suppliers error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch suppliers', 500);
    }
  }

  /**
   * Get supplier by ID
   */
  static async getById(id: string): Promise<Supplier | null> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new AppError(`Failed to fetch supplier: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Get supplier by ID error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch supplier', 500);
    }
  }

  /**
   * Create new supplier
   */
  static async create(input: CreateSupplierInput): Promise<Supplier> {
    try {
      const supplierCode = await this.generateSupplierCode();

      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          supplier_code: supplierCode,
          ...input,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to create supplier: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Create supplier error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create supplier', 500);
    }
  }

  /**
   * Update supplier
   */
  static async update(id: string, input: Partial<CreateSupplierInput>): Promise<Supplier> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to update supplier: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Update supplier error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update supplier', 500);
    }
  }

  /**
   * Deactivate supplier
   */
  static async deactivate(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        throw new AppError(`Failed to deactivate supplier: ${error.message}`, 500);
      }
    } catch (error) {
      console.error('Deactivate supplier error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to deactivate supplier', 500);
    }
  }

  /**
   * Reactivate supplier
   */
  static async reactivate(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: true })
        .eq('id', id);

      if (error) {
        throw new AppError(`Failed to reactivate supplier: ${error.message}`, 500);
      }
    } catch (error) {
      console.error('Reactivate supplier error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to reactivate supplier', 500);
    }
  }

  /**
   * Delete supplier
   */
  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);

      if (error) {
        throw new AppError(`Failed to delete supplier: ${error.message}`, 500);
      }
    } catch (error) {
      console.error('Delete supplier error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to delete supplier', 500);
    }
  }

  /**
   * Search suppliers
   */
  static async search(query: string): Promise<Supplier[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .or(`name.ilike.%${query}%,supplier_code.ilike.%${query}%`)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(20);

      if (error) {
        throw new AppError(`Failed to search suppliers: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Search suppliers error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to search suppliers', 500);
    }
  }
}
