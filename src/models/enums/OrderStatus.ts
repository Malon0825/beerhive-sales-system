/**
 * Order Status Enumeration
 * Defines the lifecycle states of an order
 */
export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  VOIDED = 'voided',
  ON_HOLD = 'on_hold',
}

export type OrderStatusType = `${OrderStatus}`;
