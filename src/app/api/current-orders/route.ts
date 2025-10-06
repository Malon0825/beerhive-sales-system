import { NextRequest, NextResponse } from 'next/server';
import { CurrentOrderRepository } from '@/data/repositories/CurrentOrderRepository';
import { cookies } from 'next/headers';
import { supabase } from '@/data/supabase/client';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/current-orders
 * Fetch all current (draft) orders for authenticated user
 * 
 * Query params:
 * - cashierId: Filter by specific cashier (optional)
 * - all: If true, return all current orders (for staff monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cashierId = searchParams.get('cashierId');
    const showAll = searchParams.get('all') === 'true';

    if (showAll) {
      // Return ALL current orders (for staff dashboard monitoring)
      const allOrders = await CurrentOrderRepository.getAll();
      return NextResponse.json({
        success: true,
        data: allOrders,
      });
    }

    if (!cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cashier ID is required (or use ?all=true for all orders)',
        },
        { status: 400 }
      );
    }

    // Fetch current orders for specific cashier
    const orders = await CurrentOrderRepository.getByCashier(cashierId);

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error('Error fetching current orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch current orders',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/current-orders
 * Create a new current (draft) order for the cashier
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cashierId, customerId, tableId, orderNotes } = body;

    if (!cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cashier ID is required',
        },
        { status: 400 }
      );
    }

    // Create new current order
    const order = await CurrentOrderRepository.create({
      cashier_id: cashierId,
      customer_id: customerId,
      table_id: tableId,
      order_notes: orderNotes,
    });

    return NextResponse.json(
      {
        success: true,
        data: order,
        message: 'Current order created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating current order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create current order',
      },
      { status: 500 }
    );
  }
}
