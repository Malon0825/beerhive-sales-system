import { NextRequest, NextResponse } from 'next/server';
import { OrderModificationService } from '@/core/services/orders/OrderModificationService';
import { AppError } from '@/lib/errors/AppError';
import { getAuthenticatedUser } from '@/lib/utils/api-auth';
import { UserRepository } from '@/data/repositories/UserRepository';

/**
 * PATCH /api/orders/[orderId]/items/[itemId]/reduce
 * Reduce order item quantity (professional order modification)
 * 
 * Only allows DECREASING quantities (no increases)
 * Automatically:
 * - Returns excess stock to inventory
 * - Notifies kitchen/bartender of changes
 * - Updates order totals
 * - Creates audit trail
 * 
 * Professional restaurant POS pattern
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { orderId, itemId } = await params;
    const body = await request.json();

    // Get authenticated user or fallback
    let userId: string;
    const authenticatedUser = await getAuthenticatedUser(request);
    
    if (authenticatedUser) {
      userId = authenticatedUser.id;
    } else {
      const defaultUser = await UserRepository.getDefaultPOSUser();
      userId = defaultUser.id;
    }

    // Validate required fields
    if (!body.new_quantity || typeof body.new_quantity !== 'number') {
      return NextResponse.json(
        { success: false, error: 'New quantity is required' },
        { status: 400 }
      );
    }

    // Call modification service
    const result = await OrderModificationService.reduceItemQuantity(
      orderId,
      itemId,
      body.new_quantity,
      userId,
      body.reason
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: `Quantity reduced successfully. ${result.kitchenWarning || ''}`,
    });
  } catch (error) {
    console.error('PATCH /api/orders/[orderId]/items/[itemId]/reduce error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to reduce quantity' },
      { status: 500 }
    );
  }
}
