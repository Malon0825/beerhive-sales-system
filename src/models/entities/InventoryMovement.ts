/**
 * Inventory Movement Entity
 * Represents stock movements and changes in inventory
 */
export interface InventoryMovement {
  id: string;
  product_id: string;
  movement_type: 'stock_in' | 'stock_out' | 'transfer' | 'physical_count' | 'sale' | 'void_return';
  reason: 'purchase' | 'damaged' | 'expired' | 'theft' | 'waste' | 'count_correction' | 'transfer_in' | 'transfer_out' | 'sale_deduction' | 'void_return';
  quantity_change: number; // Positive for increases, negative for decreases
  quantity_before: number;
  quantity_after: number;
  unit_cost: number | null;
  total_cost: number | null;
  order_id: string | null;
  reference_number: string | null;
  performed_by: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateInventoryMovementInput {
  product_id: string;
  movement_type: 'stock_in' | 'stock_out' | 'transfer' | 'physical_count' | 'sale' | 'void_return';
  reason: 'purchase' | 'damaged' | 'expired' | 'theft' | 'waste' | 'count_correction' | 'transfer_in' | 'transfer_out' | 'sale_deduction' | 'void_return';
  quantity_change: number;
  unit_cost?: number;
  reference_number?: string;
  notes?: string;
}

export interface StockAdjustmentInput {
  product_id: string;
  new_quantity: number;
  reason: string;
  notes?: string;
  manager_approval?: boolean;
}
