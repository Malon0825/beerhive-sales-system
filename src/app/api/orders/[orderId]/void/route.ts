import { NextRequest, NextResponse } from 'next/server';
import { VoidOrderService } from '@/core/services/orders/VoidOrderService';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { UserRole } from '@/models/enums/UserRole';

// Force dynamic rendering to avoid pre-rendering issues on Vercel
export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/[orderId]/void
 * Void an order (requires manager authorization via PIN or user ID)
 * Supports both completed order returns and regular voids
 *
 * Notes:
 * - Uses a Supabase lookup by manager PIN. The Database types may lag migrations
 *   (e.g., missing `manager_pin`), so we cast the client to `any` for this query
 *   to avoid type-level build failures that can abort Next.js manifest emission.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    
    let managerUserId = body.manager_user_id;

    // If managerPin provided (from order board), validate and get user ID
    // IMPORTANT: This allows ANY manager/admin to authorize with their PIN,
    // even if they are not the currently logged-in user.
    // This is intentional - any manager can authorize returns/voids.
    if (body.managerPin && !managerUserId) {
      // Look up ANY user with matching PIN who has manager or admin role
      // Does not matter who is currently logged in - any authorized manager can void
      // Cast supabase client to any to bypass strict column name checks when
      // Database types might not include `manager_pin` yet after migrations.
      const { data: userRaw, error } = await (supabaseAdmin as any)
        .from('users')
        .select('id, role, manager_pin, full_name, username')
        .eq('manager_pin', body.managerPin)
        .in('role', [UserRole.MANAGER, UserRole.ADMIN])
        .eq('is_active', true)
        .single();

      if (error || !userRaw) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid manager PIN or insufficient permissions. Only active managers or admins can void orders.' 
          },
          { status: 403 }
        );
      }

      // Type assertion to ensure fields are recognized
      const user = userRaw as any;

      // Use the manager/admin who provided the PIN as the authorizer
      managerUserId = user.id;
      
      console.log(`✅ Order void authorized by: ${user.full_name} (${user.username}) - Role: ${user.role}`);
    }

    // Validate required fields
    if (!managerUserId) {
      return NextResponse.json(
        { success: false, error: 'Manager authorization required' },
        { status: 400 }
      );
    }

    if (!body.reason) {
      return NextResponse.json(
        { success: false, error: 'Void reason required' },
        { status: 400 }
      );
    }

    // Validate reason (minimum 5 characters for returns)
    if (body.reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Reason must be at least 5 characters' },
        { status: 400 }
      );
    }

    // Void order (always return inventory for returns)
    const returnInventory = body.isReturn ? true : (body.return_inventory !== false);
    
    // Skip session check if PIN was used (PIN auth already validated manager)
    const skipSessionCheck = !!body.managerPin;
    
    const voidedOrder = await VoidOrderService.voidOrder(
      orderId,
      managerUserId,
      body.isReturn ? `[RETURN] ${body.reason}` : body.reason,
      returnInventory,
      skipSessionCheck
    );

    return NextResponse.json({
      success: true,
      data: voidedOrder,
      message: body.isReturn ? 'Order returned successfully' : 'Order voided successfully',
    });
  } catch (error) {
    console.error('POST /api/orders/[orderId]/void error:', error);
    
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
