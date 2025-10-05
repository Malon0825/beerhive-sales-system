import { NextRequest, NextResponse } from 'next/server';
import { KitchenOrderRepository } from '@/data/repositories/KitchenOrderRepository';
import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/waiter/orders
 * Get all ready orders for waiter delivery
 * Returns only orders with status 'ready'
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🍽️  [GET /api/waiter/orders] Fetching ready orders for waiter...');
    
    // Get ready orders from all destinations (kitchen, bartender, both)
    const orders = await KitchenOrderRepository.getReadyOrders();
    
    console.log(`✅ [GET /api/waiter/orders] Found ${orders.length} ready orders`);

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('❌ [GET /api/waiter/orders] Error:', error);
    
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
