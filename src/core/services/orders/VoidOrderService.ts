import { OrderRepository } from '@/data/repositories/OrderRepository';
import { AuthService } from '@/core/services/auth/AuthService';
import { ProductRepository } from '@/data/repositories/ProductRepository';
import { PackageRepository } from '@/data/repositories/PackageRepository';
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
   * @param skipSessionCheck - If true, skips checking current logged-in user (used when PIN auth already validated)
   */
  static async voidOrder(
    orderId: string,
    managerUserId: string,
    reason: string,
    returnInventory: boolean = true,
    skipSessionCheck: boolean = false
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
      // Skip session check if PIN authorization was already validated in API
      if (!skipSessionCheck) {
        const manager = await AuthService.getCurrentUser();
        if (!manager || !AuthService.isManagerOrAbove(manager)) {
          throw new AppError('Only managers or admins can void orders', 403);
        }
      }
      // If skipSessionCheck=true, PIN auth already validated manager in API endpoint

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
   * Handles both individual products and package items
   */
  private static async returnInventoryForOrder(order: any) {
    try {
      if (!order.order_items || order.order_items.length === 0) {
        return;
      }

      for (const item of order.order_items) {
        // Skip complimentary items
        if (item.is_complimentary) {
          continue;
        }

        // Handle individual product items
        if (item.product_id && !item.package_id) {
          await this.returnProductStock(item.product_id, item.quantity, order.id);
        }
        
        // Handle package items - return stock for all products in the package
        if (item.package_id && !item.product_id) {
          await this.returnPackageStock(item.package_id, item.quantity, order.id);
        }
      }
    } catch (error) {
      console.error('Return inventory error:', error);
      // Don't throw error, just log it
      // Inventory return failure shouldn't prevent void
    }
  }

  /**
   * Return stock for a single product
   */
  private static async returnProductStock(productId: string, quantity: number, orderId: string) {
    try {
      const product = await ProductRepository.getById(productId);
      if (product) {
        const newStock = (product.current_stock || 0) + quantity;
        await ProductRepository.updateStock(productId, newStock);
        
        console.log(`✅ Returned ${quantity} units of ${product.name} to inventory (${product.current_stock} → ${newStock})`);

        // TODO: Create inventory movement record
        // await InventoryRepository.logMovement({
        //   product_id: productId,
        //   movement_type: 'void_return',
        //   reason: 'void_return',
        //   quantity_change: quantity,
        //   quantity_before: product.current_stock,
        //   quantity_after: newStock,
        //   order_id: orderId,
        //   performed_by: order.voided_by,
        // });
      }
    } catch (error) {
      console.error(`Failed to return stock for product ${productId}:`, error);
    }
  }

  /**
   * Return stock for all products in a package
   * Each product in the package has its stock returned based on the package quantity
   */
  private static async returnPackageStock(packageId: string, packageQuantity: number, orderId: string) {
    try {
      // Fetch package with its items
      const packageData = await PackageRepository.getById(packageId);
      
      if (!packageData || !packageData.items || packageData.items.length === 0) {
        console.warn(`⚠️ Package ${packageId} not found or has no items`);
        return;
      }

      console.log(`📦 Returning inventory for package: ${packageData.name} (qty: ${packageQuantity})`);

      // Return stock for each product in the package
      for (const packageItem of packageData.items) {
        if (packageItem.product_id) {
          // Calculate total quantity to return: package quantity × item quantity per package
          const totalQuantity = packageQuantity * (packageItem.quantity || 1);
          await this.returnProductStock(packageItem.product_id, totalQuantity, orderId);
        }
      }
    } catch (error) {
      console.error(`Failed to return stock for package ${packageId}:`, error);
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
