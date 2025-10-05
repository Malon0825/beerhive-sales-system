import { CustomerTier } from '../enums/CustomerTier';

/**
 * Data Transfer Object for creating/updating a customer
 */
export interface CreateCustomerDTO {
  full_name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  anniversary_date?: string;
  tier?: CustomerTier;
  notes?: string;
}

export interface UpdateCustomerDTO {
  full_name?: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  anniversary_date?: string;
  tier?: CustomerTier;
  vip_membership_number?: string;
  vip_start_date?: string;
  vip_expiry_date?: string;
  notes?: string;
  is_active?: boolean;
}
