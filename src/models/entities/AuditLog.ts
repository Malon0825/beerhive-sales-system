/**
 * AuditLog Entity
 * Represents a system audit log entry for tracking critical actions
 */

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Audit Log with User Information
 */
export interface AuditLogWithUser extends AuditLog {
  user?: {
    id: string;
    full_name: string;
    username: string;
    role: string;
  } | null;
}

/**
 * Audit Action Types
 */
export enum AuditAction {
  // Order actions
  ORDER_CREATED = 'order_created',
  ORDER_COMPLETED = 'order_completed',
  ORDER_VOIDED = 'order_voided',
  
  // Inventory actions
  INVENTORY_ADJUSTED = 'inventory_adjusted',
  STOCK_DEDUCTED = 'stock_deducted',
  
  // Price actions
  PRICE_CHANGED = 'price_changed',
  DISCOUNT_APPLIED = 'discount_applied',
  
  // User actions
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  
  // Manager actions
  MANAGER_OVERRIDE = 'manager_override',
  
  // Customer actions
  CUSTOMER_CREATED = 'customer_created',
  CUSTOMER_UPDATED = 'customer_updated',
  VIP_STATUS_CHANGED = 'vip_status_changed',
  
  // Product actions
  PRODUCT_CREATED = 'product_created',
  PRODUCT_UPDATED = 'product_updated',
  PRODUCT_DELETED = 'product_deleted',
}
