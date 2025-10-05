import { CustomerTier } from '../enums/CustomerTier';

/**
 * Customer Entity
 * Represents a customer in the system
 */
export interface Customer {
  id: string;
  customer_number: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  anniversary_date: string | null;
  tier: CustomerTier;
  vip_membership_number: string | null;
  vip_start_date: string | null;
  vip_expiry_date: string | null;
  loyalty_points: number;
  total_spent: number;
  visit_count: number;
  last_visit_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  full_name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  anniversary_date?: string;
  tier?: CustomerTier;
  notes?: string;
}

export interface UpdateCustomerInput {
  full_name?: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  anniversary_date?: string;
  tier?: CustomerTier;
  notes?: string;
}
