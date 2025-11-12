import { SessionStatus } from '@/models/enums/SessionStatus';

/**
 * OrderSession Entity
 * Represents a dining session (tab) at a table
 * One session can contain multiple orders
 */
export interface OrderSession {
  id: string;
  session_number: string;
  
  // Relationships
  table_id?: string;
  customer_id?: string;
  
  // Financials (running total)
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  
  // Status
  status: SessionStatus;
  
  // Timestamps
  opened_at: string;
  closed_at?: string;
  
  // Audit
  opened_by?: string;
  closed_by?: string;
  
  // Notes
  notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Related data (populated via joins)
  table?: {
    id: string;
    table_number: string;
    area?: string;
  };
  customer?: {
    id: string;
    full_name: string;
    tier?: string;
  };
  orders?: any[]; // Order entities
}

/**
 * Create OrderSession DTO
 */
export interface CreateOrderSessionDto {
  table_id?: string;
  customer_id?: string;
  notes?: string;
  opened_by?: string;
}

/**
 * Update OrderSession DTO
 */
export interface UpdateOrderSessionDto {
  notes?: string;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount?: number;
}

/**
 * Close OrderSession DTO
 */
export interface CloseOrderSessionDto {
  closed_by?: string;
  payment_method: string;
  amount_tendered: number;
  discount_amount?: number;
  discount_type?: 'percentage' | 'fixed_amount';
  discount_value?: number;
  notes?: string;
}
