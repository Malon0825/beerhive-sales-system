import { NextRequest, NextResponse } from 'next/server';
import { PackageRepository } from '@/data/repositories/PackageRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/packages/[packageId]
 * Get package by ID with all items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { packageId } = await params;
    const packageData = await PackageRepository.getById(packageId);

    if (!packageData) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: packageData,
    });
  } catch (error) {
    console.error('GET /api/packages/[packageId] error:', error);
    
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
 * PATCH /api/packages/[packageId]
 * Update package (admin/manager only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { packageId } = await params;
    const body = await request.json();

    // Check if package exists
    const existingPackage = await PackageRepository.getById(packageId);
    if (!existingPackage) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }

    // If updating package code, check if new code already exists
    if (body.package_code && body.package_code !== existingPackage.package_code) {
      const codeExists = await PackageRepository.codeExists(body.package_code, packageId);
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Package code already exists' },
          { status: 409 }
        );
      }
    }

    const updatedPackage = await PackageRepository.update(packageId, body);

    // If items are provided, update them
    if (body.items) {
      await PackageRepository.updateItems(packageId, body.items);
    }

    return NextResponse.json({
      success: true,
      data: updatedPackage,
      message: 'Package updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/packages/[packageId] error:', error);
    
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
 * DELETE /api/packages/[packageId]
 * Delete package (soft delete - sets is_active to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { packageId } = await params;
    // Check if package exists
    const existingPackage = await PackageRepository.getById(packageId);
    if (!existingPackage) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }

    await PackageRepository.delete(packageId);

    return NextResponse.json({
      success: true,
      message: 'Package deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/packages/[packageId] error:', error);
    
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
