import { OrderRepository } from '@/data/repositories/OrderRepository';
import { CustomerRepository } from '@/data/repositories/CustomerRepository';
import { TableRepository } from '@/data/repositories/TableRepository';
import { ProductRepository } from '@/data/repositories/ProductRepository';
import { PackageRepository } from '@/data/repositories/PackageRepository';
import { OrderService } from '@/core/services/orders/OrderService';
import { OrderCalculation } from '@/core/services/orders/OrderCalculation';
import { PricingService } from '@/core/services/pricing/PricingService';
import { StockValidationService } from '@/core/services/inventory/StockValidationService';
import { CreateOrderDTO } from '@/models/dtos/CreateOrderDTO';
import { AppError } from '@/lib/errors/AppError';

/**
 * CreateOrder Use Case
 * Orchestrates the entire order creation flow
 * 
 * Supports two modes:
 * 1. Standalone orders: Traditional direct-payment orders (no session)
 * 2. Session-based orders: Tab orders linked to an order session
 * 
 * For session-based orders:
 * - Order is linked to session via session_id
 * - Database triggers automatically update session totals
 * - Table assignment is handled by the session (not individual orders)
 * - Orders start in DRAFT status and are confirmed separately
 */
export class CreateOrder {
  /**
   * Execute order creation
   * 
   * @param dto - Order data transfer object
   * @param cashierId - ID of the cashier creating the order
   * @returns Created order with full details
   * @throws AppError if validation fails or creation errors occur
   */
  static async execute(dto: CreateOrderDTO, cashierId: string) {
    try {
      // Debug: Log incoming order data
      console.log('🔍 [CreateOrder] Received DTO:', {
        session_id: dto.session_id,
        table_id: dto.table_id,
        customer_id: dto.customer_id,
        status: dto.status || 'PENDING (default)',
        items_count: dto.items?.length,
        payment_method: dto.payment_method
      });
      // Step 1: Validate order
      const validation = OrderService.validateOrder(dto);
      if (!validation.isValid) {
        throw new AppError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Step 1.5: Validate stock availability for order items (only for products, not packages)
      console.log('🔍 [CreateOrder] Validating stock availability for order items...');
      
      // Filter out packages - only validate stock for products
      const productItems = dto.items.filter((item: any) => item.product_id && !item.package_id);
      const packageItems = dto.items.filter((item: any) => item.package_id);
      
      if (packageItems.length > 0) {
        console.log(`📦 [CreateOrder] Found ${packageItems.length} package(s) - skipping stock validation for packages`);
      }
      
      if (productItems.length > 0) {
        const stockValidation = await StockValidationService.validateOrderStock(
          productItems.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            item_name: item.name || undefined,
          }))
        );

        // Log warnings for low stock items (non-blocking)
        if (stockValidation.warnings.length > 0) {
          console.warn('⚠️  [CreateOrder] Stock warnings:', stockValidation.warnings);
        }

        // Block order creation if stock validation fails (drinks without stock)
        if (!stockValidation.valid) {
          const unavailableList = stockValidation.unavailableItems
            .map(item => `${item.productName} (requested: ${item.requested}, available: ${item.available})`)
            .join(', ');
          
          console.error('❌ [CreateOrder] Insufficient stock for items:', unavailableList);
          throw new AppError(
            `Insufficient stock: ${unavailableList}`,
            400
          );
        }
      }

      console.log('✅ [CreateOrder] Stock validation passed');

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
        session_id: dto.session_id || null,
        customer_id: dto.customer_id || null,
        cashier_id: cashierId,
        table_id: dto.table_id || null,
        status: dto.status || null, // Allow passing status (e.g., DRAFT for tab orders)
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
      // Note: For session-based orders, table is already assigned to session
      // Only assign table for standalone orders (without session)
      if (dto.table_id && !dto.session_id) {
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
      } else if (dto.session_id) {
        console.log('ℹ️ [CreateOrder] Session-based order - table already assigned to session');
      } else {
        console.log('ℹ️ [CreateOrder] No table_id provided, skipping table assignment');
      }

      // Step 9: Update customer stats if customer exists
      if (customer) {
        await CustomerRepository.updateVisitInfo(customer.id, calculations.totalAmount);
      }

      // Step 10: Return created order with details
      // Note: Kitchen routing happens when order is COMPLETED (payment received), not on creation
      console.log(`🔍 [CreateOrder] Fetching full order details...`);
      const fullOrder = await OrderRepository.getById(order.id);
      
      console.log(`✅ [CreateOrder] Order created successfully:`, {
        order_id: fullOrder?.id,
        order_number: fullOrder?.order_number,
        session_id: fullOrder?.session_id || 'N/A',
        status: fullOrder?.status,
        order_items_count: fullOrder?.order_items?.length || 0
      });
      
      if (dto.session_id) {
        console.log(`🔗 [CreateOrder] Order linked to session: ${dto.session_id}`);
        console.log(`ℹ️  [CreateOrder] Session totals will be auto-updated by database trigger`);
      }
      
      console.log(`ℹ️  [CreateOrder] Kitchen routing will occur when order is marked as COMPLETED or CONFIRMED`);

      return fullOrder;
    } catch (error) {
      console.error('Create order error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create order', 500);
    }
  }

  /**
   * Process order items with pricing logic
   * Handles both products and packages
   */
  private static async processOrderItems(items: any[], customer: any) {
    const processedItems = [];

    for (const item of items) {
      // Check if this is a package or a product
      if (item.package_id) {
        // Process package item
        console.log(`📦 [CreateOrder] Processing package item: ${item.package_id}`);
        
        const pkg = await PackageRepository.getById(item.package_id);
        if (!pkg) {
          throw new AppError(`Package ${item.package_id} not found`, 404);
        }

        // Determine package price based on customer tier
        const isVIP = customer && customer.tier && customer.tier !== 'regular';
        const unitPrice = isVIP && pkg.vip_price ? pkg.vip_price : pkg.base_price;

        // Store package items in metadata for receipt display
        // pkg.items already contains the package items from getById
        const packageMetadata = (pkg.items && pkg.items.length > 0) ? {
          package_items: pkg.items.map((pi: any) => ({
            product_id: pi.product_id,
            product_name: pi.product?.name || 'Unknown Item',
            quantity: pi.quantity,
            is_choice_item: pi.is_choice_item || false,
            choice_group: pi.choice_group || null,
          }))
        } : null;

        // Prepare package order item
        const orderItem = {
          product_id: null,
          package_id: item.package_id,
          item_name: pkg.name,
          quantity: item.quantity || 1,
          unit_price: unitPrice,
          subtotal: unitPrice * (item.quantity || 1),
          discount_amount: item.discount_amount || 0,
          total: OrderCalculation.calculateOrderItemTotal(
            item.quantity || 1,
            unitPrice,
            item.discount_amount || 0
          ),
          is_vip_price: isVIP && pkg.vip_price ? true : false,
          is_complimentary: item.is_complimentary || false,
          notes: item.notes || null,
          complex_product_metadata: packageMetadata,
        };

        console.log(`✅ [CreateOrder] Package item processed:`, {
          name: orderItem.item_name,
          unit_price: orderItem.unit_price,
          is_vip_price: orderItem.is_vip_price,
          package_items_count: pkg.items?.length || 0
        });

        processedItems.push(orderItem);
      } else if (item.product_id) {
        // Process regular product item
        console.log(`🍺 [CreateOrder] Processing product item: ${item.product_id}`);
        
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

        // Prepare product order item
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
      } else {
        throw new AppError('Order item must have either product_id or package_id', 400);
      }
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
