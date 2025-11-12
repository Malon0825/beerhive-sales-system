// @ts-nocheck - Supabase nested select type inference issues
import { supabaseAdmin } from '../supabase/server-client';
import { AppError } from '@/lib/errors/AppError';

export interface CreateDiscountRecord {
  discount_amount: number;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  reason: string;
  cashier_id?: string | null;
  manager_id?: string | null;
  order_id?: string | null;
  order_item_id?: string | null;
  notes?: string | null;
}

/**
 * DiscountRepository
 * Data access layer for discount audit entries
 */
export class DiscountRepository {
  /**
   * Create a new discount audit record
   */
  static async create(discount: CreateDiscountRecord) {
    try {
      const { data, error } = await supabaseAdmin
        .from('discounts')
        .insert({
          discount_amount: discount.discount_amount,
          discount_type: discount.discount_type,
          discount_value: discount.discount_value,
          reason: discount.reason,
          cashier_id: discount.cashier_id ?? null,
          manager_id: discount.manager_id ?? null,
          order_id: discount.order_id ?? null,
          order_item_id: discount.order_item_id ?? null,
          notes: discount.notes ?? null,
        })
        .select()
        .single();

      if (error) {
        console.error('Create discount record error:', error);
        throw new AppError(`Failed to create discount record: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('❌ [DiscountRepository.create] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create discount record', 500);
    }
  }
}
