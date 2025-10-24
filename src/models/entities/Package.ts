/**
 * Package Entity
 * Represents a bundled package of products (VIP packages, promotions)
 */
export interface Package {
  id: string;
  package_code: string;
  name: string;
  description: string | null;
  package_type: 'vip_only' | 'regular' | 'promotional';
  base_price: number;
  vip_price: number | null;
  valid_from: string | null;
  valid_until: string | null;
  // max_quantity_per_transaction: REMOVED - Use PackageAvailabilityService for dynamic limits
  is_addon_eligible: boolean;
  time_restrictions: Record<string, any> | null; // JSON object
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackageItem {
  id: string;
  package_id: string;
  product_id: string;
  quantity: number;
  is_choice_item: boolean;
  choice_group: string | null;
  display_order: number;
  created_at: string;
}

export interface CreatePackageInput {
  package_code: string;
  name: string;
  description?: string;
  package_type: 'vip_only' | 'regular' | 'promotional';
  base_price: number;
  vip_price?: number;
  valid_from?: string;
  valid_until?: string;
  // max_quantity_per_transaction: REMOVED - Replaced by dynamic stock availability
  is_addon_eligible?: boolean;
  time_restrictions?: Record<string, any>;
  items: CreatePackageItemInput[];
}

export interface CreatePackageItemInput {
  product_id: string;
  quantity: number;
  is_choice_item?: boolean;
  choice_group?: string;
  display_order?: number;
}

export interface UpdatePackageInput {
  name?: string;
  description?: string;
  package_type?: 'vip_only' | 'regular' | 'promotional';
  base_price?: number;
  vip_price?: number;
  valid_from?: string;
  valid_until?: string;
  // max_quantity_per_transaction: REMOVED - Replaced by dynamic stock availability
  is_addon_eligible?: boolean;
  time_restrictions?: Record<string, any>;
  is_active?: boolean;
}
