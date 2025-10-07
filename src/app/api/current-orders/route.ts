import { NextRequest, NextResponse } from 'next/server';
import { CurrentOrderRepository } from '@/data/repositories/CurrentOrderRepository';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/current-orders
 * Fetch all current (draft) orders for authenticated user
 * 
 * Supports all staff roles: cashier, manager, admin
 * 
 * Query params:
 * - cashierId: Filter by specific user (cashier/manager/admin)
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
          error: 'User ID is required (use cashierId parameter or ?all=true for all orders)',
        },
        { status: 400 }
      );
    }

    // Fetch current orders for specific user (cashier/manager/admin)
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
 * Create a new current (draft) order
 * 
 * Accepts orders from:
 * - Cashiers (role: 'cashier')
 * - Managers (role: 'manager')
 * - Admins (role: 'admin')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cashierId, customerId, tableId, orderNotes } = body;

    if (!cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required (cashierId parameter)',
        },
        { status: 400 }
      );
    }

    // Validate that the user exists and has appropriate role
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role, is_active, username')
      .eq('id', cashierId)
      .single();

    if (userError || !user) {
      console.error('User validation error:', userError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid user ID. User not found in database.',
        },
        { status: 404 }
      );
    }

    // Check if user has permission to create orders
    const allowedRoles = ['cashier', 'admin', 'manager'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: `User role '${user.role}' is not authorized to create orders. Required roles: ${allowedRoles.join(', ')}`,
        },
        { status: 403 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: 'User account is inactive. Please contact administrator.',
        },
        { status: 403 }
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
        message: `Current order created successfully by ${user.username} (${user.role})`,
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

/**
 * DELETE /api/current-orders
 * Clear all current orders for the authenticated user
 * 
 * Security:
 * - Requires authentication via Authorization header
 * - Only clears orders belonging to the logged-in user
 * - Validates user ownership before deletion
 * 
 * @returns {Promise<NextResponse>} JSON response with deletion count
 * 
 * @throws {401} Unauthorized - Missing or invalid authentication token
 * @throws {404} Not Found - User not found in database
 * @throws {500} Internal Server Error - Database or server errors
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth verification error:', authError);
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Clear all current orders for this user (cashier)
    const deletedCount = await CurrentOrderRepository.clearAllByCashier(user.id);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        userId: user.id,
      },
      message: deletedCount > 0
        ? `Successfully cleared ${deletedCount} order(s)`
        : 'No orders to clear',
    });
  } catch (error: any) {
    console.error('Error clearing current orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to clear current orders',
      },
      { status: 500 }
    );
  }
}
