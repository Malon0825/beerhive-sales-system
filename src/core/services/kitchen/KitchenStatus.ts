import { KitchenOrderRepository } from '@/data/repositories/KitchenOrderRepository';
import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { UpdateKitchenOrderStatusInput } from '@/models/entities/KitchenOrder';
import { AppError } from '@/lib/errors/AppError';

/**
 * KitchenStatus Service
 * Manages kitchen order status transitions
 */
export class KitchenStatus {
  /**
   * Update kitchen order status
   */
  static async updateStatus(
    kitchenOrderId: string,
    status: KitchenOrderStatus,
    userId?: string,
    notes?: string
  ): Promise<any> {
    try {
      const statusUpdate: UpdateKitchenOrderStatusInput = {
        status,
        preparation_notes: notes,
      };

      return await KitchenOrderRepository.updateStatus(
        kitchenOrderId,
        statusUpdate,
        userId
      );
    } catch (error) {
      console.error('Error updating kitchen order status:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update status', 500);
    }
  }

  /**
   * Mark order as preparing
   */
  static async markPreparing(kitchenOrderId: string, userId?: string): Promise<any> {
    try {
      // Validate that current status is PENDING
      const currentOrder = await KitchenOrderRepository.getById(kitchenOrderId);
      
      if (!currentOrder) {
        throw new AppError('Kitchen order not found', 404);
      }

      if (currentOrder.status !== KitchenOrderStatus.PENDING) {
        throw new AppError(
          `Cannot start preparing. Current status is ${currentOrder.status}`,
          400
        );
      }

      return await KitchenOrderRepository.markPreparing(kitchenOrderId, userId);
    } catch (error) {
      console.error('Error marking as preparing:', error);
      throw error instanceof AppError ? error : new AppError('Failed to mark as preparing', 500);
    }
  }

  /**
   * Mark order as ready
   */
  static async markReady(kitchenOrderId: string, notes?: string): Promise<any> {
    try {
      // Validate that current status is PREPARING
      const currentOrder = await KitchenOrderRepository.getById(kitchenOrderId);
      
      if (!currentOrder) {
        throw new AppError('Kitchen order not found', 404);
      }

      if (currentOrder.status !== KitchenOrderStatus.PREPARING) {
        throw new AppError(
          `Cannot mark as ready. Current status is ${currentOrder.status}`,
          400
        );
      }

      return await KitchenOrderRepository.markReady(kitchenOrderId, notes);
    } catch (error) {
      console.error('Error marking as ready:', error);
      throw error instanceof AppError ? error : new AppError('Failed to mark as ready', 500);
    }
  }

  /**
   * Mark order as served
   */
  static async markServed(kitchenOrderId: string): Promise<any> {
    try {
      // Validate that current status is READY
      const currentOrder = await KitchenOrderRepository.getById(kitchenOrderId);
      
      if (!currentOrder) {
        throw new AppError('Kitchen order not found', 404);
      }

      if (currentOrder.status !== KitchenOrderStatus.READY) {
        throw new AppError(
          `Cannot mark as served. Current status is ${currentOrder.status}`,
          400
        );
      }

      return await KitchenOrderRepository.markServed(kitchenOrderId);
    } catch (error) {
      console.error('Error marking as served:', error);
      throw error instanceof AppError ? error : new AppError('Failed to mark as served', 500);
    }
  }

  /**
   * Get all kitchen orders for kitchen station
   */
  static async getKitchenOrders(): Promise<any[]> {
    try {
      return await KitchenOrderRepository.getActive('kitchen');
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch kitchen orders', 500);
    }
  }

  /**
   * Get all orders for bartender station
   */
  static async getBartenderOrders(): Promise<any[]> {
    try {
      return await KitchenOrderRepository.getActive('bartender');
    } catch (error) {
      console.error('Error fetching bartender orders:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch bartender orders', 500);
    }
  }

  /**
   * Get order preparation time stats
   */
  static async getPreparationStats(kitchenOrderId: string): Promise<{
    totalTime: number | null;
    preparingTime: number | null;
    waitingTime: number | null;
  }> {
    try {
      const order = await KitchenOrderRepository.getById(kitchenOrderId);
      
      if (!order) {
        throw new AppError('Kitchen order not found', 404);
      }

      const sentAt = new Date(order.sent_at);
      const startedAt = order.started_at ? new Date(order.started_at) : null;
      const readyAt = order.ready_at ? new Date(order.ready_at) : null;
      const servedAt = order.served_at ? new Date(order.served_at) : null;

      // Calculate times in minutes
      const totalTime = servedAt 
        ? Math.round((servedAt.getTime() - sentAt.getTime()) / 60000)
        : null;

      const preparingTime = startedAt && readyAt
        ? Math.round((readyAt.getTime() - startedAt.getTime()) / 60000)
        : null;

      const waitingTime = readyAt && servedAt
        ? Math.round((servedAt.getTime() - readyAt.getTime()) / 60000)
        : null;

      return {
        totalTime,
        preparingTime,
        waitingTime,
      };
    } catch (error) {
      console.error('Error calculating preparation stats:', error);
      throw error instanceof AppError ? error : new AppError('Failed to calculate stats', 500);
    }
  }

  /**
   * Validate status transition
   */
  private static isValidTransition(
    currentStatus: KitchenOrderStatus,
    newStatus: KitchenOrderStatus
  ): boolean {
    const validTransitions: Record<KitchenOrderStatus, KitchenOrderStatus[]> = {
      [KitchenOrderStatus.PENDING]: [KitchenOrderStatus.PREPARING],
      [KitchenOrderStatus.PREPARING]: [KitchenOrderStatus.READY],
      [KitchenOrderStatus.READY]: [KitchenOrderStatus.SERVED],
      [KitchenOrderStatus.SERVED]: [], // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}
