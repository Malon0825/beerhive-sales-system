import { NextRequest, NextResponse } from 'next/server';
import { SupplierRepository } from '@/data/repositories/SupplierRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/suppliers/:supplierId
 * Get supplier by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { supplierId: string } }
) {
  try {
    const supplier = await SupplierRepository.getById(params.supplierId);

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error('Get supplier error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/suppliers/:supplierId
 * Update supplier
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { supplierId: string } }
) {
  try {
    const body = await request.json();
    const supplier = await SupplierRepository.update(params.supplierId, body);

    return NextResponse.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully',
    });
  } catch (error) {
    console.error('Update supplier error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/suppliers/:supplierId
 * Delete supplier
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { supplierId: string } }
) {
  try {
    await SupplierRepository.delete(params.supplierId);

    return NextResponse.json({
      success: true,
      message: 'Supplier deleted successfully',
    });
  } catch (error) {
    console.error('Delete supplier error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
