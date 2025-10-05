/**
 * Payment Method Enumeration
 * Defines available payment methods
 */
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  GCASH = 'gcash',
  PAYMAYA = 'paymaya',
  BANK_TRANSFER = 'bank_transfer',
  SPLIT = 'split',
}

export type PaymentMethodType = `${PaymentMethod}`;
