import { supabase } from '../supabase/client';

/**
 * Product Queries
 * Reusable query fragments for product data
 */

/**
 * Standard product select with category
 */
export const productWithCategorySelect = `
  *,
  category:product_categories(
    id,
    name,
    description,
    color_code,
    default_destination
  )
`;

/**
 * Product select with all related data
 */
export const productFullSelect = `
  *,
  category:product_categories(
    id,
    name,
    description,
    color_code,
    default_destination
  ),
  created_by_user:users!products_created_by_fkey(
    id,
    username,
    full_name
  )
`;

/**
 * Query builder for products with filters
 */
export interface ProductFilters {
  categoryId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  minStock?: number;
  maxStock?: number;
  searchTerm?: string;
}

export function buildProductQuery(filters: ProductFilters = {}) {
  let query = supabase
    .from('products')
    .select(productWithCategorySelect);

  // Apply filters
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters.isFeatured !== undefined) {
    query = query.eq('is_featured', filters.isFeatured);
  }

  if (filters.minStock !== undefined) {
    query = query.gte('current_stock', filters.minStock);
  }

  if (filters.maxStock !== undefined) {
    query = query.lte('current_stock', filters.maxStock);
  }

  if (filters.searchTerm) {
    const searchPattern = `%${filters.searchTerm}%`;
    query = query.or(`name.ilike.${searchPattern},sku.ilike.${searchPattern},barcode.ilike.${searchPattern}`);
  }

  return query;
}

/**
 * Get product categories
 */
export async function getProductCategories() {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get products count by category
 */
export async function getProductsCountByCategory() {
  const { data, error } = await supabase
    .from('products')
    .select('category_id, count')
    .eq('is_active', true);

  if (error) throw error;
  return data;
}
