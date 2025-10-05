import { OrderRepository } from '@/data/repositories/OrderRepository';
import { AuthService } from '@/core/services/auth/AuthService';
import { ProductRepository } from '@/data/repositories/ProductRepository';
import { OrderStatus } from '@/models/enums/OrderStatus';
import { UserRole } from '@/models/enums/UserRole';
import { AppError } from '@/lib/errors/AppError';
import { AuditLogService } from '@/core/services/audit/AuditLogService';

/**
 * VoidOrderService
 * Handles order voiding with manager authorization
 */
export class VoidOrderService {
  /**
   * Void order with manager authorization
   */
  static async voidOrder(
    orderId: string,
    managerUserId: string,
    reason: string,
    returnInventory: boolean = true
  ) {
    try {
      // Step 1: Get order
      const order = await OrderRepository.getById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Step 2: Validate order can be voided
      if (order.status === OrderStatus.VOIDED) {
        throw new AppError('Order is already voided', 400);
      }

      if (order.status === OrderStatus.COMPLETED) {
        // Completed orders require special authorization
        // Could be extended to require additional approval
      }

      // Step 3: Verify manager authorization
      const manager = await AuthService.getCurrentUser();
      if (!manager || !AuthService.isManagerOrAbove(manager)) {
        throw new AppError('Only managers or admins can void orders', 403);
      }

      // Step 4: Void the order
      const voidedOrder = await OrderRepository.void(orderId, managerUserId, reason);

      // Step 5: Return inventory if requested
      if (returnInventory && order.order_items) {
        await this.returnInventoryForOrder(order);
      }

      // Step 6: Log audit trail
      await AuditLogService.logOrderVoided(
        managerUserId,
        orderId,
        reason,
        managerUserId
      );

      return voidedOrder;
    } catch (error) {
      console.error('Void order error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to void order', 500);
    }
  }

  /**
   * Return inventory for voided order
   */
  private static async returnInventoryForOrder(order: any) {
    try {
      if (!order.order_items || order.order_items.length === 0) {
        return;
      }

      for (const item of order.order_items) {
        if (item.product_id && !item.is_complimentary) {
          // Get current stock
          const product = await ProductRepository.getById(item.product_id);
          if (product) {
            const newStock = (product.current_stock || 0) + item.quantity;
            await ProductRepository.updateStock(item.product_id, newStock);

            // TODO: Create inventory movement record
            // await InventoryRepository.logMovement({
            //   product_id: item.product_id,
            //   movement_type: 'void_return',
            //   reason: 'void_return',
            //   quantity_change: item.quantity,
            //   quantity_before: product.current_stock,
            //   quantity_after: newStock,
            //   order_id: order.id,
            //   performed_by: order.voided_by,
            // });
          }
        }
      }
    } catch (error) {
      console.error('Return inventory error:', error);
      // Don't throw error, just log it
      // Inventory return failure shouldn't prevent void
    }
  }

  /**
   * Validate void reason
   */
  static validateVoidReason(reason: string): boolean {
    const validReasons = [
      'customer_request',
      'order_error',
      'kitchen_error',
      'duplicate_order',
      'payment_failed',
      'other',
    ];

    // If reason is one of the predefined ones, it's valid
    if (validReasons.includes(reason.toLowerCase().replace(/\s+/g, '_'))) {
      return true;
    }

    // Otherwise, check if it's a custom reason with minimum length
    return reason.trim().length >= 10;
  }

  /**
   * Get void statistics
   */
  static async getVoidStatistics(startDate: string, endDate: string) {
    try {
      const orders = await OrderRepository.getByDateRange(startDate, endDate);
      
      const voidedOrders = orders.filter(order => order.status === OrderStatus.VOIDED);
      const totalOrders = orders.length;
      const voidedCount = voidedOrders.length;
      const voidRate = totalOrders > 0 ? (voidedCount / totalOrders) * 100 : 0;

      // Group by reason
      const reasonStats = voidedOrders.reduce((acc, order) => {
        const reason = order.voided_reason || 'unknown';
        if (!acc[reason]) {
          acc[reason] = { count: 0, totalAmount: 0 };
        }
        acc[reason].count++;
        acc[reason].totalAmount += order.total_amount || 0;
        return acc;
      }, {} as Record<string, { count: number; totalAmount: number }>);

      return {
        totalOrders,
        voidedCount,
        voidRate: Math.round(voidRate * 100) / 100,
        totalVoidedAmount: voidedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
        reasonBreakdown: reasonStats,
      };
    } catch (error) {
      console.error('Get void statistics error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get statistics', 500);
    }
  }
}
