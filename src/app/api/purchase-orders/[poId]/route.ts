import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderRepository } from '@/data/repositories/PurchaseOrderRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/purchase-orders/:poId
 * Get purchase order by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poId: string }> }
) {
  try {
    const { poId } = await params;
    const purchaseOrder = await PurchaseOrderRepository.getById(poId);

    if (!purchaseOrder) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    console.error('Get purchase order error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase order' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/purchase-orders/:poId
 * Update purchase order status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ poId: string }> }
) {
  try {
    const { poId } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from session
    const userId = body.user_id || 'system';

    const purchaseOrder = await PurchaseOrderRepository.updateStatus(
      poId,
      body.status,
      userId
    );

    return NextResponse.json({
      success: true,
      data: purchaseOrder,
      message: 'Purchase order updated successfully',
    });
  } catch (error) {
    console.error('Update purchase order error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update purchase order' },
      { status: 500 }
    );
  }
}
