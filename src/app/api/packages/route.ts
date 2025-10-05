import { NextRequest, NextResponse } from 'next/server';
import { PackageRepository } from '@/data/repositories/PackageRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/packages
 * Get all packages or filter by query params
 * Query params:
 * - type: Filter by package type (vip_only, regular, promotional)
 * - active: Get only active packages (default: false)
 * - includeInactive: Include inactive packages (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const packageType = searchParams.get('type') as 'vip_only' | 'regular' | 'promotional' | null;
    const active = searchParams.get('active') === 'true';
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let packages;

    if (active) {
      console.log('[API] Fetching active packages...');
      packages = await PackageRepository.getActivePackages();
      console.log('[API] Active packages fetched:', packages.length, 'packages');
      if (packages.length > 0) {
        console.log('[API] First package:', packages[0].name, 'Items:', packages[0].items?.length || 0);
      }
    } else if (packageType) {
      packages = await PackageRepository.getByType(packageType);
    } else {
      packages = await PackageRepository.getAll(includeInactive);
    }

    return NextResponse.json({
      success: true,
      data: packages,
    });
  } catch (error) {
    console.error('GET /api/packages error:', error);
    
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
 * POST /api/packages
 * Create new package (admin/manager only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get user ID from headers (set by middleware/auth) or use null
    const userId = request.headers.get('x-user-id') || null;

    // Validate required fields
    if (!body.package_code || !body.name || !body.package_type || !body.base_price) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if package code already exists
    const codeExists = await PackageRepository.codeExists(body.package_code);
    if (codeExists) {
      return NextResponse.json(
        { success: false, error: 'Package code already exists' },
        { status: 409 }
      );
    }

    const packageData = await PackageRepository.create(body, userId);

    return NextResponse.json({
      success: true,
      data: packageData,
      message: 'Package created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/packages error:', error);
    
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
