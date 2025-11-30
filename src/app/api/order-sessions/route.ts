import { NextRequest, NextResponse } from 'next/server';
import { OrderSessionService } from '@/core/services/orders/OrderSessionService';
import { AppError } from '@/lib/errors/AppError';

/**
 * POST /api/order-sessions
 * Create a new order session (open a tab)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table_id, customer_id, notes, opened_by } = body;

    if (!table_id) {
      return NextResponse.json(
        { success: false, error: 'Table ID is required' },
        { status: 400 }
      );
    }

    const session = await OrderSessionService.openTab({
      table_id,
      customer_id,
      notes,
      opened_by,
    });

    return NextResponse.json({
      success: true,
      data: session,
      message: 'Tab opened successfully',
    });
  } catch (error) {
    console.error('Create order session error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code, details: error.details },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create order session', code: 'ORDER_SESSION_CREATE_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/order-sessions
 * Get all active order sessions (tabs)
 * 
 * Query params:
 * - table_id: Filter by table ID (returns active session for that table)
 * - active: Filter by active status (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tableId = searchParams.get('table_id');
    const activeOnly = searchParams.get('active') !== 'false'; // Default to true

    // If table_id is provided, get the active session for that specific table
    if (tableId) {
      const session = await OrderSessionService.getActiveSessionForTable(tableId);
      
      return NextResponse.json({
        success: true,
        data: session ? [session] : [],
        count: session ? 1 : 0,
      });
    }

    // Otherwise, get all active sessions
    const sessions = await OrderSessionService.getAllActiveTabs();

    return NextResponse.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch active sessions' },
      { status: 500 }
    );
  }
}
