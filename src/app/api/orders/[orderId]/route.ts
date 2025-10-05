import { NextRequest, NextResponse } from 'next/server';
import { OrderRepository } from '@/data/repositories/OrderRepository';
import { OrderService } from '@/core/services/orders/OrderService';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/orders/[orderId]
 * Get order by ID with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeSummary = searchParams.get('includeSummary') === 'true';

    if (includeSummary) {
      const orderSummary = await OrderService.getOrderSummary(params.orderId);
      return NextResponse.json({
        success: true,
        data: orderSummary,
      });
    }

    const order = await OrderRepository.getById(params.orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('GET /api/orders/[orderId] error:', error);
    
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
 * PATCH /api/orders/[orderId]
 * Update order or change status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const body = await request.json();
    
    let order;

    // Handle specific actions
    if (body.action) {
      switch (body.action) {
        case 'complete':
          order = await OrderService.completeOrder(params.orderId);
          break;

        case 'hold':
          order = await OrderService.holdOrder(params.orderId);
          break;

        case 'resume':
          order = await OrderService.resumeOrder(params.orderId);
          break;

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          );
      }
    } else {
      // Regular update
      order = await OrderRepository.update(params.orderId, body);
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('PATCH /api/orders/[orderId] error:', error);
    
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
