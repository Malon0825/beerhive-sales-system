/**
 * Kitchen Order Status Enumeration
 * Defines the states of orders in the kitchen/bartender workflow
 */
export enum KitchenOrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
}

export type KitchenOrderStatusType = `${KitchenOrderStatus}`;
