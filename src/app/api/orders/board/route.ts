import { NextRequest, NextResponse } from 'next/server';
import { OrderRepository } from '@/data/repositories/OrderRepository';
import { OrderSessionRepository } from '@/data/repositories/OrderSessionRepository';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/board
 * Fetches all orders with full details for the order board display
 * Groups orders by session_id when applicable
 * Accessible by all authenticated users (customers, managers, admins)
 * 
 * Response format:
 * - sessions: Array of session-based order groups (multiple orders per tab)
 * - standalone_orders: Array of orders not linked to any session
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters for optional filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    // Fetch all orders with details
    const allOrders = await OrderRepository.getAllWithDetails({
      status: status || undefined,
      limit: limit ? parseInt(limit) : 100, // Increased limit to account for grouping
    });

    // Group orders by session_id
    const sessionMap = new Map<string, any>();
    const standaloneOrders: any[] = [];

    for (const order of allOrders) {
      if (order.session_id) {
        // Order belongs to a session (tab)
        if (!sessionMap.has(order.session_id)) {
          sessionMap.set(order.session_id, {
            session_id: order.session_id,
            orders: [],
            customer: order.customer,
            table: order.table,
            total_amount: 0,
            earliest_created_at: order.created_at,
          });
        }
        const sessionData = sessionMap.get(order.session_id);
        sessionData.orders.push(order);
        sessionData.total_amount += order.total_amount || 0;
        
        // Track earliest order time
        if (new Date(order.created_at) < new Date(sessionData.earliest_created_at)) {
          sessionData.earliest_created_at = order.created_at;
        }
      } else {
        // Standalone order (not part of a tab)
        standaloneOrders.push(order);
      }
    }

    // Convert session map to array and fetch session details
    const sessions = [];
    for (const [sessionId, sessionData] of sessionMap) {
      try {
        const sessionInfo = await OrderSessionRepository.getById(sessionId);
        sessions.push({
          ...sessionData,
          session_number: sessionInfo?.session_number || `SESSION-${sessionId.slice(0, 8)}`,
          session_status: sessionInfo?.status || 'unknown',
          session_opened_at: sessionInfo?.opened_at || sessionData.earliest_created_at,
        });
      } catch (error) {
        // If session details can't be fetched, use basic info
        console.warn(`Could not fetch session details for ${sessionId}:`, error);
        sessions.push({
          ...sessionData,
          session_number: `SESSION-${sessionId.slice(0, 8)}`,
          session_status: 'unknown',
          session_opened_at: sessionData.earliest_created_at,
        });
      }
    }

    // Sort sessions by earliest order creation time (most recent first)
    sessions.sort((a, b) => 
      new Date(b.earliest_created_at).getTime() - new Date(a.earliest_created_at).getTime()
    );

    console.log(`📊 [OrderBoard API] Retrieved ${sessions.length} sessions and ${standaloneOrders.length} standalone orders`);

    return NextResponse.json({
      success: true,
      sessions,
      standalone_orders: standaloneOrders,
      total_sessions: sessions.length,
      total_standalone: standaloneOrders.length,
    });
  } catch (error) {
    console.error('❌ [OrderBoard API] Error fetching orders for board:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
