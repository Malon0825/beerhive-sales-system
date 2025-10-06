import { NextRequest, NextResponse } from 'next/server';
import { CustomerRepository } from '@/data/repositories/CustomerRepository';
import { CustomerService } from '@/core/services/customers/CustomerService';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';

// Avoid static pre-rendering issues on Vercel for API routes
export const dynamic = 'force-dynamic';

/**
 * GET /api/customers/[customerId]
 * Get customer by ID with offers
 */
export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeOffers = searchParams.get('includeOffers') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    const { customerId } = context.params as { customerId: string };

    if (includeOffers) {
      const data = await CustomerService.getCustomerWithOffers(customerId, supabaseAdmin);
      return NextResponse.json({
        success: true,
        data,
      });
    }

    const customer = await CustomerRepository.getById(customerId, supabaseAdmin);

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    let response: any = { customer };

    if (includeStats) {
      const stats = await CustomerService.getCustomerStats(customerId, supabaseAdmin);
      response.stats = stats;
    }

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('GET /api/customers/[customerId] error:', error);
    
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
 * PATCH /api/customers/[customerId]
 * Update customer
 */
export async function PATCH(
  request: NextRequest,
  context: any
) {
  try {
    const body = await request.json();
    const { customerId } = context.params as { customerId: string };
    const customer = await CustomerRepository.update(customerId, body, supabaseAdmin);

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('PATCH /api/customers/[customerId] error:', error);
    
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
