/**
 * Data Transfer Object for creating/updating a product
 */
export interface CreateProductDTO {
  sku: string;
  barcode?: string;
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
  size_variant?: string;
  alcohol_percentage?: number;
  image_url?: string;
  is_featured?: boolean;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  category_id?: string;
  base_price?: number;
  vip_price?: number;
  cost_price?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  is_active?: boolean;
  is_featured?: boolean;
}
