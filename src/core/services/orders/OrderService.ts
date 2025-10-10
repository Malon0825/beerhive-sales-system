import { OrderRepository } from '@/data/repositories/OrderRepository';
import { Order } from '@/models/entities/Order';
import { OrderStatus } from '@/models/enums/OrderStatus';
import { KitchenRouting } from '@/core/services/kitchen/KitchenRouting';
import { StockDeduction } from '@/core/services/inventory/StockDeduction';
import { AppError } from '@/lib/errors/AppError';

/**
 * OrderService
 * Business logic for order management
 */
export class OrderService {
  /**
   * Confirm order and send to kitchen/bartender
   * This triggers food preparation WITHOUT requiring payment
   * 
   * IMPORTANT: Stock is deducted immediately when order is confirmed!
   * This prevents overbooking across multiple tables/sessions.
   * 
   * Flow:
   * 1. Validate order exists and is in draft status
   * 2. Check stock availability for all items
   * 3. Deduct stock immediately (reserves inventory)
   * 4. Mark order as confirmed
   * 5. Route order items to kitchen/bartender for preparation
   * 6. Kitchen/bartender will receive real-time notifications
   * 
   * @param orderId - Order ID to confirm
   * @param userId - User ID for inventory audit trail (optional)
   * @returns Confirmed order
   */
  static async confirmOrder(orderId: string, userId?: string): Promise<Order> {
    try {
      console.log(`🎯 [OrderService.confirmOrder] Confirming order ${orderId}`);
      
      // Step 1: Get order with items
      const order = await OrderRepository.getById(orderId);
      
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status !== OrderStatus.DRAFT && order.status !== OrderStatus.PENDING) {
        throw new AppError(`Cannot confirm order with status: ${order.status}`, 400);
      }

      console.log(`✅ [OrderService.confirmOrder] Order validated, ${order.order_items?.length || 0} items found`);

      // Step 2: Check stock availability for all items
      if (order.order_items && order.order_items.length > 0) {
        console.log(`🔍 [OrderService.confirmOrder] Checking stock availability for ${order.order_items.length} items...`);
        
        const itemsToCheck = order.order_items
          .filter((item: any) => item.product_id) // Only check products, not packages
          .map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          }));

        if (itemsToCheck.length > 0) {
          const stockCheck = await StockDeduction.checkStockAvailability(itemsToCheck);
          
          if (!stockCheck.available) {
            const insufficientDetails = stockCheck.insufficientItems
              .map(item => `Product ${item.productId.substring(0, 8)}: requested ${item.requested}, available ${item.available}`)
              .join('; ');
            
            throw new AppError(
              `Insufficient stock to confirm order. ${insufficientDetails}`,
              400
            );
          }
          
          console.log(`✅ [OrderService.confirmOrder] Stock availability confirmed`);
        }
      }

      // Step 3: Deduct stock immediately (reserves inventory)
      if (order.order_items && order.order_items.length > 0) {
        const performedBy = userId || order.cashier_id || '';
        
        try {
          const itemsToDeduct = order.order_items.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            item_name: item.item_name || 'Unknown',
          }));

          console.log(
            `📦 [OrderService.confirmOrder] Deducting stock for ${order.order_items.length} items:`,
            itemsToDeduct.map((i: any) => 
              `${i.item_name} (${i.product_id ? 'Product: ' + i.product_id.substring(0, 8) + '...' : 'Package'}) x${i.quantity}`
            ).join(', ')
          );
          
          await StockDeduction.deductForOrder(
            orderId,
            order.order_items.map((item: any) => ({
              product_id: item.product_id,
              quantity: item.quantity,
            })),
            performedBy
          );
          
          console.log(`✅ [OrderService.confirmOrder] Stock deducted successfully (inventory reserved)`);
        } catch (stockError) {
          // If stock deduction fails, don't confirm the order
          console.error('❌ [OrderService.confirmOrder] Stock deduction failed:', stockError);
          throw new AppError(
            `Cannot confirm order: Stock deduction failed. ${stockError instanceof Error ? stockError.message : 'Unknown error'}`,
            400
          );
        }
      }

      // Step 4: Mark order as confirmed
      const confirmedOrder = await OrderRepository.updateStatus(orderId, OrderStatus.CONFIRMED);
      console.log(`✅ [OrderService.confirmOrder] Order marked as CONFIRMED`);

      // Step 5: Route order items to kitchen/bartender
      if (order.order_items && order.order_items.length > 0) {
        console.log(`🍳 [OrderService.confirmOrder] Routing ${order.order_items.length} items to kitchen/bartender...`);
        
        try {
          await KitchenRouting.routeOrder(orderId, order.order_items);
          console.log(`✅ [OrderService.confirmOrder] Kitchen routing completed successfully`);
        } catch (routingError) {
          // Log error but don't fail the order confirmation
          console.error('⚠️  [OrderService.confirmOrder] Kitchen routing failed (non-fatal):', routingError);
          console.warn('⚠️  [OrderService.confirmOrder] Order is confirmed but kitchen may not receive items');
        }
      } else {
        console.warn('⚠️  [OrderService.confirmOrder] No order items to route');
      }

      console.log(`🎉 [OrderService.confirmOrder] Order ${orderId} confirmed and sent to kitchen`);
      return confirmedOrder;
    } catch (error) {
      console.error('❌ [OrderService.confirmOrder] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to confirm order', 500);
    }
  }

  /**
   * Complete order (mark as completed after payment)
   * This is called when payment is processed
   * 
   * IMPORTANT: Stock is NOT deducted here!
   * Stock is already deducted when order was CONFIRMED.
   * This method only marks the order as paid/completed.
   * 
   * Flow:
   * 1. Validate order exists
   * 2. Mark order as completed
   * 3. Update payment details
   * 
   * Note: Kitchen routing and stock deduction happened on CONFIRMED status
   * 
   * @param orderId - Order ID to complete
   * @param userId - ID of user completing the order (for audit trail)
   * @returns Completed order
   */
  static async completeOrder(orderId: string, userId?: string): Promise<Order> {
    try {
      console.log(`🎯 [OrderService.completeOrder] Completing order ${orderId}`);
      
      // Get order with items
      const order = await OrderRepository.getById(orderId);
      
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Can complete orders in various states (confirmed, served, pending)
      if (order.status === OrderStatus.COMPLETED) {
        throw new AppError('Order is already completed', 400);
      }

      if (order.status === OrderStatus.VOIDED) {
        throw new AppError('Cannot complete voided order', 400);
      }

      console.log(`✅ [OrderService.completeOrder] Order validated with ${order.order_items?.length || 0} items`);

      // Mark order as completed
      const completedOrder = await OrderRepository.updateStatus(orderId, OrderStatus.COMPLETED);
      console.log(`✅ [OrderService.completeOrder] Order marked as COMPLETED`);

      // Stock was already deducted when order was CONFIRMED
      // No stock changes needed here
      console.log(`ℹ️  [OrderService.completeOrder] Stock was already deducted at confirmation time`);

      console.log(`🎉 [OrderService.completeOrder] Order ${orderId} completed successfully`);
      return completedOrder;
    } catch (error) {
      console.error('❌ [OrderService.completeOrder] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to complete order', 500);
    }
  }

  /**
   * Put order on hold
   */
  static async holdOrder(orderId: string): Promise<Order> {
    try {
      const order = await OrderRepository.getById(orderId);
      
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new AppError('Can only hold pending orders', 400);
      }

      return await OrderRepository.updateStatus(orderId, OrderStatus.ON_HOLD);
    } catch (error) {
      console.error('Hold order error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to hold order', 500);
    }
  }

  /**
   * Resume order from hold
   */
  static async resumeOrder(orderId: string): Promise<Order> {
    try {
      const order = await OrderRepository.getById(orderId);
      
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status !== OrderStatus.ON_HOLD) {
        throw new AppError('Can only resume orders on hold', 400);
      }

      return await OrderRepository.updateStatus(orderId, OrderStatus.PENDING);
    } catch (error) {
      console.error('Resume order error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to resume order', 500);
    }
  }

  /**
   * Get order summary with totals
   * Returns complete order data with customer, cashier, table, and order items for receipt printing
   */
  static async getOrderSummary(orderId: string) {
    try {
      const order = await OrderRepository.getById(orderId);
      
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const itemsCount = order.order_items?.length || 0;
      const totalItems = order.order_items?.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      ) || 0;

      return {
        order,
        summary: {
          itemsCount,
          totalItems,
          subtotal: order.subtotal,
          discountAmount: order.discount_amount,
          taxAmount: order.tax_amount,
          totalAmount: order.total_amount,
        },
      };
    } catch (error) {
      console.error('Get order summary error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get order summary', 500);
    }
  }

  /**
   * Get daily sales total
   */
  static async getDailySalesTotal(date?: Date): Promise<number> {
    try {
      const targetDate = date || new Date();
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).toISOString();
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1).toISOString();

      const orders = await OrderRepository.getByDateRange(startOfDay, endOfDay);
      
      const total = orders
        .filter(order => order.status === OrderStatus.COMPLETED)
        .reduce((sum, order) => sum + (order.total_amount || 0), 0);

      return Math.round(total * 100) / 100;
    } catch (error) {
      console.error('Get daily sales total error:', error);
      return 0;
    }
  }

  /**
   * Validate order before processing
   */
  static validateOrder(orderData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!orderData.items || orderData.items.length === 0) {
      errors.push('Order must have at least one item');
    }

    if (orderData.items) {
      orderData.items.forEach((item: any, index: number) => {
        if (!item.product_id && !item.package_id) {
          errors.push(`Item ${index + 1}: Must have either product_id or package_id`);
        }
        if (item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
        }
        if (item.unit_price < 0) {
          errors.push(`Item ${index + 1}: Unit price cannot be negative`);
        }
      });
    }

    if (orderData.total_amount < 0) {
      errors.push('Total amount cannot be negative');
    }

    if (orderData.payment_method && orderData.amount_tendered) {
      if (orderData.amount_tendered < orderData.total_amount) {
        errors.push('Amount tendered is less than total amount');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
