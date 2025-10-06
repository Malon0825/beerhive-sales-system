import { NextRequest, NextResponse } from 'next/server';
import { KitchenStatus } from '@/core/services/kitchen/KitchenStatus';
import { AppError } from '@/lib/errors/AppError';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/kitchen/orders
 * Get all kitchen orders (filtered for kitchen station)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const destination = searchParams.get('destination') as 'kitchen' | 'bartender' | null;

    let orders;

    if (destination === 'kitchen') {
      orders = await KitchenStatus.getKitchenOrders();
    } else if (destination === 'bartender') {
      orders = await KitchenStatus.getBartenderOrders();
    } else {
      // Default to kitchen
      orders = await KitchenStatus.getKitchenOrders();
    }

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('GET /api/kitchen/orders error:', error);
    
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
