import { NextRequest, NextResponse } from 'next/server';
import { StockValidationService } from '@/core/services/inventory/StockValidationService';
import { AppError } from '@/lib/errors/AppError';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inventory/validate-stock
 * Validate stock availability for order items
 * 
 * Request body:
 * {
 *   items: [
 *     { product_id: string, quantity: number, item_name?: string }
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   valid: boolean,
 *   unavailableItems: [...],
 *   warnings: [...]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Items array is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 [POST /api/inventory/validate-stock] Validating stock for ${items.length} items`);

    const validation = await StockValidationService.validateOrderStock(items);

    console.log(`✅ [POST /api/inventory/validate-stock] Validation complete:`, {
      valid: validation.valid,
      unavailableItems: validation.unavailableItems.length,
      warnings: validation.warnings.length,
    });

    if (!validation.valid) {
      console.warn(`⚠️  [POST /api/inventory/validate-stock] Stock validation failed:`, 
        validation.unavailableItems
      );
    }

    return NextResponse.json({
      success: true,
      valid: validation.valid,
      unavailableItems: validation.unavailableItems,
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error('POST /api/inventory/validate-stock error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to validate stock' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inventory/validate-stock?product_id=xxx&quantity=1
 * Validate stock for a single product
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('product_id');
    const quantity = parseFloat(searchParams.get('quantity') || '1');

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'product_id is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 [GET /api/inventory/validate-stock] Checking stock for product ${productId}, quantity: ${quantity}`);

    const stockCheck = await StockValidationService.checkProductStock(productId, quantity);

    console.log(`✅ [GET /api/inventory/validate-stock] Stock check complete:`, {
      available: stockCheck.available,
      currentStock: stockCheck.currentStock,
      isDrink: stockCheck.isDrink,
    });

    return NextResponse.json({
      success: true,
      available: stockCheck.available,
      currentStock: stockCheck.currentStock,
      productName: stockCheck.productName,
      categoryName: stockCheck.categoryName,
      isDrink: stockCheck.isDrink,
      message: stockCheck.message,
    });
  } catch (error) {
    console.error('GET /api/inventory/validate-stock error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to validate stock' },
      { status: 500 }
    );
  }
}
