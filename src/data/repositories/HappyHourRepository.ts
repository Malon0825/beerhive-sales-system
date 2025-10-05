import { supabase } from '../supabase/client';
import { AppError } from '@/lib/errors/AppError';
import { HappyHour, CreateHappyHourInput, UpdateHappyHourInput, HappyHourProduct } from '@/models/entities/HappyHour';

/**
 * HappyHourRepository
 * Data access layer for happy hour pricing management
 */
export class HappyHourRepository {
  /**
   * Get all happy hours
   */
  static async getAll(includeInactive: boolean = false): Promise<HappyHour[]> {
    try {
      let query = supabase
        .from('happy_hour_pricing')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        throw new AppError(`Failed to fetch happy hours: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get all happy hours error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch happy hours', 500);
    }
  }

  /**
   * Get happy hour by ID
   */
  static async getById(id: string): Promise<HappyHour | null> {
    try {
      const { data, error } = await supabase
        .from('happy_hour_pricing')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new AppError(`Failed to fetch happy hour: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Get happy hour by ID error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch happy hour', 500);
    }
  }

  /**
   * Get currently active happy hours
   */
  static async getActive(): Promise<HappyHour[]> {
    try {
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
      const currentDay = now.getDay() || 7; // 1-7 (Monday-Sunday)
      const currentDate = now.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('happy_hour_pricing')
        .select('*')
        .eq('is_active', true)
        .lte('start_time', currentTime)
        .gte('end_time', currentTime)
        .or(`valid_from.is.null,valid_from.lte.${currentDate}`)
        .or(`valid_until.is.null,valid_until.gte.${currentDate}`);

      if (error) {
        throw new AppError(`Failed to fetch active happy hours: ${error.message}`, 500);
      }

      // Filter by day of week
      const filtered = (data || []).filter(hh => {
        if (!hh.days_of_week || hh.days_of_week.length === 0) return true;
        return hh.days_of_week.includes(currentDay);
      });

      return filtered;
    } catch (error) {
      console.error('Get active happy hours error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch active happy hours', 500);
    }
  }

  /**
   * Create new happy hour
   */
  static async create(input: CreateHappyHourInput, createdBy: string): Promise<HappyHour> {
    try {
      const { product_ids, ...happyHourData } = input;

      // Insert happy hour
      const { data: happyHour, error: insertError } = await supabase
        .from('happy_hour_pricing')
        .insert({
          ...happyHourData,
          created_by: createdBy,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        throw new AppError(`Failed to create happy hour: ${insertError.message}`, 500);
      }

      // Associate products if provided
      if (product_ids && product_ids.length > 0) {
        await this.associateProducts(happyHour.id, product_ids);
      }

      return happyHour;
    } catch (error) {
      console.error('Create happy hour error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create happy hour', 500);
    }
  }

  /**
   * Update happy hour
   */
  static async update(id: string, input: UpdateHappyHourInput): Promise<HappyHour> {
    try {
      const { data, error } = await supabase
        .from('happy_hour_pricing')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to update happy hour: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Update happy hour error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update happy hour', 500);
    }
  }

  /**
   * Delete happy hour (soft delete by setting is_active to false)
   */
  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('happy_hour_pricing')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        throw new AppError(`Failed to delete happy hour: ${error.message}`, 500);
      }
    } catch (error) {
      console.error('Delete happy hour error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to delete happy hour', 500);
    }
  }

  /**
   * Associate products with happy hour
   */
  static async associateProducts(happyHourId: string, productIds: string[]): Promise<void> {
    try {
      // Remove existing associations
      await supabase
        .from('happy_hour_products')
        .delete()
        .eq('happy_hour_id', happyHourId);

      // Add new associations
      if (productIds.length > 0) {
        const associations = productIds.map(productId => ({
          happy_hour_id: happyHourId,
          product_id: productId,
        }));

        const { error } = await supabase
          .from('happy_hour_products')
          .insert(associations);

        if (error) {
          throw new AppError(`Failed to associate products: ${error.message}`, 500);
        }
      }
    } catch (error) {
      console.error('Associate products error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to associate products', 500);
    }
  }

  /**
   * Get products associated with a happy hour
   */
  static async getHappyHourProducts(happyHourId: string): Promise<HappyHourProduct[]> {
    try {
      const { data, error } = await supabase
        .from('happy_hour_products')
        .select('*')
        .eq('happy_hour_id', happyHourId);

      if (error) {
        throw new AppError(`Failed to fetch happy hour products: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get happy hour products error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch happy hour products', 500);
    }
  }

  /**
   * Check if product is eligible for happy hour pricing
   */
  static async checkEligibility(productId: string): Promise<boolean> {
    try {
      const activeHappyHours = await this.getActive();

      for (const happyHour of activeHappyHours) {
        // Check if applies to all products
        if (happyHour.applies_to_all_products) {
          return true;
        }

        // Check if product is specifically associated
        const products = await this.getHappyHourProducts(happyHour.id);
        if (products.some(p => p.product_id === productId)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Check eligibility error:', error);
      return false;
    }
  }
}
