import { NextRequest, NextResponse } from 'next/server';
import { ProductRepository } from '@/data/repositories/ProductRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/products/search?q=[query]
 * Search products by name, SKU, or barcode
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Search query must be at least 2 characters',
      }, { status: 400 });
    }

    const products = await ProductRepository.search(query);

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('GET /api/products/search error:', error);
    
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
