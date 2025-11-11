import { NextRequest, NextResponse } from 'next/server';
import { OrderSessionService } from '@/core/services/orders/OrderSessionService';
import { AppError } from '@/lib/errors/AppError';
import { getAuthenticatedUser } from '@/lib/utils/api-auth';
import { UserRepository } from '@/data/repositories/UserRepository';

/**
 * POST /api/order-sessions/[sessionId]/close
 * Close a session and process final payment
 * 
 * Features:
 * - Supports zero-amount closures (payment_method = 'none', amount_tendered = 0)
 * - Automatically closes tabs with no orders or all items removed
 * - Standard payment processing for tabs with amounts > 0
 * 
 * Authentication:
 * - Attempts to get authenticated user from request
 * - Falls back to default POS user if not authenticated
 * - User who closes the tab is recorded as cashier for reporting
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { payment_method, amount_tendered, discount_amount, discount_type, discount_value, notes } = body;

    // Get authenticated user or fall back to default POS user
    let closedByUserId: string;
    const authenticatedUser = await getAuthenticatedUser(request);
    
    if (authenticatedUser) {
      closedByUserId = authenticatedUser.id;
      console.log('✅ [Close Tab] Authenticated user closing tab:', {
        id: authenticatedUser.id,
        username: authenticatedUser.username,
        role: authenticatedUser.role
      });
    } else {
      // Fall back to default POS user
      const defaultPOSUser = await UserRepository.getDefaultPOSUser();
      closedByUserId = defaultPOSUser.id;
      console.log('⚠️  [Close Tab] No authenticated user, using default POS user:', {
        id: defaultPOSUser.id,
        username: defaultPOSUser.username
      });
    }

    // Validation
    if (!payment_method) {
      return NextResponse.json(
        { success: false, error: 'Payment method is required' },
        { status: 400 }
      );
    }

    // Allow zero-amount closures for tabs with no orders (payment_method = 'none')
    // This happens when all items are removed or tab has no orders
    if (payment_method !== 'none') {
      if (!amount_tendered || amount_tendered <= 0) {
        return NextResponse.json(
          { success: false, error: 'Amount tendered must be greater than 0' },
          { status: 400 }
        );
      }
    }

    let normalizedDiscountType: 'percentage' | 'fixed_amount' | undefined;
    let normalizedDiscountValue: number | undefined;

    if (discount_type !== undefined || discount_value !== undefined) {
      if (!discount_type || !['percentage', 'fixed_amount'].includes(discount_type)) {
        return NextResponse.json(
          { success: false, error: 'Discount type must be percentage or fixed_amount' },
          { status: 400 }
        );
      }

      if (typeof discount_value !== 'number' || discount_value <= 0) {
        return NextResponse.json(
          { success: false, error: 'Discount value must be a positive number' },
          { status: 400 }
        );
      }

      normalizedDiscountType = discount_type;
      normalizedDiscountValue = discount_value;
    }

    const result = await OrderSessionService.closeTab(sessionId, {
      payment_method,
      amount_tendered,
      discount_amount,
      discount_type: normalizedDiscountType,
      discount_value: normalizedDiscountValue,
      notes,
      closed_by: closedByUserId,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Tab closed successfully',
    });
  } catch (error) {
    console.error('Close session error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to close tab' },
      { status: 500 }
    );
  }
}
