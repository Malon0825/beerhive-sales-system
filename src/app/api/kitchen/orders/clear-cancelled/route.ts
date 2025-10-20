import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { KitchenOrderStatus } from '@/models/enums/KitchenOrderStatus';
import { AppError } from '@/lib/errors/AppError';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/kitchen/orders/clear-cancelled
 * Delete all cancelled kitchen orders for a specific destination
 * 
 * Query params:
 * - destination: 'kitchen' | 'bartender'
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const destination = searchParams.get('destination') as 'kitchen' | 'bartender' | null;

    console.log(`🗑️  [DELETE Clear Cancelled] Destination: ${destination || 'all'}`);

    // First, fetch IDs of cancelled orders matching the destination
    let selectQuery = supabaseAdmin
      .from('kitchen_orders')
      .select('id')
      .eq('status', KitchenOrderStatus.CANCELLED);

    // Filter by destination if specified
    if (destination) {
      selectQuery = selectQuery.or(`destination.eq.${destination},destination.eq.both`);
    }

    const { data: ordersToDelete, error: selectError } = await selectQuery;

    if (selectError) {
      console.error('❌ [DELETE Clear Cancelled] Select error:', selectError);
      throw new AppError(`Failed to find cancelled orders: ${selectError.message}`, 500);
    }

    if (!ordersToDelete || ordersToDelete.length === 0) {
      console.log(`✅ [DELETE Clear Cancelled] No cancelled orders to delete`);
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No cancelled orders to clear',
      });
    }

    const orderIds = ordersToDelete.map(o => o.id);
    console.log(`📋 [DELETE Clear Cancelled] Found ${orderIds.length} orders to delete`);

    // Now delete the orders by ID
    const { error: deleteError } = await supabaseAdmin
      .from('kitchen_orders')
      .delete()
      .in('id', orderIds);

    if (deleteError) {
      console.error('❌ [DELETE Clear Cancelled] Delete error:', deleteError);
      throw new AppError(`Failed to delete cancelled orders: ${deleteError.message}`, 500);
    }

    const deletedCount = orderIds.length;
    console.log(`✅ [DELETE Clear Cancelled] Deleted ${deletedCount} cancelled orders`);

    return NextResponse.json({
      success: true,
      count: deletedCount,
      message: `Cleared ${deletedCount} cancelled order(s)`,
    });
  } catch (error) {
    console.error('❌ [DELETE Clear Cancelled] Error:', error);
    
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
