import { OrderRepository } from '@/data/repositories/OrderRepository';
import { KitchenOrderRepository } from '@/data/repositories/KitchenOrderRepository';
import { InventoryRepository } from '@/data/repositories/InventoryRepository';
import { StockDeduction } from '@/core/services/inventory/StockDeduction';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * OrderModificationService
 * Professional service for handling order modifications with kitchen integration
 * 
 * Follows industry-standard restaurant POS patterns:
 * - Only allows quantity reduction (no additions after confirmation)
 * - Automatically adjusts inventory (returns excess stock)
 * - Notifies kitchen/bartender of modifications
 * - Creates modification audit trail
 * - Handles edge cases (item already prepared, etc.)
 * 
 * @service
 */
export class OrderModificationService {
  /**
   * Reduce order item quantity
   * 
   * Professional flow:
   * 1. Validate order status (only CONFIRMED orders)
   * 2. Validate new quantity < current quantity (decrease only)
   * 3. Check kitchen order status (warn if already prepared)
   * 4. Calculate stock adjustment (return excess)
   * 5. Update order item quantity
   * 6. Return excess stock to inventory
   * 7. Create/update kitchen notification with MODIFIED flag
   * 8. Log modification in audit trail
   * 
   * @param orderId - Order ID
   * @param itemId - Order item ID to modify
   * @param newQuantity - New quantity (must be less than current)
   * @param modifiedBy - User ID performing modification
   * @param reason - Reason for modification (e.g., "Customer changed mind")
   * @returns Modified order item with notification status
   * @throws AppError if validation fails or item cannot be modified
   */
  static async reduceItemQuantity(
    orderId: string,
    itemId: string,
    newQuantity: number,
    modifiedBy: string,
    reason?: string
  ) {
    try {
      console.log(
        `🔄 [OrderModificationService.reduceItemQuantity] ` +
        `Reducing item ${itemId} in order ${orderId} to ${newQuantity} units`
      );

      // Step 1: Get order and validate status
      const order = await OrderRepository.getById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Only allow modifications on CONFIRMED orders
      // Once preparing/ready/served, kitchen has the item - no modifications
      if (order.status !== 'confirmed') {
        throw new AppError(
          `Cannot modify order in ${order.status} status. Only CONFIRMED orders can be modified.`,
          400
        );
      }

      // Step 2: Get order item and validate
      const item = order.order_items?.find((i: any) => i.id === itemId);
      if (!item) {
        throw new AppError('Order item not found', 404);
      }

      const currentQuantity = item.quantity;

      // Validate new quantity
      if (newQuantity <= 0) {
        throw new AppError('New quantity must be greater than 0. Use remove item to delete.', 400);
      }

      if (newQuantity >= currentQuantity) {
        throw new AppError(
          `New quantity (${newQuantity}) must be less than current quantity (${currentQuantity}). ` +
          `This feature only allows reducing quantities, not increasing them.`,
          400
        );
      }

      const quantityReduction = currentQuantity - newQuantity;

      console.log(
        `📊 [OrderModificationService.reduceItemQuantity] ` +
        `Current: ${currentQuantity}, New: ${newQuantity}, Reduction: ${quantityReduction}`
      );

      // Step 3: Check kitchen order status (warning, not blocking)
      const kitchenOrders = await this.getKitchenOrdersForItem(orderId, itemId);
      const kitchenWarning = this.checkKitchenStatus(kitchenOrders);

      if (kitchenWarning) {
        console.warn(
          `⚠️  [OrderModificationService.reduceItemQuantity] Kitchen warning: ${kitchenWarning}`
        );
      }

      // Step 4: Calculate financial adjustments
      const unitPrice = item.unit_price;
      const amountToRefund = quantityReduction * unitPrice;
      const newSubtotal = newQuantity * unitPrice;
      const newTotal = newSubtotal - (item.discount_amount || 0);

      console.log(
        `💰 [OrderModificationService.reduceItemQuantity] ` +
        `Amount to refund: ${amountToRefund}, New item total: ${newTotal}`
      );

      // Step 5: Update order item in database
      const { data: updatedItem, error: updateError } = await supabaseAdmin
        .from('order_items')
        .update({
          quantity: newQuantity,
          subtotal: newSubtotal,
          total: newTotal,
        })
        .eq('id', itemId)
        .select()
        .single();

      if (updateError) {
        throw new AppError(`Failed to update item: ${updateError.message}`, 500);
      }

      console.log(`✅ [OrderModificationService.reduceItemQuantity] Item quantity updated`);

      // Step 6: Return excess stock to inventory
      if (item.product_id) {
        try {
          await StockDeduction.returnForVoidedOrder(
            orderId,
            [{
              product_id: item.product_id,
              package_id: item.package_id,
              quantity: quantityReduction,
            }],
            modifiedBy
          );
          console.log(
            `✅ [OrderModificationService.reduceItemQuantity] ` +
            `Returned ${quantityReduction} units to stock`
          );
        } catch (stockError) {
          // Log error but don't fail the operation
          console.error(
            `⚠️  [OrderModificationService.reduceItemQuantity] ` +
            `Stock return failed: ${stockError}. Manual adjustment required.`
          );
        }
      }

      // Step 7: Notify kitchen/bartender of modification
      const notificationResult = await this.notifyKitchenOfModification(
        orderId,
        itemId,
        item.item_name,
        currentQuantity,
        newQuantity,
        kitchenOrders
      );

      console.log(
        `📢 [OrderModificationService.reduceItemQuantity] ` +
        `Kitchen notification: ${notificationResult.message}`
      );

      // Step 8: Recalculate order and session totals (CRITICAL for sales reliability)
      await this.recalculateOrderTotals(orderId);
      console.log(
        `💰 [OrderModificationService.reduceItemQuantity] ` +
        `Order and session totals recalculated`
      );

      // Step 9: Log modification in audit trail
      await this.logModification({
        order_id: orderId,
        order_item_id: itemId,
        modification_type: 'quantity_reduced',
        old_value: currentQuantity.toString(),
        new_value: newQuantity.toString(),
        amount_adjusted: amountToRefund,
        modified_by: modifiedBy,
        reason: reason || 'Customer request',
        kitchen_status: kitchenWarning || 'Item not yet in preparation',
      });

      return {
        success: true,
        item: updatedItem,
        reduction: quantityReduction,
        refundAmount: amountToRefund,
        kitchenNotification: notificationResult,
        kitchenWarning,
      };
    } catch (error) {
      console.error('❌ [OrderModificationService.reduceItemQuantity] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to reduce item quantity', 500);
    }
  }

  /**
   * Remove order item completely
   * 
   * Similar to reduceItemQuantity but removes entire item
   * 
   * @param orderId - Order ID
   * @param itemId - Order item ID to remove
   * @param removedBy - User ID performing removal
   * @param reason - Reason for removal
   * @returns Removal result with refund details
   */
  static async removeOrderItem(
    orderId: string,
    itemId: string,
    removedBy: string,
    reason?: string
  ) {
    try {
      console.log(
        `🗑️  [OrderModificationService.removeOrderItem] ` +
        `Removing item ${itemId} from order ${orderId}`
      );

      // Get order and validate
      const order = await OrderRepository.getById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status !== 'confirmed') {
        throw new AppError(
          `Cannot remove items from order in ${order.status} status`,
          400
        );
      }

      // Get item
      const item = order.order_items?.find((i: any) => i.id === itemId);
      if (!item) {
        throw new AppError('Order item not found', 404);
      }

      // Check if last item
      if (order.order_items?.length === 1) {
        throw new AppError(
          'Cannot remove last item. Please void the entire order instead.',
          400
        );
      }

      // Check kitchen status
      const kitchenOrders = await this.getKitchenOrdersForItem(orderId, itemId);
      const kitchenWarning = this.checkKitchenStatus(kitchenOrders);

      // Delete order item
      const { error: deleteError } = await supabaseAdmin
        .from('order_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) {
        throw new AppError(`Failed to delete item: ${deleteError.message}`, 500);
      }

      console.log(`✅ [OrderModificationService.removeOrderItem] Item deleted`);

      // Return stock
      if (item.product_id || item.package_id) {
        try {
          await StockDeduction.returnForVoidedOrder(
            orderId,
            [{
              product_id: item.product_id,
              package_id: item.package_id,
              quantity: item.quantity,
            }],
            removedBy
          );
        } catch (stockError) {
          console.error(`⚠️  Stock return failed:`, stockError);
        }
      }

      // Cancel kitchen orders
      if (kitchenOrders.length > 0) {
        await this.cancelKitchenOrders(kitchenOrders, `Item removed: ${reason || 'Customer request'}`);
      }

      // Recalculate order and session totals (CRITICAL for sales reliability)
      await this.recalculateOrderTotals(orderId);
      console.log(
        `💰 [OrderModificationService.removeOrderItem] ` +
        `Order and session totals recalculated`
      );

      // Log modification
      await this.logModification({
        order_id: orderId,
        order_item_id: itemId,
        modification_type: 'item_removed',
        old_value: `${item.quantity}x ${item.item_name}`,
        new_value: 'removed',
        amount_adjusted: item.total,
        modified_by: removedBy,
        reason: reason || 'Customer request',
        kitchen_status: kitchenWarning || 'Item removed',
      });

      return {
        success: true,
        refundAmount: item.total,
        kitchenWarning,
      };
    } catch (error) {
      console.error('❌ [OrderModificationService.removeOrderItem] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to remove item', 500);
    }
  }

  /**
   * Get kitchen orders for a specific order item
   */
  private static async getKitchenOrdersForItem(orderId: string, itemId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('kitchen_orders')
        .select('*')
        .eq('order_id', orderId)
        .eq('order_item_id', itemId);

      if (error) {
        console.error('Error fetching kitchen orders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getKitchenOrdersForItem:', error);
      return [];
    }
  }

  /**
   * Check kitchen/bartender order status and return warning if item is being prepared
   * Works for both kitchen and bartender stations
   */
  private static checkKitchenStatus(kitchenOrders: any[]): string | null {
    if (kitchenOrders.length === 0) {
      return null;
    }

    const preparing = kitchenOrders.filter(ko => ko.status === 'preparing');
    const ready = kitchenOrders.filter(ko => ko.status === 'ready');
    const completed = kitchenOrders.filter(ko => ko.status === 'completed');

    if (completed.length > 0) {
      return 'Item already completed at station - may have been served';
    }
    if (ready.length > 0) {
      return 'Item is ready - already prepared at station';
    }
    if (preparing.length > 0) {
      return 'Item is currently being prepared at station';
    }

    return null; // Still pending, safe to modify
  }

  /**
   * Notify kitchen/bartender of quantity modification
   * 
   * IMPORTANT: This works for BOTH kitchen AND bartender stations!
   * The system uses the 'destination' field from the original order:
   * - 'kitchen' → Notification goes to kitchen display
   * - 'bartender' → Notification goes to bartender display
   * - 'both' → Notification goes to BOTH displays
   * 
   * Creates new kitchen_order with MODIFIED flag and updated quantity
   * Note: kitchen_orders table is used for BOTH kitchen and bartender
   */
  private static async notifyKitchenOfModification(
    orderId: string,
    itemId: string,
    itemName: string,
    oldQuantity: number,
    newQuantity: number,
    existingKitchenOrders: any[]
  ) {
    try {
      // Cancel existing pending kitchen orders
      const pendingOrders = existingKitchenOrders.filter(ko => ko.status === 'pending');
      
      if (pendingOrders.length > 0) {
        // Update existing pending orders to cancelled status
        await supabaseAdmin
          .from('kitchen_orders')
          .update({
            status: 'cancelled',
            special_instructions: `CANCELLED - Quantity reduced from ${oldQuantity} to ${newQuantity}`,
            updated_at: new Date().toISOString(),
          })
          .in('id', pendingOrders.map(po => po.id));
      }

      // If item is being prepared or ready, create new MODIFIED order
      const activeOrders = existingKitchenOrders.filter(ko => 
        ko.status === 'preparing' || ko.status === 'ready'
      );

      if (activeOrders.length > 0) {
        // Get destination from existing order (kitchen/bartender/both)
        const destination = activeOrders[0].destination;
        
        // Log which station(s) are being notified
        console.log(
          `📢 [OrderModificationService] Notifying ${destination} station(s) of modification`
        );

        // Create new modified order - goes to kitchen/bartender/both based on destination
        await KitchenOrderRepository.create({
          order_id: orderId,
          order_item_id: itemId,
          product_name: itemName,
          destination, // Preserves original destination (kitchen/bartender/both)
          special_instructions: `⚠️ MODIFIED: Changed from ${oldQuantity} to ${newQuantity} units`,
          is_urgent: true, // Mark as urgent so station sees it immediately
        });

        return {
          message: `${destination === 'both' ? 'Kitchen and Bartender' : destination === 'bartender' ? 'Bartender' : 'Kitchen'} notified: New order created with MODIFIED flag`,
          action: 'new_order_created',
          destination: destination,
        };
      }

      return {
        message: 'Pending orders cancelled',
        action: 'cancelled_pending',
      };
    } catch (error) {
      console.error('Error notifying kitchen/bartender:', error);
      return {
        message: 'Failed to notify kitchen',
        action: 'error',
      };
    }
  }

  /**
   * Cancel kitchen orders
   */
  private static async cancelKitchenOrders(kitchenOrders: any[], reason: string) {
    try {
      // Cancel kitchen/bartender orders
      await supabaseAdmin
        .from('kitchen_orders')
        .update({
          status: 'cancelled',
          special_instructions: reason,
          updated_at: new Date().toISOString(),
        })
        .in('id', kitchenOrders.map(ko => ko.id));
    } catch (error) {
      console.error('Error cancelling kitchen orders:', error);
    }
  }

  /**
   * Recalculate order totals from order items
   * Updates orders table which triggers session total update via database trigger
   * 
   * CRITICAL: This ensures sales data integrity when items are modified
   * 
   * @param orderId - Order ID to recalculate
   */
  private static async recalculateOrderTotals(orderId: string): Promise<void> {
    try {
      console.log(
        `🧮 [OrderModificationService.recalculateOrderTotals] ` +
        `Recalculating totals for order ${orderId}`
      );

      // Get all order items for this order
      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('subtotal, discount_amount, total')
        .eq('order_id', orderId);

      if (itemsError) {
        throw new AppError(`Failed to fetch order items: ${itemsError.message}`, 500);
      }

      if (!orderItems || orderItems.length === 0) {
        console.warn(
          `⚠️  [OrderModificationService.recalculateOrderTotals] ` +
          `No items found for order ${orderId}`
        );
        return;
      }

      // Calculate new totals from items
      const newSubtotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const newDiscountAmount = orderItems.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
      const newTotalAmount = orderItems.reduce((sum, item) => sum + (item.total || 0), 0);

      console.log(
        `🧮 [OrderModificationService.recalculateOrderTotals] ` +
        `New totals - Subtotal: ${newSubtotal}, Discount: ${newDiscountAmount}, Total: ${newTotalAmount}`
      );

      // Update order totals
      // This will trigger the database trigger to update session totals automatically
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          subtotal: newSubtotal,
          discount_amount: newDiscountAmount,
          total_amount: newTotalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        throw new AppError(`Failed to update order totals: ${updateError.message}`, 500);
      }

      console.log(
        `✅ [OrderModificationService.recalculateOrderTotals] ` +
        `Order totals updated. Session totals will be updated automatically by database trigger.`
      );
    } catch (error) {
      console.error(
        `❌ [OrderModificationService.recalculateOrderTotals] Error:`,
        error
      );
      // Re-throw to ensure the calling function knows about the failure
      throw error instanceof AppError
        ? error
        : new AppError('Failed to recalculate order totals', 500);
    }
  }

  /**
   * Log modification in audit trail
   */
  private static async logModification(modification: {
    order_id: string;
    order_item_id: string;
    modification_type: string;
    old_value: string;
    new_value: string;
    amount_adjusted: number;
    modified_by: string;
    reason: string;
    kitchen_status: string;
  }) {
    try {
      // Log to audit trail (table created by migration)
      await (supabaseAdmin as any)
        .from('order_modifications')
        .insert({
          ...modification,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to log modification:', error);
    }
  }
}
