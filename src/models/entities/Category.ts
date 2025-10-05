/**
 * Product Category Entity
 * Represents a hierarchical category for products
 */
export interface ProductCategory {
  id: string;
  name: string;
  parent_category_id: string | null;
  description: string | null;
  color_code: string | null; // Hex color for UI (e.g., '#F59E0B')
  default_destination: 'kitchen' | 'bartender' | 'both' | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name: string;
  parent_category_id?: string;
  description?: string;
  color_code?: string;
  default_destination?: 'kitchen' | 'bartender' | 'both';
  display_order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  parent_category_id?: string;
  description?: string;
  color_code?: string;
  default_destination?: 'kitchen' | 'bartender' | 'both';
  display_order?: number;
  is_active?: boolean;
}
