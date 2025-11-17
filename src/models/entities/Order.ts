import { OrderStatus } from '../enums/OrderStatus';
import { PaymentMethod } from '../enums/PaymentMethod';

/**
 * Order Entity
 * Represents a customer order/transaction
 */
export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  cashier_id: string | null;
  table_id: string | null;
  session_id?: string | null;  // Added for tab system
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  applied_event_offer_id: string | null;
  payment_method: PaymentMethod | null;
  amount_tendered: number | null;
  change_amount: number | null;
  status: OrderStatus;
  order_notes: string | null;
  voided_by: string | null;
  voided_reason: string | null;
  voided_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  package_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  is_vip_price: boolean;
  is_complimentary: boolean;
  notes: string | null;
  complex_product_metadata?: {
    package_items?: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      is_choice_item?: boolean;
      choice_group?: string | null;
    }>;
  } | null;
  created_at: string;
}

export interface CreateOrderInput {
  customer_id?: string;
  table_id?: string;
  items: CreateOrderItemInput[];
  order_notes?: string;
}

export interface CreateOrderItemInput {
  product_id?: string;
  package_id?: string;
  quantity: number;
  notes?: string;
}
