import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { AppError } from '@/lib/errors/AppError';
import { findSimilarCategories, getSimilarNameErrorMessage } from '@/lib/utils/categoryNameValidator';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/categories/[id]
 * Get a single category by ID
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing category ID
 * @returns Category data or error response
 * 
 * @remarks
 * - Returns 404 if category not found
 * - Returns 400 if ID format is invalid
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      throw new AppError('Invalid category ID', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('product_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Category not found', 404);
      }
      console.error('Database error:', error);
      throw new AppError(error.message, 500);
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('GET /api/categories/[id] error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/categories/[id]
 * Update an existing product category
 * 
 * @param request - Next.js request object with category update data
 * @param params - Route parameters containing category ID
 * @returns Updated category data or error response
 * 
 * @throws AppError with 400 for validation errors
 * @throws AppError with 404 if category not found
 * @throws AppError with 409 if duplicate category name exists
 * @throws AppError with 500 for database errors
 * 
 * @remarks
 * - Validates required fields (name must not be empty)
 * - Validates category name uniqueness (case-insensitive, excluding current category)
 * - Smart detection for plural/singular forms (e.g., "Beer" vs "Beers")
 * - Sanitizes input data to prevent injection
 * - Updates updated_at timestamp automatically via trigger
 * - Returns UI-ready formatted data
 * 
 * Frontend Integration:
 * - Send complete category object with updated fields
 * - Handle 400 for validation errors (display to user)
 * - Handle 404 for deleted categories (reload category list)
 * - Handle 409 for duplicate names (prompt user to choose different name)
 * - Handle 500 for server errors (show retry option)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      throw new AppError('Invalid category ID', 400);
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      throw new AppError('Category name is required', 400);
    }

    // Validate color code format if provided
    if (body.color_code && !/^#[0-9A-F]{6}$/i.test(body.color_code)) {
      throw new AppError('Invalid color code format. Use hex format like #3B82F6', 400);
    }

    // Validate default_destination if provided
    if (body.default_destination && !['kitchen', 'bartender'].includes(body.default_destination)) {
      throw new AppError('Invalid destination. Must be "kitchen" or "bartender"', 400);
    }

    // Check for duplicate/similar category names (case-insensitive + plural detection)
    const trimmedName = body.name.trim();
    const { data: existingCategories, error: checkError } = await supabaseAdmin
      .from('product_categories')
      .select('id, name')
      .eq('is_active', true);

    if (checkError) {
      console.error('Error checking for duplicate category:', checkError);
      throw new AppError(checkError.message, 500);
    }

    // Use smart detection to find similar names (including plural/singular), excluding current category
    const similarCategories = findSimilarCategories(
      trimmedName,
      existingCategories || [],
      id // Exclude current category
    );

    if (similarCategories.length > 0) {
      const errorMessage = getSimilarNameErrorMessage(
        trimmedName,
        similarCategories[0].name
      );
      throw new AppError(errorMessage, 409);
    }

    // Build update object with only allowed fields
    const updateData: any = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      color_code: body.color_code || null,
      default_destination: body.default_destination || null,
      updated_at: new Date().toISOString(),
    };

    // Only include display_order if explicitly provided
    if (body.display_order !== undefined && body.display_order !== null) {
      const displayOrder = parseInt(body.display_order);
      if (!isNaN(displayOrder)) {
        updateData.display_order = displayOrder;
      }
    }

    // Only include is_active if explicitly provided
    if (body.is_active !== undefined) {
      updateData.is_active = Boolean(body.is_active);
    }

    const { data, error } = await supabaseAdmin
      .from('product_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new AppError('Category not found', 404);
      }
      console.error('Database error:', error);
      throw new AppError(error.message, 500);
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        message: `Category "${data.name}" updated successfully`,
      },
    });
  } catch (error) {
    console.error('PUT /api/categories/[id] error:', error);

    if (error instanceof AppError) {
      let errorCode = 'UPDATE_FAILED';
      if (error.statusCode === 400) {
        errorCode = 'VALIDATION_ERROR';
      } else if (error.statusCode === 409) {
        errorCode = 'DUPLICATE_CATEGORY';
      } else if (error.statusCode === 404) {
        errorCode = 'CATEGORY_NOT_FOUND';
      }

      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: errorCode,
            message: error.message,
          }
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update category',
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[id]
 * Soft delete a category by setting is_active to false
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing category ID
 * @returns Success response or error
 * 
 * @throws AppError with 400 if category is in use by products
 * @throws AppError with 404 if category not found
 * @throws AppError with 500 for database errors
 * 
 * @remarks
 * - Checks if category is used by any products before deletion
 * - Returns list of up to 5 products using the category if in use
 * - Soft deletes to preserve referential integrity (only if not in use)
 * - Category won't appear in active category lists after deletion
 * 
 * Frontend Integration:
 * - Confirm with user before deletion
 * - Handle 400 error to display products using the category
 * - Show user which products need to be reassigned
 * - Reload category list after successful deletion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      throw new AppError('Invalid category ID', 400);
    }

    // Check if category exists
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('product_categories')
      .select('id, name')
      .eq('id', id)
      .single();

    if (categoryError) {
      if (categoryError.code === 'PGRST116') {
        throw new AppError('Category not found', 404);
      }
      console.error('Database error:', categoryError);
      throw new AppError(categoryError.message, 500);
    }

    // Check if any products are using this category
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, sku')
      .eq('category_id', id)
      .eq('is_active', true)
      .limit(5);

    if (productsError) {
      console.error('Error checking products:', productsError);
      throw new AppError(productsError.message, 500);
    }

    // If products exist, prevent deletion
    if (products && products.length > 0) {
      // Get total count of products using this category
      const { count, error: countError } = await supabaseAdmin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id)
        .eq('is_active', true);

      const totalCount = count || products.length;

      throw new AppError(
        JSON.stringify({
          message: `Cannot delete category "${category.name}" because it is being used by ${totalCount} product${totalCount > 1 ? 's' : ''}`,
          categoryName: category.name,
          productCount: totalCount,
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
          })),
        }),
        400
      );
    }

    // No products using this category, safe to delete
    const { data, error } = await supabaseAdmin
      .from('product_categories')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new AppError(error.message, 500);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
      },
      meta: {
        timestamp: new Date().toISOString(),
        message: `Category "${data.name}" deleted successfully`,
      },
    });
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error);

    if (error instanceof AppError) {
      // Check if error message is JSON (contains product list)
      let errorResponse: any = { message: error.message };
      
      try {
        errorResponse = JSON.parse(error.message);
      } catch {
        // Not JSON, use as plain message
      }

      return NextResponse.json(
        { 
          success: false, 
          error: errorResponse,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: { message: 'Failed to delete category' } },
      { status: 500 }
    );
  }
}
