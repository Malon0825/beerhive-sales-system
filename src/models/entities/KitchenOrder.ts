import { KitchenOrderStatus } from '../enums/KitchenOrderStatus';

/**
 * Kitchen Order Entity
 * Represents an order routed to kitchen or bartender
 */
export interface KitchenOrder {
  id: string;
  order_id: string;
  order_item_id: string;
  destination: 'kitchen' | 'bartender' | 'both';
  status: KitchenOrderStatus;
  sent_at: string;
  started_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  assigned_to: string | null;
  special_instructions: string | null;
  preparation_notes: string | null;
  is_urgent: boolean;
  priority_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateKitchenOrderInput {
  order_id: string;
  order_item_id: string;
  destination: 'kitchen' | 'bartender' | 'both';
  special_instructions?: string;
  is_urgent?: boolean;
}

export interface UpdateKitchenOrderStatusInput {
  status: KitchenOrderStatus;
  preparation_notes?: string;
}
