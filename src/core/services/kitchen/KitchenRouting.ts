import { KitchenOrderRepository } from '@/data/repositories/KitchenOrderRepository';
import { ProductRepository } from '@/data/repositories/ProductRepository';
import { CreateKitchenOrderInput } from '@/models/entities/KitchenOrder';
import { AppError } from '@/lib/errors/AppError';

/**
 * KitchenRouting Service
 * Analyzes order items and routes them to kitchen or bartender
 */
export class KitchenRouting {
  /**
   * Route order items to appropriate stations
   * Analyzes each item and determines destination based on product category
   */
  static async routeOrder(orderId: string, orderItems: any[]): Promise<void> {
    try {
      console.log(`🍳 [KitchenRouting] Starting routing for order ${orderId}`);
      console.log(`🍳 [KitchenRouting] Order items:`, orderItems.map(i => ({
        id: i.id,
        item_name: i.item_name,
        product_id: i.product_id,
        package_id: i.package_id
      })));

      if (!orderItems || orderItems.length === 0) {
        console.warn('⚠️  [KitchenRouting] No order items to route');
        return;
      }

      const kitchenOrders: CreateKitchenOrderInput[] = [];

      // Process each order item
      for (const item of orderItems) {
        console.log(`🔍 [KitchenRouting] Processing item: ${item.item_name} (${item.id})`);
        
        const destination = await this.determineDestination(item);
        
        console.log(`📍 [KitchenRouting] Destination for "${item.item_name}": ${destination || 'NULL'}`);
        
        if (destination) {
          kitchenOrders.push({
            order_id: orderId,
            order_item_id: item.id,
            destination,
            special_instructions: item.notes || undefined,
            is_urgent: false,
          });
        } else {
          console.warn(`⚠️  [KitchenRouting] No destination determined for item: ${item.item_name}`);
        }
      }

      console.log(`📋 [KitchenRouting] Prepared ${kitchenOrders.length} kitchen orders`);

      // Create kitchen orders in batch
      if (kitchenOrders.length > 0) {
        console.log(`💾 [KitchenRouting] Creating kitchen orders in database...`);
        await KitchenOrderRepository.createBatch(kitchenOrders);
        console.log(`✅ [KitchenRouting] Routed ${kitchenOrders.length} items for order ${orderId}`);
      } else {
        console.warn(`⚠️  [KitchenRouting] No kitchen orders to create for order ${orderId}`);
      }
    } catch (error) {
      console.error('❌ [KitchenRouting] Error routing order to kitchen:', error);
      console.error('Stack trace:', error);
      throw error instanceof AppError ? error : new AppError('Failed to route order', 500);
    }
  }

  /**
   * Determine destination based on product
   */
  private static async determineDestination(
    orderItem: any
  ): Promise<'kitchen' | 'bartender' | 'both' | null> {
    try {
      console.log(`🔍 [KitchenRouting.determineDestination] Checking item:`, {
        product_id: orderItem.product_id,
        package_id: orderItem.package_id,
        item_name: orderItem.item_name
      });

      // If it's a package, route to both (packages typically contain food and drinks)
      if (orderItem.package_id) {
        console.log(`📦 [KitchenRouting.determineDestination] Package detected → routing to BOTH`);
        return 'both';
      }

      // If it's a product, check its category
      if (orderItem.product_id) {
        console.log(`🔍 [KitchenRouting.determineDestination] Fetching product ${orderItem.product_id}...`);
        const product: any = await ProductRepository.getById(orderItem.product_id);
        
        if (!product) {
          console.warn(`⚠️  [KitchenRouting.determineDestination] Product not found: ${orderItem.product_id}`);
          return null;
        }

        console.log(`📦 [KitchenRouting.determineDestination] Product fetched:`, {
          id: product.id,
          name: product.name,
          has_category: !!product.category,
          category_name: product.category?.name,
          default_destination: product.category?.default_destination
        });

        // If product has a category with default destination
        if (product.category?.default_destination) {
          console.log(`✅ [KitchenRouting.determineDestination] Using category destination: ${product.category.default_destination}`);
          return product.category.default_destination as 'kitchen' | 'bartender' | 'both';
        }

        console.log(`⚠️  [KitchenRouting.determineDestination] No category destination, analyzing product name...`);
        // Fallback: analyze product name for keywords
        const inferredDestination = this.inferDestinationFromName(product.name);
        console.log(`🔍 [KitchenRouting.determineDestination] Inferred from name: ${inferredDestination}`);
        return inferredDestination;
      }

      console.warn(`⚠️  [KitchenRouting.determineDestination] No product_id or package_id found`);
      return null;
    } catch (error) {
      console.error('❌ [KitchenRouting.determineDestination] Error determining destination:', error);
      console.error('Stack trace:', error);
      // Default to kitchen if there's an error
      console.log(`⚠️  [KitchenRouting.determineDestination] Defaulting to KITCHEN due to error`);
      return 'kitchen';
    }
  }

  /**
   * Infer destination from product name (fallback method)
   */
  private static inferDestinationFromName(productName: string): 'kitchen' | 'bartender' {
    const lowerName = productName.toLowerCase();

    // Beverage keywords
    const beverageKeywords = [
      'beer', 'wine', 'whiskey', 'vodka', 'rum', 'gin', 'tequila',
      'cocktail', 'mojito', 'margarita', 'juice', 'soda', 'water',
      'shake', 'smoothie', 'coffee', 'tea', 'latte', 'cappuccino'
    ];

    // Food keywords
    const foodKeywords = [
      'sisig', 'wings', 'fries', 'burger', 'pizza', 'pasta',
      'rice', 'chicken', 'pork', 'beef', 'fish', 'seafood',
      'salad', 'soup', 'sandwich', 'pulutan', 'calamares'
    ];

    // Check for beverage keywords
    if (beverageKeywords.some(keyword => lowerName.includes(keyword))) {
      return 'bartender';
    }

    // Check for food keywords
    if (foodKeywords.some(keyword => lowerName.includes(keyword))) {
      return 'kitchen';
    }

    // Default to kitchen
    return 'kitchen';
  }

  /**
   * Route a single order item (for modifications/additions)
   */
  static async routeSingleItem(orderId: string, orderItem: any): Promise<void> {
    try {
      const destination = await this.determineDestination(orderItem);
      
      if (destination) {
        await KitchenOrderRepository.create({
          order_id: orderId,
          order_item_id: orderItem.id,
          destination,
          special_instructions: orderItem.notes || undefined,
          is_urgent: false,
        });
      }
    } catch (error) {
      console.error('Error routing single item:', error);
      throw error instanceof AppError ? error : new AppError('Failed to route item', 500);
    }
  }

  /**
   * Mark an order as urgent (priority routing)
   */
  static async markUrgent(orderId: string): Promise<void> {
    try {
      const kitchenOrders = await KitchenOrderRepository.getByOrderId(orderId);
      
      for (const ko of kitchenOrders) {
        await KitchenOrderRepository.updatePriority(ko.id, 100); // High priority
      }
    } catch (error) {
      console.error('Error marking order as urgent:', error);
      throw error instanceof AppError ? error : new AppError('Failed to mark as urgent', 500);
    }
  }
}
