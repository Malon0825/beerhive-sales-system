import { NextRequest, NextResponse } from 'next/server';
import { InventoryRepository } from '@/data/repositories/InventoryRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/inventory/movements
 * Get inventory movements with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      productId: searchParams.get('product_id') || undefined,
      movementType: searchParams.get('movement_type') || undefined,
      dateFrom: searchParams.get('date_from') || undefined,
      dateTo: searchParams.get('date_to') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
    };

    const movements = await InventoryRepository.getAllMovements(filters);

    return NextResponse.json({
      success: true,
      data: movements,
      count: movements.length,
    });
  } catch (error) {
    console.error('Get inventory movements error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory movements' },
      { status: 500 }
    );
  }
}
