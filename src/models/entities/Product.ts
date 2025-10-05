/**
 * Product Entity
 * Represents a product/item for sale
 */
export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category_id: string | null;
  base_price: number;
  vip_price: number | null;
  cost_price: number | null;
  current_stock: number;
  unit_of_measure: string;
  reorder_point: number;
  reorder_quantity: number;
  size_variant: string | null;
  alcohol_percentage: number | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  base_price: number;
  vip_price?: number;
  cost_price?: number;
  current_stock?: number;
  unit_of_measure?: string;
  reorder_point?: number;
  reorder_quantity?: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category_id?: string;
  base_price?: number;
  vip_price?: number;
  cost_price?: number;
  reorder_point?: number;
  is_active?: boolean;
}
