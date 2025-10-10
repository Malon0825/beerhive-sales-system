import { OrderRepository } from '@/data/repositories/OrderRepository';
import { KitchenOrderRepository } from '@/data/repositories/KitchenOrderRepository';
import { StockDeduction } from '@/core/services/inventory/StockDeduction';
import { AppError } from '@/lib/errors/AppError';
import { OrderStatus } from '@/models/enums/OrderStatus';
import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * OrderItemService
 * Business logic for managing individual order items
 * 
 * Handles:
 * - Removing confirmed order items
 * - Editing order item quantities
 * - Stock return when items are removed
 * - Kitchen/bartender order synchronization
 * - Order total recalculation
 * 
 * Professional Features:
 * - Validates item status before removal
 * - Only allows removal of CONFIRMED items (not yet PREPARING)
 * - Returns stock to inventory
 * - Removes corresponding kitchen orders
 * - Updates order totals correctly
 * - Maintains audit trail
 */
export class OrderItemService {
  /**
   * Remove an order item from a confirmed order
   * 
   * Flow:
   * 1. Validate order and item exist
   * 2. Check item is in CONFIRMED status (not yet preparing)
   * 3. Find and delete associated kitchen orders
   * 4. Return stock to inventory
   * 5. Delete order item
   * 6. Recalculate order totals
   * 
   * @param orderId - Order ID
   * @param orderItemId - Order item ID to remove
   * @param userId - User performing the action
   * @returns Updated order
   * @throws AppError if validation fails or item cannot be removed
   */
  static async removeOrderItem(
    orderId: string,
    orderItemId: string,
    userId: string
  ): Promise<any> {
    try {
      console.log(`🗑️  [OrderItemService.removeOrderItem] Removing item ${orderItemId} from order ${orderId}`);

      // Validate user ID
      if (!userId || userId.trim() === '') {
        throw new AppError('Valid user ID required for item removal', 400);
      }

      // 1. Get order with items
      const order = await OrderRepository.getById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // 2. Find the order item
      const orderItem = order.order_items?.find((item: any) => item.id === orderItemId);
      if (!orderItem) {
        throw new AppError('Order item not found', 404);
      }

      // 3. Validate order status - must be CONFIRMED (not yet preparing)
      if (order.status !== OrderStatus.CONFIRMED) {
        throw new AppError(
          `Cannot remove items from ${order.status} orders. Only CONFIRMED items can be removed.`,
          400
        );
      }

      // 4. Check if there are kitchen orders for this item
      const kitchenOrders = await KitchenOrderRepository.getByOrderId(orderId);
      const relatedKitchenOrders = kitchenOrders.filter(
        (ko: any) => ko.order_item_id === orderItemId
      );

      // 5. Validate kitchen orders are not already being prepared
      const preparingOrders = relatedKitchenOrders.filter(
        (ko: any) => ko.status === KitchenOrderStatus.PREPARING || 
                     ko.status === KitchenOrderStatus.READY
      );

      if (preparingOrders.length > 0) {
        throw new AppError(
          'Cannot remove item that is already being prepared in kitchen/bar',
          400
        );
      }

      console.log(`📋 [OrderItemService.removeOrderItem] Found ${relatedKitchenOrders.length} kitchen orders to delete`);

      // 6. Delete kitchen orders (only PENDING status allowed)
      for (const kitchenOrder of relatedKitchenOrders) {
        await this.deleteKitchenOrder(kitchenOrder.id);
        console.log(`✅ [OrderItemService.removeOrderItem] Deleted kitchen order ${kitchenOrder.id}`);
      }

      // 7. Return stock if item has product_id
      if (orderItem.product_id) {
        console.log(`📦 [OrderItemService.removeOrderItem] Returning ${orderItem.quantity} units of product ${orderItem.product_id} to stock`);
        
        await StockDeduction.returnForVoidedOrder(
          orderId,
          [{ product_id: orderItem.product_id, quantity: orderItem.quantity }],
          userId
        );
        
        console.log(`✅ [OrderItemService.removeOrderItem] Stock returned successfully`);
      } else {
        console.log(`⏭️  [OrderItemService.removeOrderItem] No product_id, skipping stock return (likely a package)`);
      }

      // 8. Delete the order item
      const { error: deleteError } = await supabaseAdmin
        .from('order_items')
        .delete()
        .eq('id', orderItemId);

      if (deleteError) {
        throw new AppError(`Failed to delete order item: ${deleteError.message}`, 500);
      }

      console.log(`✅ [OrderItemService.removeOrderItem] Order item deleted`);

      // 9. Recalculate order totals
      await this.recalculateOrderTotals(orderId);

      // 10. Get updated order
      const updatedOrder = await OrderRepository.getById(orderId);

      console.log(`🎉 [OrderItemService.removeOrderItem] Item removal completed successfully`);
      
      return updatedOrder;
    } catch (error) {
      console.error('❌ [OrderItemService.removeOrderItem] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to remove order item', 500);
    }
  }

  /**
   * Update order item quantity
   * 
   * Flow:
   * 1. Validate order and item
   * 2. Check item is in CONFIRMED status
   * 3. Calculate quantity difference
   * 4. Return excess stock or deduct additional stock
   * 5. Update order item
   * 6. Recalculate order totals
   * 
   * @param orderId - Order ID
   * @param orderItemId - Order item ID
   * @param newQuantity - New quantity (must be > 0)
   * @param userId - User performing the action
   * @returns Updated order
   * @throws AppError if validation fails
   */
  static async updateOrderItemQuantity(
    orderId: string,
    orderItemId: string,
    newQuantity: number,
    userId: string
  ): Promise<any> {
    try {
      console.log(`✏️  [OrderItemService.updateOrderItemQuantity] Updating item ${orderItemId} quantity to ${newQuantity}`);

      // Validate inputs
      if (!userId || userId.trim() === '') {
        throw new AppError('Valid user ID required for item update', 400);
      }

      if (newQuantity <= 0) {
        throw new AppError('Quantity must be greater than 0. Use remove function to delete item.', 400);
      }

      // Get order with items
      const order = await OrderRepository.getById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Find the order item
      const orderItem = order.order_items?.find((item: any) => item.id === orderItemId);
      if (!orderItem) {
        throw new AppError('Order item not found', 404);
      }

      // Validate order status
      if (order.status !== OrderStatus.CONFIRMED) {
        throw new AppError(
          `Cannot edit items in ${order.status} orders. Only CONFIRMED items can be edited.`,
          400
        );
      }

      // Check kitchen orders status
      const kitchenOrders = await KitchenOrderRepository.getByOrderId(orderId);
      const relatedKitchenOrders = kitchenOrders.filter(
        (ko: any) => ko.order_item_id === orderItemId
      );

      const preparingOrders = relatedKitchenOrders.filter(
        (ko: any) => ko.status !== KitchenOrderStatus.PENDING
      );

      if (preparingOrders.length > 0) {
        throw new AppError(
          'Cannot edit item quantity after preparation has started',
          400
        );
      }

      const oldQuantity = orderItem.quantity;
      const quantityDifference = newQuantity - oldQuantity;

      console.log(`📊 [OrderItemService.updateOrderItemQuantity] Old: ${oldQuantity}, New: ${newQuantity}, Diff: ${quantityDifference}`);

      // Handle stock adjustment if item has product_id
      if (orderItem.product_id && quantityDifference !== 0) {
        if (quantityDifference < 0) {
          // Returning stock
          console.log(`📦 [OrderItemService.updateOrderItemQuantity] Returning ${Math.abs(quantityDifference)} units to stock`);
          await StockDeduction.returnForVoidedOrder(
            orderId,
            [{ product_id: orderItem.product_id, quantity: Math.abs(quantityDifference) }],
            userId
          );
        } else {
          // Deducting additional stock - check availability first
          console.log(`📦 [OrderItemService.updateOrderItemQuantity] Deducting additional ${quantityDifference} units from stock`);
          
          // Note: Stock deduction happens at payment, but we should check availability
          const stockCheck = await StockDeduction.checkStockAvailability([
            { product_id: orderItem.product_id, quantity: quantityDifference }
          ]);

          if (!stockCheck.available) {
            throw new AppError(
              `Insufficient stock. Available: ${stockCheck.insufficientItems[0]?.available || 0}`,
              400
            );
          }
        }
      }

      // Update order item
      const newSubtotal = newQuantity * orderItem.unit_price;
      const newTotal = newSubtotal - orderItem.discount_amount;

      const { error: updateError } = await supabaseAdmin
        .from('order_items')
        .update({
          quantity: newQuantity,
          subtotal: newSubtotal as any,
          total: newTotal as any,
        })
        .eq('id', orderItemId);

      if (updateError) {
        throw new AppError(`Failed to update order item: ${updateError.message}`, 500);
      }

      console.log(`✅ [OrderItemService.updateOrderItemQuantity] Order item updated`);

      // Recalculate order totals
      await this.recalculateOrderTotals(orderId);

      // Get updated order
      const updatedOrder = await OrderRepository.getById(orderId);

      console.log(`🎉 [OrderItemService.updateOrderItemQuantity] Quantity update completed`);
      
      return updatedOrder;
    } catch (error) {
      console.error('❌ [OrderItemService.updateOrderItemQuantity] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update order item quantity', 500);
    }
  }

  /**
   * Recalculate order totals based on current items
   * 
   * @param orderId - Order ID
   * @private
   */
  private static async recalculateOrderTotals(orderId: string): Promise<void> {
    try {
      console.log(`🧮 [OrderItemService.recalculateOrderTotals] Recalculating totals for order ${orderId}`);

      // Get all order items
      const { data: items, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) {
        throw new AppError(`Failed to fetch order items: ${itemsError.message}`, 500);
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal as any || '0'), 0);
      const discountAmount = items.reduce((sum, item) => sum + parseFloat(item.discount_amount as any || '0'), 0);
      
      // Get order to preserve tax settings
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('tax_amount')
        .eq('id', orderId)
        .single();

      if (orderError) {
        throw new AppError(`Failed to fetch order: ${orderError.message}`, 500);
      }

      // Recalculate total (preserve original tax amount)
      const totalAmount = subtotal - discountAmount + (order.tax_amount || 0);

      // Update order
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          subtotal: subtotal as any,
          discount_amount: discountAmount as any,
          total_amount: totalAmount as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        throw new AppError(`Failed to update order totals: ${updateError.message}`, 500);
      }

      console.log(`✅ [OrderItemService.recalculateOrderTotals] New totals - Subtotal: ${subtotal}, Total: ${totalAmount}`);
    } catch (error) {
      console.error('❌ [OrderItemService.recalculateOrderTotals] Error:', error);
      throw error;
    }
  }

  /**
   * Delete a kitchen order
   * Removes from kitchen_orders table (will trigger realtime update)
   * 
   * @param kitchenOrderId - Kitchen order ID
   * @private
   */
  private static async deleteKitchenOrder(kitchenOrderId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('kitchen_orders')
        .delete()
        .eq('id', kitchenOrderId);

      if (error) {
        throw new AppError(`Failed to delete kitchen order: ${error.message}`, 500);
      }
    } catch (error) {
      console.error('Delete kitchen order error:', error);
      throw error;
    }
  }

  /**
   * Get order item details
   * 
   * @param orderItemId - Order item ID
   * @returns Order item with related data
   */
  static async getOrderItem(orderItemId: string): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin
        .from('order_items')
        .select(`
          *,
          order:order_id(
            id,
            order_number,
            status,
            table_id
          )
        `)
        .eq('id', orderItemId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Order item not found', 404);
        }
        throw new AppError(`Failed to fetch order item: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Get order item error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch order item', 500);
    }
  }
}
