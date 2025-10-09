/**
 * Order Status Enumeration
 * Defines the lifecycle states of an order
 * 
 * Order Flow in Tab System:
 * DRAFT → CONFIRMED → PREPARING → READY → SERVED → COMPLETED
 * 
 * Legacy statuses still supported:
 * - PENDING: For backward compatibility
 * - ON_HOLD: Temporarily paused orders
 * - VOIDED: Cancelled orders
 */
export enum OrderStatus {
  // New tab system statuses
  DRAFT = 'draft',           // Items added but not sent to kitchen
  CONFIRMED = 'confirmed',   // Sent to kitchen/bartender
  PREPARING = 'preparing',   // Being prepared
  READY = 'ready',           // Ready for serving
  SERVED = 'served',         // Delivered to customer
  
  // Legacy statuses
  PENDING = 'pending',       // Old system: awaiting payment
  COMPLETED = 'completed',   // Payment received
  VOIDED = 'voided',         // Cancelled
  ON_HOLD = 'on_hold',       // Temporarily paused
}

export type OrderStatusType = `${OrderStatus}`;
