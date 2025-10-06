// @ts-nocheck - Supabase type inference issues
import { supabase } from '../supabase/client';
import { supabaseAdmin } from '../supabase/server-client';
import { Product } from '@/models/entities/Product';
import { AppError } from '@/lib/errors/AppError';

/**
 * ProductRepository
 * Handles all database operations for products
 */
export class ProductRepository {
  /**
   * Get all products (optionally include inactive)
   * @param includeInactive - If true, returns both active and inactive products
   */
  static async getAll(includeInactive: boolean = false): Promise<Product[]> {
    try {
      let query = supabaseAdmin
        .from('products')
        .select(`
          *,
          category:product_categories(id, name, color_code)
        `);

      // Only filter by is_active if not including inactive
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      query = query
        .order('is_active', { ascending: false }) // Active products first
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      const { data, error } = await query;

      if (error) throw new AppError(error.message, 500);
      return data as Product[];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch products', 500);
    }
  }

  /**
   * Get product by ID
   */
  static async getById(id: string): Promise<Product | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          category:product_categories(id, name, color_code, default_destination)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new AppError(error.message, 500);
      }

      return data as Product;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch product', 500);
    }
  }

  /**
   * Get products by category
   */
  static async getByCategory(categoryId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          category:product_categories(id, name, color_code)
        `)
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw new AppError(error.message, 500);
      return data as Product[];
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch products', 500);
    }
  }

  /**
   * Search products by name or SKU
   */
  static async search(query: string): Promise<Product[]> {
    try {
      const searchTerm = `%${query}%`;
      
      const { data, error } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          category:product_categories(id, name, color_code)
        `)
        .eq('is_active', true)
        .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm},barcode.ilike.${searchTerm}`)
        .order('name', { ascending: true })
        .limit(50);

      if (error) throw new AppError(error.message, 500);
      return data as Product[];
    } catch (error) {
      console.error('Error searching products:', error);
      throw error instanceof AppError ? error : new AppError('Failed to search products', 500);
    }
  }

  /**
   * Create new product (admin/manager only)
   */
  static async create(product: Partial<Product>, userId: string | null): Promise<Product> {
    try {
      const productData: any = {
        ...product,
        created_by: userId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabaseAdmin
        .from('products')
        .insert(productData)
        .select(`
          *,
          category:product_categories(id, name, color_code)
        `)
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create product', 500);
    }
  }

  /**
   * Update product (admin/manager only)
   */
  static async update(id: string, updates: Partial<Product>): Promise<Product> {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select(`
          *,
          category:product_categories(id, name, color_code)
        `)
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Product;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update product', 500);
    }
  }

  /**
   * Soft delete product (set is_active to false)
   */
  static async deactivate(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error deactivating product:', error);
      throw error instanceof AppError ? error : new AppError('Failed to deactivate product', 500);
    }
  }

  /**
   * Get low stock products
   */
  static async getLowStock(): Promise<Product[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          category:product_categories(id, name, color_code)
        `)
        .eq('is_active', true)
        .order('current_stock', { ascending: true });

      if (error) throw new AppError(error.message, 500);
      
      // Filter low stock items (current_stock <= reorder_point)
      return (data as Product[]).filter(p => p.current_stock <= (p.reorder_point || 0));
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch low stock products', 500);
    }
  }

  /**
   * Update product stock level
   */
  static async updateStock(id: string, newStock: number): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error updating product stock:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update stock', 500);
    }
  }

  /**
   * Get featured products for POS display
   */
  static async getFeatured(): Promise<Product[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          category:product_categories(id, name, color_code)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('display_order', { ascending: true })
        .limit(20);

      if (error) throw new AppError(error.message, 500);
      return data as Product[];
    } catch (error) {
      console.error('Error fetching featured products:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch featured products', 500);
    }
  }
}
