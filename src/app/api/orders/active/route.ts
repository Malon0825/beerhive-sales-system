import { NextRequest, NextResponse } from 'next/server';
import { OrderRepository } from '@/data/repositories/OrderRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/orders/active
 * Get all active orders (pending and on-hold)
 */
export async function GET(request: NextRequest) {
  try {
    const orders = await OrderRepository.getActive();

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('GET /api/orders/active error:', error);
    
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
