import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/core/services/orders/OrderService';
import { AppError } from '@/lib/errors/AppError';
import { getAuthenticatedUser } from '@/lib/utils/api-auth';
import { UserRepository } from '@/data/repositories/UserRepository';

/**
 * PATCH /api/orders/[orderId]/confirm
 * Confirm an order and send to kitchen/bartender
 * 
 * IMPORTANT: This deducts stock immediately to prevent overbooking!
 * Stock is reserved when order is confirmed, not when customer pays.
 * 
 * This triggers food preparation WITHOUT requiring payment.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Get authenticated user for stock deduction audit trail
    let userId: string;
    const authenticatedUser = await getAuthenticatedUser(request);
    
    if (authenticatedUser) {
      userId = authenticatedUser.id;
      console.log(`✅ [PATCH /api/orders/${orderId}/confirm] Authenticated user: ${authenticatedUser.username}`);
    } else {
      // Fall back to default POS user
      const defaultUser = await UserRepository.getDefaultPOSUser();
      userId = defaultUser.id;
      console.log(`⚠️  [PATCH /api/orders/${orderId}/confirm] Using default POS user: ${defaultUser.username}`);
    }

    // Confirm order (this will check stock availability and deduct stock)
    const confirmedOrder = await OrderService.confirmOrder(orderId, userId);

    return NextResponse.json({
      success: true,
      data: confirmedOrder,
      message: 'Order confirmed and sent to kitchen. Stock has been reserved.',
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to confirm order' },
      { status: 500 }
    );
  }
}
