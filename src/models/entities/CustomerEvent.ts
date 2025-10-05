import { EventType } from '../enums/EventType';

/**
 * Customer Event Entity
 * Represents special events (birthday, anniversary) with offers for customers
 */
export interface CustomerEvent {
  id: string;
  customer_id: string;
  event_type: EventType;
  event_date: string; // ISO date string
  event_name: string | null;
  offer_description: string | null;
  discount_type: 'percentage' | 'fixed_amount' | 'complimentary' | null;
  discount_value: number | null;
  free_item_product_id: string | null;
  offer_valid_from: string | null;
  offer_valid_until: string | null;
  is_redeemed: boolean;
  redeemed_at: string | null;
  redeemed_order_id: string | null;
  notification_sent: boolean;
  notification_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerEventInput {
  customer_id: string;
  event_type: EventType;
  event_date: string;
  event_name?: string;
  offer_description?: string;
  discount_type?: 'percentage' | 'fixed_amount' | 'complimentary';
  discount_value?: number;
  free_item_product_id?: string;
  offer_valid_from?: string;
  offer_valid_until?: string;
  notes?: string;
}

export interface UpdateCustomerEventInput {
  event_date?: string;
  event_name?: string;
  offer_description?: string;
  discount_type?: 'percentage' | 'fixed_amount' | 'complimentary';
  discount_value?: number;
  free_item_product_id?: string;
  offer_valid_from?: string;
  offer_valid_until?: string;
  notes?: string;
}

export interface RedeemEventInput {
  order_id: string;
}
