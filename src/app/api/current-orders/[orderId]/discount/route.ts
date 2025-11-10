import { NextRequest, NextResponse } from 'next/server';
import { CurrentOrderRepository } from '@/data/repositories/CurrentOrderRepository';
import { OrderCalculation } from '@/core/services/orders/OrderCalculation';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/current-orders/[orderId]/discount
 * Apply discount to a current order
 * 
 * Applies order-level discount and recalculates totals
 * 
 * Request Body:
 * - cashierId: UUID of the cashier (for authorization)
 * - discountType: 'percentage' | 'fixed_amount'
 * - discountValue: number (percentage 0-100 or fixed amount)
 * 
 * Business Rules:
 * - Percentage must be 0-100
 * - Fixed amount cannot exceed subtotal
 * - Only one discount per order at a time
 * - Database triggers auto-recalculate totals
 * 
 * @param request - Next.js request object
 * @param params - Route params containing orderId
 * @returns Updated order with applied discount
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    const body = await request.json();
    const { cashierId, discountType, discountValue } = body;

    // Validate request
    if (!cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cashier ID is required',
        },
        { status: 400 }
      );
    }

    if (!discountType || !['percentage', 'fixed_amount'].includes(discountType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid discount type is required (percentage or fixed_amount)',
        },
        { status: 400 }
      );
    }

    if (typeof discountValue !== 'number' || discountValue <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Discount value must be a positive number',
        },
        { status: 400 }
      );
    }

    // Fetch the order to verify ownership and get current subtotal
    const order = await CurrentOrderRepository.getById(orderId, cashierId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      );
    }

    // Verify the cashier owns this order
    if (order.cashier_id !== cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: You can only modify your own orders',
        },
        { status: 403 }
      );
    }

    // Calculate discount amount using the OrderCalculation service
    const { discountAmount } = OrderCalculation.applyDiscount(
      order.subtotal,
      discountType,
      discountValue
    );

    // Update order with discount
    // The database trigger will automatically recalculate total_amount
    const updatedOrder = await CurrentOrderRepository.update(orderId, cashierId, {
      discount_amount: discountAmount,
    });

    console.log(`✅ [Discount API] Applied ${discountType} discount (${discountValue}) = ₱${discountAmount} to order ${orderId}`);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: `Discount of ₱${discountAmount.toFixed(2)} applied successfully`,
    });
  } catch (error: any) {
    console.error('Error applying discount:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to apply discount',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/current-orders/[orderId]/discount
 * Remove discount from a current order
 * 
 * Sets discount_amount to 0 and recalculates totals
 * 
 * Query Params:
 * - cashierId: UUID of the cashier (for authorization)
 * 
 * @param request - Next.js request object
 * @param params - Route params containing orderId
 * @returns Updated order with discount removed
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    const searchParams = request.nextUrl.searchParams;
    const cashierId = searchParams.get('cashierId');

    // Validate request
    if (!cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cashier ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch the order to verify ownership
    const order = await CurrentOrderRepository.getById(orderId, cashierId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      );
    }

    // Verify the cashier owns this order
    if (order.cashier_id !== cashierId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: You can only modify your own orders',
        },
        { status: 403 }
      );
    }

    // Remove discount by setting it to 0
    // The database trigger will automatically recalculate total_amount
    const updatedOrder = await CurrentOrderRepository.update(orderId, cashierId, {
      discount_amount: 0,
    });

    console.log(`✅ [Discount API] Removed discount from order ${orderId}`);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Discount removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing discount:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to remove discount',
      },
      { status: error.status || 500 }
    );
  }
}
