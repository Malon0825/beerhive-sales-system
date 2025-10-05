/**
 * Happy Hour Pricing Entity
 * Represents a happy hour promotion with time-based pricing rules
 */
export interface HappyHour {
  id: string;
  name: string;
  description: string | null;
  start_time: string; // Format: 'HH:MM:SS'
  end_time: string; // Format: 'HH:MM:SS'
  days_of_week: number[]; // Array: [1,2,3,4,5] for Mon-Fri (1=Monday, 7=Sunday)
  valid_from: string | null;
  valid_until: string | null;
  discount_type: 'percentage' | 'fixed_amount' | 'complimentary';
  discount_value: number;
  applies_to_all_products: boolean;
  min_order_amount: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HappyHourProduct {
  happy_hour_id: string;
  product_id: string;
  custom_price: number | null;
}

export interface CreateHappyHourInput {
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  valid_from?: string;
  valid_until?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'complimentary';
  discount_value: number;
  applies_to_all_products?: boolean;
  min_order_amount?: number;
  product_ids?: string[];
}

export interface UpdateHappyHourInput {
  name?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: number[];
  valid_from?: string;
  valid_until?: string;
  discount_value?: number;
  applies_to_all_products?: boolean;
  min_order_amount?: number;
  is_active?: boolean;
}
