import { NextRequest, NextResponse } from 'next/server';
import { CustomerRepository } from '@/data/repositories/CustomerRepository';
import { CustomerService } from '@/core/services/customers/CustomerService';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * GET /api/customers
 * Get all customers (paginated)
 * Uses server-side Supabase client for API route context
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const vipOnly = searchParams.get('vipOnly') === 'true';

    let customers;

    if (vipOnly) {
      customers = await CustomerRepository.getVIPCustomers(supabaseAdmin);
    } else {
      customers = await CustomerRepository.getAll(limit, offset, supabaseAdmin);
    }

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error) {
    console.error('GET /api/customers error:', error);
    
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
 * POST /api/customers
 * Create new customer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if quick registration
    if (body.quickRegister && body.full_name && body.phone) {
      const customer = await CustomerService.quickRegister(body.full_name, body.phone);
      return NextResponse.json({
        success: true,
        data: customer,
      }, { status: 201 });
    }

    // Full registration
    const customer = await CustomerService.register(body);

    return NextResponse.json({
      success: true,
      data: customer,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/customers error:', error);
    
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
