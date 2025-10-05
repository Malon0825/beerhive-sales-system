import { NextRequest, NextResponse } from 'next/server';
import { CreateOrder } from '@/core/use-cases/orders/CreateOrder';
import { OrderRepository } from '@/data/repositories/OrderRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/orders
 * Get all orders or filter by query params
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get('active') === 'true';
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let orders;

    if (active) {
      orders = await OrderRepository.getActive();
    } else if (customerId) {
      orders = await OrderRepository.getByCustomer(customerId);
    } else if (startDate && endDate) {
      orders = await OrderRepository.getByDateRange(startDate, endDate);
    } else {
      // Default: get today's orders
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      orders = await OrderRepository.getByDateRange(startOfDay, endOfDay);
    }

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    
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
 * POST /api/orders
 * Create new order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Debug: Log received request body
    console.log('🔍 [POST /api/orders] Received request:', {
      table_id: body.table_id,
      customer_id: body.customer_id,
      items_count: body.items?.length,
      payment_method: body.payment_method
    });
    
    // Get cashier ID from authenticated session or use default cashier
    // TODO: Replace with proper authentication (NextAuth, Supabase Auth, etc.)
    // Default cashier ID - matches the 'cashier' user in the database
    const DEFAULT_CASHIER_ID = '6cd11fc5-de4b-445c-b91a-96616457738e';
    const cashierId = request.headers.get('x-user-id') || DEFAULT_CASHIER_ID;

    const order = await CreateOrder.execute(body, cashierId);
    
    // Debug: Log created order
    console.log('✅ [POST /api/orders] Order created:', {
      order_id: order.id,
      order_number: order.order_number,
      table_id: order.table_id,
      status: order.status
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    
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
