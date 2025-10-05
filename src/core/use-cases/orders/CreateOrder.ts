import { OrderRepository } from '@/data/repositories/OrderRepository';
import { CustomerRepository } from '@/data/repositories/CustomerRepository';
import { TableRepository } from '@/data/repositories/TableRepository';
import { ProductRepository } from '@/data/repositories/ProductRepository';
import { OrderService } from '@/core/services/orders/OrderService';
import { OrderCalculation } from '@/core/services/orders/OrderCalculation';
import { PricingService } from '@/core/services/pricing/PricingService';
import { KitchenRouting } from '@/core/services/kitchen/KitchenRouting';
import { CreateOrderDTO } from '@/models/dtos/CreateOrderDTO';
import { AppError } from '@/lib/errors/AppError';

/**
 * CreateOrder Use Case
 * Orchestrates the entire order creation flow
 */
export class CreateOrder {
  /**
   * Execute order creation
   */
  static async execute(dto: CreateOrderDTO, cashierId: string) {
    try {
      // Debug: Log incoming order data
      console.log('🔍 [CreateOrder] Received DTO:', {
        table_id: dto.table_id,
        customer_id: dto.customer_id,
        items_count: dto.items?.length,
        payment_method: dto.payment_method
      });
      // Step 1: Validate order
      const validation = OrderService.validateOrder(dto);
      if (!validation.isValid) {
        throw new AppError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Step 2: Get customer if provided (customer is optional for orders)
      let customer = null;
      if (dto.customer_id) {
        try {
          customer = await CustomerRepository.getById(dto.customer_id);
          if (!customer) {
            // Customer not found - log warning but continue without customer
            console.warn(`Customer ${dto.customer_id} not found, creating order without customer`);
            dto.customer_id = undefined; // Clear invalid customer ID
          }
        } catch (error) {
          // Error fetching customer - log but continue
          console.error('Error fetching customer:', error);
          dto.customer_id = undefined;
          customer = null;
        }
      }

      // Step 3: Validate table if provided (table is optional for orders)
      if (dto.table_id) {
        try {
          // Use supabaseAdmin to bypass RLS when validating table
          const { supabaseAdmin } = await import('@/data/supabase/server-client');
          const table = await TableRepository.getById(dto.table_id, supabaseAdmin);
          if (!table) {
            // Table not found - log warning but continue without table
            console.warn(`⚠️ [CreateOrder] Table ${dto.table_id} not found, creating order without table`);
            dto.table_id = undefined; // Clear invalid table ID
          } else {
            console.log(`✅ [CreateOrder] Table validation passed:`, {
              table_id: table.id,
              table_number: table.table_number,
              current_status: table.status
            });
          }
        } catch (error) {
          // Error fetching table - log but continue
          console.error('❌ [CreateOrder] Error fetching table:', error);
          dto.table_id = undefined;
        }
      }

      // Step 4: Process order items with pricing
      const processedItems = await this.processOrderItems(dto.items, customer);

      // Step 5: Calculate order totals
      const calculations = this.calculateOrderTotals(
        processedItems,
        dto.discount_amount,
        dto.discount_type
      );

      // Step 6: Prepare order data
      const orderData = {
        customer_id: dto.customer_id || null,
        cashier_id: cashierId,
        table_id: dto.table_id || null,
        subtotal: calculations.subtotal,
        discount_amount: calculations.discountAmount,
        tax_amount: calculations.taxAmount,
        total_amount: calculations.totalAmount,
        payment_method: dto.payment_method || null,
        amount_tendered: dto.amount_tendered || null,
        change_amount: dto.change_amount || null,
        order_notes: dto.notes || null,
        applied_event_offer_id: dto.event_offer_id || null,
      };

      // Step 7: Create order
      const order = await OrderRepository.create(orderData, processedItems);

      // Step 8: Update table status to OCCUPIED if assigned
      // This marks the table as occupied and links it to the order
      if (dto.table_id) {
        console.log(`🔍 [CreateOrder] Assigning table ${dto.table_id} to order ${order.id}...`);
        try {
          const updatedTable = await TableRepository.assignOrder(dto.table_id, order.id);
          console.log(`✅ [CreateOrder] Table ${dto.table_id} marked as OCCUPIED for order ${order.id}`);
          console.log(`🔍 [CreateOrder] Updated table status:`, {
            table_id: updatedTable.id,
            status: updatedTable.status,
            current_order_id: updatedTable.current_order_id
          });
        } catch (tableError) {
          // Log error but don't fail the order (order already created)
          console.error('⚠️ [CreateOrder] Table assignment error (non-fatal):', tableError);
          console.warn('⚠️ [CreateOrder] Order created successfully but table status not updated');
        }
      } else {
        console.log('ℹ️ [CreateOrder] No table_id provided, skipping table assignment');
      }

      // Step 9: Update customer stats if customer exists
      if (customer) {
        await CustomerRepository.updateVisitInfo(customer.id, calculations.totalAmount);
      }

      // Step 10: Route order items to kitchen/bartender
      console.log(`🔍 [CreateOrder] Fetching full order details for routing...`);
      const fullOrder = await OrderRepository.getById(order.id);
      
      console.log(`🔍 [CreateOrder] Full order fetched:`, {
        order_id: fullOrder?.id,
        has_order_items: !!fullOrder?.order_items,
        order_items_count: fullOrder?.order_items?.length || 0
      });

      if (fullOrder && fullOrder.order_items && fullOrder.order_items.length > 0) {
        console.log(`🍳 [CreateOrder] Starting kitchen routing for ${fullOrder.order_items.length} items...`);
        try {
          await KitchenRouting.routeOrder(order.id, fullOrder.order_items);
          console.log(`✅ [CreateOrder] Kitchen routing completed successfully`);
        } catch (routingError) {
          // Log error but don't fail the order creation
          console.error('❌ [CreateOrder] Kitchen routing error (non-fatal):', routingError);
          console.error('Stack trace:', routingError);
        }
      } else {
        console.warn('⚠️  [CreateOrder] No order items to route or fullOrder not found');
      }

      // Step 11: Return created order with details
      return fullOrder;
    } catch (error) {
      console.error('Create order error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create order', 500);
    }
  }

  /**
   * Process order items with pricing logic
   */
  private static async processOrderItems(items: any[], customer: any) {
    const processedItems = [];

    for (const item of items) {
      // Get product
      const product = await ProductRepository.getById(item.product_id);
      if (!product) {
        throw new AppError(`Product ${item.product_id} not found`, 404);
      }

      // Get pricing
      const pricing = await PricingService.getProductPrice(
        product,
        customer,
        item.quantity
      );

      // Prepare order item
      const orderItem = {
        product_id: item.product_id,
        package_id: null,
        item_name: product.name,
        quantity: item.quantity,
        unit_price: pricing.unitPrice,
        subtotal: pricing.unitPrice * item.quantity,
        discount_amount: item.discount_amount || 0,
        total: OrderCalculation.calculateOrderItemTotal(
          item.quantity,
          pricing.unitPrice,
          item.discount_amount || 0
        ),
        is_vip_price: pricing.isVIPPrice,
        is_complimentary: item.is_complimentary || false,
        notes: item.notes || null,
      };

      processedItems.push(orderItem);
    }

    return processedItems;
  }

  /**
   * Calculate order totals
   */
  private static calculateOrderTotals(
    items: any[],
    discountAmount?: number,
    discountType?: 'percentage' | 'fixed_amount'
  ) {
    // Calculate subtotal from items
    const subtotal = OrderCalculation.calculateSubtotal(items);

    // Apply order-level discount if provided
    let finalDiscountAmount = 0;
    let discountedSubtotal = subtotal;

    if (discountAmount && discountAmount > 0 && discountType) {
      const discountResult = OrderCalculation.applyDiscount(
        subtotal,
        discountType,
        discountAmount
      );
      finalDiscountAmount = discountResult.discountAmount;
      discountedSubtotal = discountResult.discountedAmount;
    }

    // Calculate tax
    const taxAmount = OrderCalculation.calculateTax(discountedSubtotal);

    // Calculate total
    const totalAmount = OrderCalculation.calculateTotal(
      subtotal,
      finalDiscountAmount,
      taxAmount
    );

    return {
      subtotal,
      discountAmount: finalDiscountAmount,
      taxAmount,
      totalAmount,
    };
  }
}
