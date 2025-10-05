import { NextRequest, NextResponse } from 'next/server';
import { CustomerService } from '@/core/services/customers/CustomerService';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/customers/search?q=[query]
 * Search customers by name, phone, or customer number
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Search query must be at least 2 characters',
      }, { status: 400 });
    }

    const customers = await CustomerService.searchForPOS(query);

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error) {
    console.error('GET /api/customers/search error:', error);
    
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
