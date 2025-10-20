import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { AppError } from '@/lib/errors/AppError';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/kitchen/orders/[orderId]/delete
 * Delete a single kitchen order (typically for cancelled items)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    console.log(`🗑️  [DELETE Kitchen Order] Deleting order: ${orderId}`);

    // Delete the kitchen order
    const { error } = await supabaseAdmin
      .from('kitchen_orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('❌ [DELETE Kitchen Order] Database error:', error);
      throw new AppError(`Failed to delete kitchen order: ${error.message}`, 500);
    }

    console.log(`✅ [DELETE Kitchen Order] Successfully deleted order ${orderId}`);

    return NextResponse.json({
      success: true,
      message: 'Kitchen order deleted successfully',
    });
  } catch (error) {
    console.error('❌ [DELETE Kitchen Order] Error:', error);
    
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
