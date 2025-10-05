/**
 * AuditLogService
 * Business logic for audit logging operations
 */

import { AuditLogRepository } from '@/data/repositories/AuditLogRepository';
import { AuditAction, CreateAuditLogDTO } from '@/models';

export class AuditLogService {
  /**
   * Generic log method
   */
  static async log(data: CreateAuditLogDTO): Promise<void> {
    try {
      await AuditLogRepository.create(data);
    } catch (error) {
      // Log error but don't throw - audit logging should not break the main flow
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Log user action (login, logout, etc.)
   */
  static async logUserAction(
    userId: string,
    action: AuditAction,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log data change (create, update, delete)
   */
  static async logDataChange(
    userId: string | null,
    action: AuditAction,
    tableName: string,
    recordId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log security event (manager override, void, etc.)
   */
  static async logSecurityEvent(
    userId: string,
    action: AuditAction,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action,
      new_values: details,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log order creation
   */
  static async logOrderCreated(
    userId: string,
    orderId: string,
    orderData: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.ORDER_CREATED,
      'orders',
      orderId,
      undefined,
      orderData,
      ipAddress
    );
  }

  /**
   * Log order completion
   */
  static async logOrderCompleted(
    userId: string,
    orderId: string,
    orderData: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.ORDER_COMPLETED,
      'orders',
      orderId,
      undefined,
      orderData,
      ipAddress
    );
  }

  /**
   * Log order void
   */
  static async logOrderVoided(
    userId: string,
    orderId: string,
    reason: string,
    managerId?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.ORDER_VOIDED,
      'orders',
      orderId,
      undefined,
      {
        voided_by: userId,
        manager_id: managerId,
        reason,
      },
      ipAddress
    );
  }

  /**
   * Log inventory adjustment
   */
  static async logInventoryAdjustment(
    userId: string,
    productId: string,
    oldStock: number,
    newStock: number,
    reason: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.INVENTORY_ADJUSTED,
      'products',
      productId,
      { current_stock: oldStock },
      { current_stock: newStock, reason },
      ipAddress
    );
  }

  /**
   * Log price change
   */
  static async logPriceChange(
    userId: string,
    productId: string,
    oldPrice: number,
    newPrice: number,
    reason?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.PRICE_CHANGED,
      'products',
      productId,
      { base_price: oldPrice },
      { base_price: newPrice, reason },
      ipAddress
    );
  }

  /**
   * Log discount application
   */
  static async logDiscountApplied(
    userId: string,
    orderId: string,
    discountAmount: number,
    discountPercentage: number,
    requiresApproval: boolean,
    managerId?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.DISCOUNT_APPLIED,
      'orders',
      orderId,
      undefined,
      {
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        requires_manager_approval: requiresApproval,
        approved_by: managerId,
      },
      ipAddress
    );
  }

  /**
   * Log manager override
   */
  static async logManagerOverride(
    managerId: string,
    action: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logSecurityEvent(
      managerId,
      AuditAction.MANAGER_OVERRIDE,
      {
        override_action: action,
        ...details,
      },
      ipAddress
    );
  }

  /**
   * Log customer VIP status change
   */
  static async logVIPStatusChange(
    userId: string,
    customerId: string,
    oldTier: string,
    newTier: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.VIP_STATUS_CHANGED,
      'customers',
      customerId,
      { tier: oldTier },
      { tier: newTier },
      ipAddress
    );
  }

  /**
   * Log product created
   */
  static async logProductCreated(
    userId: string,
    productId: string,
    productData: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.PRODUCT_CREATED,
      'products',
      productId,
      undefined,
      productData,
      ipAddress
    );
  }

  /**
   * Log product updated
   */
  static async logProductUpdated(
    userId: string,
    productId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.PRODUCT_UPDATED,
      'products',
      productId,
      oldData,
      newData,
      ipAddress
    );
  }

  /**
   * Log customer created
   */
  static async logCustomerCreated(
    userId: string,
    customerId: string,
    customerData: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.CUSTOMER_CREATED,
      'customers',
      customerId,
      undefined,
      customerData,
      ipAddress
    );
  }

  /**
   * Log customer updated
   */
  static async logCustomerUpdated(
    userId: string,
    customerId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    await this.logDataChange(
      userId,
      AuditAction.CUSTOMER_UPDATED,
      'customers',
      customerId,
      oldData,
      newData,
      ipAddress
    );
  }
}
