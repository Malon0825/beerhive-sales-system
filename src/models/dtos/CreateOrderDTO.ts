import { PaymentMethod } from '../enums/PaymentMethod';

/**
 * Data Transfer Object for creating an order
 */
export interface CreateOrderDTO {
  customer_id?: string;
  table_id?: string;
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
