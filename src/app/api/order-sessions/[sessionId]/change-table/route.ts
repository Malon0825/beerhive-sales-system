import { NextResponse } from 'next/server';
import { OrderSessionRepository } from '@/data/repositories/OrderSessionRepository';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * PATCH /api/order-sessions/[sessionId]/change-table
 * Change the table for an active customer session
 * 
 * This endpoint allows moving a customer's tab from one table to another.
 * Use case: Customers request to move to a different table
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { newTableId } = await request.json();

    console.log(`🔄 [ChangeTable] Request to move session ${sessionId} to table ${newTableId}`);

    // Validate inputs
    if (!sessionId || !newTableId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID and new table ID are required',
        },
        { status: 400 }
      );
    }

    // Step 1: Get the current session
    const session = await OrderSessionRepository.getById(sessionId);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    // Check if session is still open
    if (session.status !== 'open') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot change table for closed session',
        },
        { status: 400 }
      );
    }

    const oldTableId = session.table_id;

    // Step 2: Check if new table exists and is available
    // @ts-ignore - current_session_id exists in database but not in TypeScript types yet
    const { data: newTable, error: tableError } = await supabaseAdmin
      .from('restaurant_tables')
      .select('id, table_number, status, current_session_id')
      .eq('id', newTableId)
      .eq('is_active', true)
      .single();

    if (tableError || !newTable) {
      return NextResponse.json(
        {
          success: false,
          error: 'New table not found or is not active',
        },
        { status: 404 }
      );
    }

    // @ts-ignore - Runtime check for current_session_id
    const tableSessionId = (newTable as any).current_session_id;
    const tableNumber = (newTable as any).table_number;

    // Check if new table is available or only occupied by current session
    if (tableSessionId && tableSessionId !== sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: `Table ${tableNumber} is already occupied by another customer`,
        },
        { status: 400 }
      );
    }

    // Step 3: Check if there's already an active session at the new table
    const existingSession = await OrderSessionRepository.getActiveSessionByTable(newTableId);
    if (existingSession && existingSession.id !== sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: `Table ${tableNumber} already has an active tab`,
        },
        { status: 400 }
      );
    }

    console.log(`✅ [ChangeTable] Validation passed. Moving from table ${oldTableId || 'unknown'} to ${newTableId}`);

    // Step 4: Update session with new table_id
    // @ts-ignore - order_sessions table exists but not in TypeScript types yet
    const { error: updateSessionError } = await supabaseAdmin
      .from('order_sessions')
      .update({
        table_id: newTableId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateSessionError) {
      console.error('[ChangeTable] Error updating session:', updateSessionError);
      throw updateSessionError;
    }

    // Step 5: Update old table status (release it)
    if (oldTableId) {
      // @ts-ignore - current_session_id column exists but not in TypeScript types yet
      const { error: releaseOldTableError } = await supabaseAdmin
        .from('restaurant_tables')
        .update({
          status: 'available',
          current_session_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', oldTableId);

      if (releaseOldTableError) {
        console.error('[ChangeTable] Error releasing old table:', releaseOldTableError);
        // Non-fatal - session is already updated
      }
    }

    // Step 6: Update new table status (occupy it)
    // @ts-ignore - current_session_id column exists but not in TypeScript types yet
    const { error: occupyNewTableError } = await supabaseAdmin
      .from('restaurant_tables')
      .update({
        status: 'occupied',
        current_session_id: sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', newTableId);

    if (occupyNewTableError) {
      console.error('[ChangeTable] Error occupying new table:', occupyNewTableError);
      // Non-fatal - session is already updated
    }

    // Step 7: Update all orders in the session with new table_id
    const { error: updateOrdersError } = await supabaseAdmin
      .from('orders')
      .update({
        table_id: newTableId,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId);

    if (updateOrdersError) {
      console.error('[ChangeTable] Error updating orders:', updateOrdersError);
      // Non-fatal - session is already updated, orders still linked via session_id
    }

    // Step 8: Fetch updated session to return
    const updatedSession = await OrderSessionRepository.getById(sessionId);

    console.log(`🎉 [ChangeTable] Successfully moved session ${sessionId} to table ${tableNumber}`);

    return NextResponse.json({
      success: true,
      data: updatedSession,
      message: `Tab moved to table ${tableNumber}`,
    });
  } catch (error: any) {
    console.error('❌ [ChangeTable] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to change table',
      },
      { status: 500 }
    );
  }
}
