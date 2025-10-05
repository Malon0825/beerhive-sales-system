import { OrderRepository } from '@/data/repositories/OrderRepository';
import { Order } from '@/models/entities/Order';
import { OrderStatus } from '@/models/enums/OrderStatus';
import { AppError } from '@/lib/errors/AppError';

/**
 * OrderService
 * Business logic for order management
 */
export class OrderService {
  /**
   * Complete order (mark as completed)
   */
  static async completeOrder(orderId: string): Promise<Order> {
    try {
      const order = await OrderRepository.getById(orderId);
      
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new AppError(`Cannot complete order with status: ${order.status}`, 400);
      }

      return await OrderRepository.updateStatus(orderId, OrderStatus.COMPLETED);
    } catch (error) {
      console.error('Complete order error:', error);
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
