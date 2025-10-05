/**
 * Purchase Order Entity
 * Represents a purchase order to suppliers for inventory restocking
 */
export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  created_by: string | null;
  approved_by: string | null;
  received_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  created_at: string;
}

export interface CreatePurchaseOrderInput {
  supplier_id: string;
  order_date: string;
  expected_delivery_date?: string;
  items: CreatePurchaseOrderItemInput[];
  notes?: string;
}

export interface CreatePurchaseOrderItemInput {
  product_id: string;
  quantity_ordered: number;
  unit_cost: number;
  notes?: string;
}

export interface UpdatePurchaseOrderInput {
  status?: 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
}

export interface ReceivePurchaseOrderInput {
  po_id: string;
  items: ReceivePurchaseOrderItemInput[];
  actual_delivery_date: string;
  notes?: string;
}

export interface ReceivePurchaseOrderItemInput {
  po_item_id: string;
  quantity_received: number;
  notes?: string;
}
