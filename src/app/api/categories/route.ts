import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { AppError } from '@/lib/errors/AppError';
import { findSimilarCategories, getSimilarNameErrorMessage } from '@/lib/utils/categoryNameValidator';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/categories
 * Get all active product categories
 */
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      throw new AppError(error.message, 500);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories
 * Create a new product category (admin/manager only)
 * 
 * @remarks
 * - Validates category name uniqueness (case-insensitive)
 * - Smart detection for plural/singular forms (e.g., "Beer" vs "Beers")
 * - Only checks active categories to prevent duplicates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      throw new AppError('Category name is required', 400);
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

    // Use smart detection to find similar names (including plural/singular)
    const similarCategories = findSimilarCategories(
      trimmedName,
      existingCategories || []
    );

    if (similarCategories.length > 0) {
      const errorMessage = getSimilarNameErrorMessage(
        trimmedName,
        similarCategories[0].name
      );
      throw new AppError(errorMessage, 409);
    }
    
    const { data, error } = await supabaseAdmin
      .from('product_categories')
      .insert({
        name: trimmedName,
        description: body.description,
        parent_category_id: body.parent_category_id,
        color_code: body.color_code,
        default_destination: body.default_destination,
        display_order: body.display_order || 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new AppError(error.message, 500);
    }

    return NextResponse.json({
      success: true,
      data,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: error.statusCode === 409 ? 'DUPLICATE_CATEGORY' : 'CREATE_FAILED',
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
          message: 'Failed to create category',
        }
      },
      { status: 500 }
    );
  }
}
