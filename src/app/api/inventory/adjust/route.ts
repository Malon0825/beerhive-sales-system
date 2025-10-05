import { NextRequest, NextResponse } from 'next/server';
import { InventoryRepository } from '@/data/repositories/InventoryRepository';
import { InventoryService } from '@/core/services/inventory/InventoryService';
import { AppError } from '@/lib/errors/AppError';

/**
 * POST /api/inventory/adjust
 * Adjust product stock
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.product_id || !body.quantity_change || !body.movement_type || !body.reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from session
    const userId = body.performed_by || 'system';

    // Get current product stock
    const { data: product, error: productError } = await (
      await import('@/data/supabase/client')
    ).supabase
      .from('products')
      .select('current_stock')
      .eq('id', body.product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate adjustment
    const validation = InventoryService.validateAdjustment(
      product.current_stock,
      body.quantity_change,
      body.movement_type
    );

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Check if requires manager approval
    const requiresApproval = InventoryService.requiresManagerApproval(
      product.current_stock,
      body.quantity_change
    );

    if (requiresApproval && !body.manager_approved) {
      return NextResponse.json(
        {
          success: false,
          error: 'This adjustment requires manager approval',
          requiresApproval: true,
        },
        { status: 403 }
      );
    }

    // Perform adjustment
    const result = await InventoryRepository.adjustStock(
      body.product_id,
      body.quantity_change,
      body.movement_type,
      body.reason,
      userId,
      body.notes,
      body.unit_cost
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Stock adjusted successfully',
      warning: validation.error,
    });
  } catch (error) {
    console.error('Adjust stock error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}
