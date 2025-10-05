import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderRepository } from '@/data/repositories/PurchaseOrderRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/purchase-orders
 * Get all purchase orders
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      supplierId: searchParams.get('supplier_id') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('date_from') || undefined,
      dateTo: searchParams.get('date_to') || undefined,
    };

    const purchaseOrders = await PurchaseOrderRepository.getAll(filters);

    return NextResponse.json({
      success: true,
      data: purchaseOrders,
      count: purchaseOrders.length,
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/purchase-orders
 * Create new purchase order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.supplier_id || !body.order_date || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from session
    const userId = body.created_by || 'system';

    const purchaseOrder = await PurchaseOrderRepository.create(body, userId);

    return NextResponse.json(
      {
        success: true,
        data: purchaseOrder,
        message: 'Purchase order created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create purchase order error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}
