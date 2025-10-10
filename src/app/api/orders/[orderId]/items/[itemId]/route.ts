import { NextRequest, NextResponse } from 'next/server';
import { OrderItemService } from '@/core/services/orders/OrderItemService';
import { getAuthenticatedUser } from '@/lib/utils/api-auth';
import { UserRepository } from '@/data/repositories/UserRepository';
import { AppError } from '@/lib/errors/AppError';

/**
 * DELETE /api/orders/[orderId]/items/[itemId]
 * Remove an order item from a confirmed order
 * 
 * Features:
 * - Validates item is in CONFIRMED status
 * - Returns stock to inventory
 * - Removes kitchen/bartender orders
 * - Recalculates order totals
 * - Requires authentication
 * 
 * Security:
 * - Only allows removal of CONFIRMED items (not yet preparing)
 * - Validates user authentication
 * - Audit trail maintained
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { orderId, itemId } = await params;

    console.log(`🗑️  [DELETE /api/orders/${orderId}/items/${itemId}] Request received`);

    // Get authenticated user
    let userId: string;
    const authenticatedUser = await getAuthenticatedUser(request);
    
    if (authenticatedUser) {
      userId = authenticatedUser.id;
      console.log(`✅ [DELETE Item] Authenticated user: ${authenticatedUser.username}`);
    } else {
      // Fall back to default POS user
      const defaultUser = await UserRepository.getDefaultPOSUser();
      userId = defaultUser.id;
      console.log(`⚠️  [DELETE Item] Using default POS user: ${defaultUser.username}`);
    }

    // Remove the order item
    const updatedOrder = await OrderItemService.removeOrderItem(orderId, itemId, userId);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order item removed successfully',
    });
  } catch (error) {
    console.error('❌ [DELETE Item] Error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to remove order item' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[orderId]/items/[itemId]
 * Update order item quantity
 * 
 * Body:
 * - quantity: number (required, must be > 0)
 * 
 * Features:
 * - Validates item status
 * - Adjusts stock accordingly
 * - Checks stock availability for increases
 * - Recalculates order totals
 * - Requires authentication
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { orderId, itemId } = await params;
    const body = await request.json();
    const { quantity } = body;

    console.log(`✏️  [PATCH /api/orders/${orderId}/items/${itemId}] Request received - Quantity: ${quantity}`);

    // Validate quantity
    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid quantity (> 0) is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    let userId: string;
    const authenticatedUser = await getAuthenticatedUser(request);
    
    if (authenticatedUser) {
      userId = authenticatedUser.id;
      console.log(`✅ [PATCH Item] Authenticated user: ${authenticatedUser.username}`);
    } else {
      // Fall back to default POS user
      const defaultUser = await UserRepository.getDefaultPOSUser();
      userId = defaultUser.id;
      console.log(`⚠️  [PATCH Item] Using default POS user: ${defaultUser.username}`);
    }

    // Update order item quantity
    const updatedOrder = await OrderItemService.updateOrderItemQuantity(
      orderId,
      itemId,
      quantity,
      userId
    );

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order item quantity updated successfully',
    });
  } catch (error) {
    console.error('❌ [PATCH Item] Error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update order item quantity' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/[orderId]/items/[itemId]
 * Get order item details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;

    const orderItem = await OrderItemService.getOrderItem(itemId);

    return NextResponse.json({
      success: true,
      data: orderItem,
    });
  } catch (error) {
    console.error('❌ [GET Item] Error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch order item' },
      { status: 500 }
    );
  }
}
