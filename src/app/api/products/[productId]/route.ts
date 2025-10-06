import { NextRequest, NextResponse } from 'next/server';
import { ProductRepository } from '@/data/repositories/ProductRepository';
import { AppError } from '@/lib/errors/AppError';

// Ensure dynamic rendering for API route on Vercel
export const dynamic = 'force-dynamic';

/**
 * GET /api/products/[productId]
 * Get product by ID
 */
export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const { productId } = context.params as { productId: string };
    const product = await ProductRepository.getById(productId);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('GET /api/products/[productId] error:', error);
    
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
 * PATCH /api/products/[productId]
 * Update product (admin/manager only)
 */
export async function PATCH(
  request: NextRequest,
  context: any
) {
  try {
    const body = await request.json();
    
    // TODO: Add authentication check for admin/manager role

    const { productId } = context.params as { productId: string };
    const product = await ProductRepository.update(productId, body);

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('PATCH /api/products/[productId] error:', error);
    
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
 * DELETE /api/products/[productId]
 * Deactivate product (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  context: any
) {
  try {
    // TODO: Add authentication check for admin/manager role

    const { productId } = context.params as { productId: string };
    await ProductRepository.deactivate(productId);

    return NextResponse.json({
      success: true,
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    console.error('DELETE /api/products/[productId] error:', error);
    
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
