/**
 * Supplier Entity
 * Represents a supplier/vendor for purchasing products
 */
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

export interface ProductSupplier {
  product_id: string;
  supplier_id: string;
  supplier_sku: string | null;
  unit_cost: number | null;
  minimum_order_quantity: number | null;
  is_primary: boolean;
  created_at: string;
}

export interface CreateSupplierInput {
  supplier_code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  lead_time_days?: number;
  payment_terms?: string;
  notes?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  lead_time_days?: number;
  payment_terms?: string;
  is_active?: boolean;
  notes?: string;
}
