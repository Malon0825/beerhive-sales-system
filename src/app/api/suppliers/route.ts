import { NextRequest, NextResponse } from 'next/server';
import { SupplierRepository } from '@/data/repositories/SupplierRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/suppliers
 * Get all suppliers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const search = searchParams.get('search');

    let suppliers;
    if (search) {
      suppliers = await SupplierRepository.search(search);
    } else {
      suppliers = await SupplierRepository.getAll(includeInactive);
    }

    return NextResponse.json({
      success: true,
      data: suppliers,
      count: suppliers.length,
    });
  } catch (error) {
    console.error('Get suppliers error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/suppliers
 * Create new supplier
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    const supplier = await SupplierRepository.create(body);

    return NextResponse.json(
      {
        success: true,
        data: supplier,
        message: 'Supplier created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create supplier error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
