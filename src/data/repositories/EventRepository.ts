// @ts-nocheck - Supabase type inference issues with nested queries and nullable fields
import { supabaseAdmin } from '../supabase/server-client';
import { AppError } from '@/lib/errors/AppError';
import {
  CustomerEvent,
  CreateCustomerEventInput,
  UpdateCustomerEventInput,
  RedeemEventInput,
} from '@/models/entities/CustomerEvent';

/**
 * EventRepository
 * Data access layer for customer events and offers
 * Uses server-side admin client for elevated database permissions
 */
export class EventRepository {
  /**
   * Get all events with optional filters
   * @param filters Optional filters for customer ID, event type, and redemption status
   * @returns Array of customer events with customer details
   */
  static async getAll(filters?: {
    customerId?: string;
    eventType?: string;
    isRedeemed?: boolean;
  }): Promise<CustomerEvent[]> {
    try {
      let query = supabaseAdmin
        .from('customer_events')
        .select(`
          *,
          customers(id, customer_number, full_name, tier)
        `)
        .order('event_date', { ascending: false });

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType as any);
      }

      if (filters?.isRedeemed !== undefined) {
        query = query.eq('is_redeemed', filters.isRedeemed);
      }

      const { data, error } = await query;

      if (error) {
        throw new AppError(`Failed to fetch events: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get all events error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch events', 500);
    }
  }

  /**
   * Get event by ID with customer details
   * @param id Event ID
   * @returns Customer event with customer details or null if not found
   */
  static async getById(id: string): Promise<CustomerEvent | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('customer_events')
        .select(`
          *,
          customers(id, customer_number, full_name, tier)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new AppError(`Failed to fetch event: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Get event by ID error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch event', 500);
    }
  }

  /**
   * Get active offers for a customer
   */
  static async getActiveForCustomer(customerId: string): Promise<CustomerEvent[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabaseAdmin
        .from('customer_events')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_redeemed', false)
        .lte('offer_valid_from', today)
        .gte('offer_valid_until', today)
        .order('event_date', { ascending: true });

      if (error) {
        throw new AppError(`Failed to fetch active offers: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get active offers error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch active offers', 500);
    }
  }

  /**
   * Create new customer event
   */
  static async create(input: CreateCustomerEventInput): Promise<CustomerEvent> {
    try {
      const { data, error } = await supabaseAdmin
        .from('customer_events')
        .insert(input)
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to create event: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Create event error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create event', 500);
    }
  }

  /**
   * Update customer event
   */
  static async update(id: string, input: UpdateCustomerEventInput): Promise<CustomerEvent> {
    try {
      const { data, error } = await supabaseAdmin
        .from('customer_events')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to update event: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Update event error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update event', 500);
    }
  }

  /**
   * Delete customer event
   */
  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('customer_events')
        .delete()
        .eq('id', id);

      if (error) {
        throw new AppError(`Failed to delete event: ${error.message}`, 500);
      }
    } catch (error) {
      console.error('Delete event error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to delete event', 500);
    }
  }

  /**
   * Redeem an event offer
   */
  static async redeem(id: string, redemptionData: RedeemEventInput): Promise<CustomerEvent> {
    try {
      const { data, error } = await supabaseAdmin
        .from('customer_events')
        .update({
          is_redeemed: true,
          redeemed_at: new Date().toISOString(),
          redeemed_order_id: redemptionData.order_id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to redeem event: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Redeem event error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to redeem event', 500);
    }
  }

  /**
   * Check if event offer has expired
   */
  static checkExpired(event: CustomerEvent): boolean {
    if (!event.offer_valid_until) {
      return false; // No expiry date
    }

    const today = new Date().toISOString().split('T')[0];
    return event.offer_valid_until < today;
  }

  /**
   * Get upcoming events (for notifications)
   */
  static async getUpcoming(daysAhead: number = 30): Promise<CustomerEvent[]> {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const { data, error } = await supabaseAdmin
        .from('customer_events')
        .select(`
          *,
          customers(id, customer_number, full_name, email, phone)
        `)
        .gte('event_date', todayStr)
        .lte('event_date', futureDateStr)
        .eq('notification_sent', false)
        .order('event_date', { ascending: true });

      if (error) {
        throw new AppError(`Failed to fetch upcoming events: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get upcoming events error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch upcoming events', 500);
    }
  }

  /**
   * Mark notification as sent
   */
  static async markNotificationSent(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('customer_events')
        .update({
          notification_sent: true,
          notification_sent_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new AppError(`Failed to mark notification sent: ${error.message}`, 500);
      }
    } catch (error) {
      console.error('Mark notification sent error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to mark notification sent', 500);
    }
  }
}
