import { PaymentMethod } from '../enums/PaymentMethod';
import { OrderStatus } from '../enums/OrderStatus';

/**
 * Data Transfer Object for creating an order
 * 
 * @property session_id - Optional session ID for tab-based orders
 * @property customer_id - Optional customer ID
 * @property table_id - Optional table ID
 * @property status - Order status (defaults to PENDING if not provided, use DRAFT for tab orders)
 * @property items - Array of order items
 * @property payment_method - Payment method (if paying immediately)
 * @property amount_tendered - Amount paid by customer
 * @property change_amount - Change to return
 * @property discount_amount - Discount amount or percentage
 * @property discount_type - Type of discount (percentage or fixed amount)
 * @property event_offer_id - Event offer ID if applicable
 * @property notes - Order notes
 */
export interface CreateOrderDTO {
  session_id?: string;
  customer_id?: string;
  table_id?: string;
  status?: OrderStatus;
  items: OrderItemDTO[];
  payment_method?: PaymentMethod;
  amount_tendered?: number;
  change_amount?: number;
  discount_amount?: number;
  discount_type?: 'percentage' | 'fixed_amount';
  event_offer_id?: string;
  notes?: string;
}

export interface OrderItemDTO {
  product_id?: string;
  package_id?: string;
  quantity: number;
  discount_amount?: number;
  is_complimentary?: boolean;
  notes?: string;
  addons?: string[]; // Array of addon IDs
}

export interface CompleteOrderDTO {
  payment_method: PaymentMethod;
  amount_tendered: number;
}

export interface VoidOrderDTO {
  void_reason: string;
  manager_id: string;
  manager_pin: string;
}
