import { NextRequest, NextResponse } from 'next/server';
import { CreateOrder } from '@/core/use-cases/orders/CreateOrder';
import { OrderRepository } from '@/data/repositories/OrderRepository';
import { UserRepository } from '@/data/repositories/UserRepository';
import { AppError } from '@/lib/errors/AppError';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
 * 
 * Handles user ID resolution for order transactions:
 * 1. First tries to get user ID from x-user-id header (authenticated session)
 * 2. Validates the user has POS privileges (admin, manager, or cashier)
 * 3. Falls back to default POS user if no auth or invalid user
 * 
 * Note: The cashier_id field can be any user with POS privileges (admin/manager/cashier)
 * 
 * @throws AppError if no POS user exists in system
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
    
    // Get user ID from authenticated session or use default POS user
    // TODO: Replace with proper authentication (NextAuth, Supabase Auth, etc.)
    let cashierId: string | null = request.headers.get('x-user-id');
    
    if (cashierId) {
      // Validate provided user ID has POS privileges (admin, manager, or cashier)
      console.log('🔍 [POST /api/orders] Validating provided user ID:', cashierId);
      const isValidPOSUser = await UserRepository.validatePOSUser(cashierId);
      
      if (!isValidPOSUser) {
        console.warn('⚠️ [POST /api/orders] Invalid or non-POS user ID provided, falling back to default');
        cashierId = null;
      } else {
        console.log('✅ [POST /api/orders] User ID validated - has POS privileges');
      }
    }
    
    // If no valid POS user ID provided, use default POS user
    if (!cashierId) {
      console.log('🔍 [POST /api/orders] No authenticated POS user, fetching default...');
      const defaultPOSUser = await UserRepository.getDefaultPOSUser();
      cashierId = defaultPOSUser.id;
      console.log('✅ [POST /api/orders] Using default POS user:', {
        id: cashierId,
        username: defaultPOSUser.username,
        role: defaultPOSUser.role
      });
    }

    // TypeScript: At this point cashierId is guaranteed to be a non-null string
    const order = await CreateOrder.execute(body, cashierId!);
    
    // Debug: Log created order
    console.log('✅ [POST /api/orders] Order created:', {
      order_id: order.id,
      order_number: order.order_number,
      table_id: order.table_id,
      status: order.status,
      cashier_id: cashierId
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
