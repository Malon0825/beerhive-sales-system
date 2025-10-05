import { PaymentMethod } from '../enums/PaymentMethod';

/**
 * Data Transfer Object for payment processing
 */
export interface PaymentDTO {
  order_id: string;
  payment_method: PaymentMethod;
  amount_tendered: number;
  reference_number?: string; // For card/digital payments
  split_payments?: SplitPaymentDTO[];
}

export interface SplitPaymentDTO {
  payment_method: PaymentMethod;
  amount: number;
  reference_number?: string;
  notes?: string;
}

export interface PaymentResponseDTO {
  order_id: string;
  total_amount: number;
  amount_tendered: number;
  change_amount: number;
  payment_method: PaymentMethod;
  receipt_number: string;
  completed_at: string;
}
