// @ts-nocheck - Supabase type inference issues
import { supabaseAdmin } from '../supabase/server-client';
import { Package, PackageItem, CreatePackageInput, UpdatePackageInput } from '@/models/entities/Package';
import { AppError } from '@/lib/errors/AppError';

/**
 * PackageRepository
 * Handles all database operations for packages and package items
 */
export class PackageRepository {
  /**
   * Get all packages with their items
   * Includes product category information for kitchen routing
   * @param includeInactive - If true, returns both active and inactive packages
   */
  static async getAll(includeInactive: boolean = false): Promise<(Package & { items?: PackageItem[] })[]> {
    try {
      let query = supabaseAdmin
        .from('packages')
        .select(`
          *,
          items:package_items(
            id,
            product_id,
            quantity,
            is_choice_item,
            choice_group,
            display_order,
            product:products(
              id,
              name,
              sku,
              base_price,
              image_url,
              category:product_categories(
                id,
                name,
                default_destination
              )
            )
          )
        `);

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      query = query
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw new AppError(error.message, 500);
      return data as unknown as (Package & { items?: any[] })[];
    } catch (error) {
      console.error('Error fetching packages:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch packages', 500);
    }
  }

  /**
   * Get package by ID with all related items
   * Includes product category information for kitchen routing
   */
  static async getById(id: string): Promise<(Package & { items?: any[] }) | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('packages')
        .select(`
          *,
          items:package_items(
            id,
            product_id,
            quantity,
            is_choice_item,
            choice_group,
            display_order,
            created_at,
            product:products(
              id,
              name,
              sku,
              base_price,
              vip_price,
              image_url,
              unit_of_measure,
              category:product_categories(
                id,
                name,
                default_destination
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new AppError(error.message, 500);
      }

      return data as unknown as (Package & { items?: any[] });
    } catch (error) {
      console.error('Error fetching package:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch package', 500);
    }
  }

  /**
   * Get packages by type
   */
  static async getByType(packageType: 'vip_only' | 'regular' | 'promotional'): Promise<Package[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('packages')
        .select('*')
        .eq('package_type', packageType)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw new AppError(error.message, 500);
      return data as Package[];
    } catch (error) {
      console.error('Error fetching packages by type:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch packages', 500);
    }
  }

  /**
   * Get active packages valid for current date with items
   * Includes product category information for kitchen routing
   */
  static async getActivePackages(): Promise<(Package & { items?: any[] })[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('[PackageRepository] Fetching active packages for date:', today);
      
      const { data, error } = await supabaseAdmin
        .from('packages')
        .select(`
          *,
          items:package_items(
            id,
            product_id,
            quantity,
            is_choice_item,
            choice_group,
            display_order,
            product:products(
              id,
              name,
              sku,
              base_price,
              vip_price,
              image_url,
              unit_of_measure,
              category:product_categories(
                id,
                name,
                default_destination
              )
            )
          )
        `)
        .eq('is_active', true)
        .or(`valid_from.is.null,valid_from.lte.${today}`)
        .or(`valid_until.is.null,valid_until.gte.${today}`)
        .order('name', { ascending: true });

      if (error) {
        console.error('[PackageRepository] Database error:', error);
        throw new AppError(error.message, 500);
      }
      
      console.log('[PackageRepository] Fetched packages:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('[PackageRepository] Sample package data:', {
          name: data[0].name,
          items_count: data[0].items?.length || 0,
          first_item: data[0].items?.[0]
        });
      }
      
      return data as unknown as (Package & { items?: any[] })[];
    } catch (error) {
      console.error('Error fetching active packages:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch active packages', 500);
    }
  }

  /**
   * Create a new package with items
   */
  static async create(input: CreatePackageInput, userId: string | null): Promise<Package> {
    try {
      // Start a transaction by creating the package first
      const { data: packageData, error: packageError } = await supabaseAdmin
        .from('packages')
        .insert({
          package_code: input.package_code,
          name: input.name,
          description: input.description,
          package_type: input.package_type,
          base_price: input.base_price,
          vip_price: input.vip_price,
          valid_from: input.valid_from,
          valid_until: input.valid_until,
          max_quantity_per_transaction: input.max_quantity_per_transaction ?? 1,
          is_addon_eligible: input.is_addon_eligible ?? false,
          time_restrictions: input.time_restrictions,
          is_active: true,
          created_by: userId,
        })
        .select()
        .single();

      if (packageError) throw new AppError(packageError.message, 500);

      // Create package items
      if (input.items && input.items.length > 0) {
        const packageItems = input.items.map((item, index) => ({
          package_id: packageData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          is_choice_item: item.is_choice_item ?? false,
          choice_group: item.choice_group,
          display_order: item.display_order ?? index,
        }));

        const { error: itemsError } = await supabaseAdmin
          .from('package_items')
          .insert(packageItems);

        if (itemsError) {
          // Rollback: delete the package if items insertion fails
          await supabaseAdmin.from('packages').delete().eq('id', packageData.id);
          throw new AppError(itemsError.message, 500);
        }
      }

      return packageData as Package;
    } catch (error) {
      console.error('Error creating package:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create package', 500);
    }
  }

  /**
   * Update a package
   */
  static async update(id: string, input: UpdatePackageInput): Promise<Package> {
    try {
      const { data, error } = await supabaseAdmin
        .from('packages')
        .update({
          name: input.name,
          description: input.description,
          package_type: input.package_type,
          base_price: input.base_price,
          vip_price: input.vip_price,
          valid_from: input.valid_from,
          valid_until: input.valid_until,
          max_quantity_per_transaction: input.max_quantity_per_transaction,
          is_addon_eligible: input.is_addon_eligible,
          time_restrictions: input.time_restrictions,
          is_active: input.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as Package;
    } catch (error) {
      console.error('Error updating package:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update package', 500);
    }
  }

  /**
   * Delete a package (soft delete by setting is_active to false)
   */
  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('packages')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error deleting package:', error);
      throw error instanceof AppError ? error : new AppError('Failed to delete package', 500);
    }
  }

  /**
   * Add item to package
   */
  static async addItem(packageId: string, item: Omit<PackageItem, 'id' | 'created_at'>): Promise<PackageItem> {
    try {
      const { data, error } = await supabaseAdmin
        .from('package_items')
        .insert({
          package_id: packageId,
          product_id: item.product_id,
          quantity: item.quantity,
          is_choice_item: item.is_choice_item ?? false,
          choice_group: item.choice_group,
          display_order: item.display_order ?? 0,
        })
        .select()
        .single();

      if (error) throw new AppError(error.message, 500);
      return data as PackageItem;
    } catch (error) {
      console.error('Error adding package item:', error);
      throw error instanceof AppError ? error : new AppError('Failed to add package item', 500);
    }
  }

  /**
   * Remove item from package
   */
  static async removeItem(itemId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('package_items')
        .delete()
        .eq('id', itemId);

      if (error) throw new AppError(error.message, 500);
    } catch (error) {
      console.error('Error removing package item:', error);
      throw error instanceof AppError ? error : new AppError('Failed to remove package item', 500);
    }
  }

  /**
   * Update package items (replace all items)
   */
  static async updateItems(packageId: string, items: CreatePackageInput['items']): Promise<void> {
    try {
      // Delete existing items
      const { error: deleteError } = await supabaseAdmin
        .from('package_items')
        .delete()
        .eq('package_id', packageId);

      if (deleteError) throw new AppError(deleteError.message, 500);

      // Insert new items
      if (items && items.length > 0) {
        const packageItems = items.map((item, index) => ({
          package_id: packageId,
          product_id: item.product_id,
          quantity: item.quantity,
          is_choice_item: item.is_choice_item ?? false,
          choice_group: item.choice_group,
          display_order: item.display_order ?? index,
        }));

        const { error: insertError } = await supabaseAdmin
          .from('package_items')
          .insert(packageItems);

        if (insertError) throw new AppError(insertError.message, 500);
      }
    } catch (error) {
      console.error('Error updating package items:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update package items', 500);
    }
  }

  /**
   * Check if package code already exists
   */
  static async codeExists(code: string, excludeId?: string): Promise<boolean> {
    try {
      let query = supabaseAdmin
        .from('packages')
        .select('id')
        .eq('package_code', code);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) throw new AppError(error.message, 500);
      return (data?.length ?? 0) > 0;
    } catch (error) {
      console.error('Error checking package code:', error);
      throw error instanceof AppError ? error : new AppError('Failed to check package code', 500);
    }
  }
}
