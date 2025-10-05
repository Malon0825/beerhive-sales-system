import { NextRequest, NextResponse } from 'next/server';
import { OrderRepository } from '@/data/repositories/OrderRepository';

/**
 * GET /api/orders/board
 * Fetches all orders with full details for the order board display
 * Accessible by all authenticated users (customers, managers, admins)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters for optional filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    // Fetch orders using the repository
    const orders = await OrderRepository.getAllWithDetails({
      status: status || undefined,
      limit: limit ? parseInt(limit) : 50, // Default to 50 most recent orders
    });

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('Error fetching orders for board:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
