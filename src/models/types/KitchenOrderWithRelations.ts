import { KitchenOrder } from '../entities/KitchenOrder';
import { KitchenOrderStatus } from '../enums/KitchenOrderStatus';

/**
 * Order Item Data
 * Represents an item from order_items table
 */
export interface OrderItemData {
  id: string;
  item_name: string;
  quantity: number;
  notes: string | null;
}

/**
 * Table Data
 * Represents table information from restaurant_tables
 */
export interface TableData {
  table_number: string;
  area: string;
}

/**
 * Order Data
 * Represents order information
 */
export interface OrderData {
  id: string;
  order_number: string;
  table: TableData | null;
}

/**
 * Kitchen Order With Relations
 * Extended kitchen order with related data for display
 */
export interface KitchenOrderWithRelations extends KitchenOrder {
  order: OrderData;
  order_item: OrderItemData;
}
