/**
 * Kitchen Order Status Enumeration
 * Defines the states of orders in the kitchen/bartender workflow
 */
export enum KitchenOrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled',
}

export type KitchenOrderStatusType = `${KitchenOrderStatus}`;
