import { NextRequest, NextResponse } from 'next/server';
import { ProductRepository } from '@/data/repositories/ProductRepository';
import { AppError } from '@/lib/errors/AppError';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/products
 * Get all products or filter by query params
 * Query params:
 * - categoryId: Filter by category
 * - featured: Get featured products only
 * - lowStock: Get low stock products only
 * - includeInactive: Include inactive products (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const featured = searchParams.get('featured');
    const lowStock = searchParams.get('lowStock');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let products;

    if (lowStock === 'true') {
      products = await ProductRepository.getLowStock();
    } else if (featured === 'true') {
      products = await ProductRepository.getFeatured();
    } else if (categoryId) {
      products = await ProductRepository.getByCategory(categoryId);
    } else {
      products = await ProductRepository.getAll(includeInactive);
    }

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create new product (admin/manager only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Add authentication check for admin/manager role
    // For now, pass null instead of 'system' to avoid UUID error
    const userId = request.headers.get('x-user-id');

    const product = await ProductRepository.create(body, userId);

    return NextResponse.json({
      success: true,
      data: product,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
