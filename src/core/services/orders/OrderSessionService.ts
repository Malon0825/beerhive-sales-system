import { OrderSessionRepository } from '@/data/repositories/OrderSessionRepository';
import { OrderRepository } from '@/data/repositories/OrderRepository';
import { OrderSession, CreateOrderSessionDto, CloseOrderSessionDto } from '@/models/entities/OrderSession';
import { SessionStatus } from '@/models/enums/SessionStatus';
import { AppError } from '@/lib/errors/AppError';

/**
 * OrderSessionService
 * Business logic for managing order sessions (tabs)
 * 
 * An order session represents a complete dining experience at a table.
 * It can contain multiple orders added throughout the customer's visit.
 */
export class OrderSessionService {
  /**
   * Open a new tab for a table
   * Creates a new session and marks the table as occupied
   * 
   * @param data - Session creation data
   * @returns Created session
   */
  static async openTab(data: CreateOrderSessionDto): Promise<OrderSession> {
    try {
      console.log('🎯 [OrderSessionService.openTab] Opening new tab:', data);

      // Check if table already has an active session
      if (data.table_id) {
        const existingSession = await OrderSessionRepository.getActiveSessionByTable(data.table_id);
        if (existingSession) {
          throw new AppError('Table already has an active session', 400);
        }
      }

      // Create the session
      const session = await OrderSessionRepository.create(data);
      console.log(`✅ [OrderSessionService.openTab] Session created: ${session.session_number}`);

      // Update table status if table is assigned
      if (data.table_id) {
        await OrderSessionRepository.updateTableSession(data.table_id, session.id);
        console.log(`✅ [OrderSessionService.openTab] Table marked as occupied`);
      }

      return session;
    } catch (error) {
      console.error('❌ [OrderSessionService.openTab] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to open tab', 500);
    }
  }

  /**
   * Get active session for a table
   * @param tableId - Table ID
   * @returns Active session or null
   */
  static async getActiveSessionForTable(tableId: string): Promise<OrderSession | null> {
    try {
      return await OrderSessionRepository.getActiveSessionByTable(tableId);
    } catch (error) {
      console.error('Get active session error:', error);
      throw new AppError('Failed to get active session', 500);
    }
  }

  /**
   * Get session by ID with all orders
   * @param sessionId - Session ID
   * @returns Session with orders
   */
  static async getSessionById(sessionId: string): Promise<OrderSession> {
    try {
      const session = await OrderSessionRepository.getById(sessionId);
      if (!session) {
        throw new AppError('Session not found', 404);
      }
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get session', 500);
    }
  }

  /**
   * Get all active tabs
   * @returns List of open sessions
   */
  static async getAllActiveTabs(): Promise<OrderSession[]> {
    try {
      return await OrderSessionRepository.getAllActiveSessions();
    } catch (error) {
      console.error('Get active tabs error:', error);
      throw new AppError('Failed to get active tabs', 500);
    }
  }

  /**
   * Get bill preview for a session
   * Shows all orders and items without finalizing payment
   * 
   * @param sessionId - Session ID
   * @returns Bill preview data
   */
  static async getBillPreview(sessionId: string) {
    try {
      console.log(`📋 [OrderSessionService.getBillPreview] Getting bill for session: ${sessionId}`);

      const session = await OrderSessionRepository.getById(sessionId);
      if (!session) {
        throw new AppError('Session not found', 404);
      }

      // Allow bill preview for OPEN sessions and CLOSED sessions (for reprinting)
      // Block only states that should never expose a bill (e.g., ABANDONED)
      if (session.status !== SessionStatus.OPEN && session.status !== SessionStatus.CLOSED) {
        throw new AppError('Session is not open', 400);
      }

      // Calculate duration
      // When CLOSED, use closed_at as the end time for accurate duration on reprints
      const openedAt = new Date(session.opened_at);
      const endTime =
        session.status === SessionStatus.CLOSED && session.closed_at
          ? new Date(session.closed_at)
          : new Date();
      const durationMs = endTime.getTime() - openedAt.getTime();
      const durationMinutes = Math.max(0, Math.floor(durationMs / 60000));

      // Get all orders in the session
      const orders = session.orders || [];

      // Count items by status
      const itemsByStatus = {
        draft: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        served: 0,
      };

      orders.forEach(order => {
        if (order.status in itemsByStatus) {
          itemsByStatus[order.status as keyof typeof itemsByStatus] += order.order_items?.length || 0;
        }
      });

      return {
        session: {
          id: session.id,
          session_number: session.session_number,
          opened_at: session.opened_at,
          duration_minutes: durationMinutes,
          table: session.table,
          customer: session.customer,
        },
        orders: orders.map(order => ({
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          created_at: order.created_at,
          items: order.order_items || [],
          subtotal: order.subtotal,
          discount_amount: order.discount_amount,
          total_amount: order.total_amount,
        })),
        totals: {
          subtotal: session.subtotal,
          discount_amount: session.discount_amount,
          tax_amount: session.tax_amount,
          total_amount: session.total_amount,
        },
        item_status: itemsByStatus,
      };
    } catch (error) {
      console.error('❌ [OrderSessionService.getBillPreview] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get bill preview', 500);
    }
  }

  /**
   * Close a tab and process final payment
   * Marks all orders as completed and closes the session
   * 
   * Updates order cashier_id to reflect who completed the payment,
   * ensuring accurate reporting of cashier performance.
   * 
   * @param sessionId - Session ID
   * @param paymentData - Payment information including closed_by user ID
   * @returns Closed session with receipt data
   * @throws AppError if session not found, not open, or payment validation fails
   */
  static async closeTab(sessionId: string, paymentData: CloseOrderSessionDto) {
    try {
      console.log(`[OrderSessionService.closeTab] Closing tab atomically: ${sessionId}`);

      if (!paymentData.closed_by) {
        throw new AppError('User ID (closed_by) is required to close tab', 400);
      }

      const closeResult = await OrderSessionRepository.closeAtomically(sessionId, {
        payment_method: paymentData.payment_method,
        amount_tendered: paymentData.amount_tendered,
        closed_by: paymentData.closed_by,
        discount_type: paymentData.discount_type,
        discount_value: paymentData.discount_value,
        discount_amount: paymentData.discount_amount,
        notes: paymentData.notes,
      });

      // Fetch once after the transaction so the receipt contains finalized
      // orders and relations. The close path now uses two database round trips.
      const closedSession = await OrderSessionRepository.getById(sessionId);
      if (!closedSession) {
        throw new AppError('Session not found after closing', 500);
      }

      const orders = closedSession.orders || [];

      console.log('[OrderSessionService.closeTab] Atomic close completed', {
        sessionId,
        alreadyClosed: closeResult.already_closed,
        adjustedProducts: closeResult.stock_products_adjusted,
        completedOrders: closeResult.orders_completed,
      });

      return {
        session: closedSession,
        already_closed: closeResult.already_closed,
        receipt: {
          session_number: closedSession.session_number,
          orders: orders.map(order => ({
            order_number: order.order_number,
            items: order.order_items || [],
            total: order.total_amount,
          })),
          totals: {
            subtotal: closedSession.subtotal,
            discount: closeResult.final_discount_total,
            tax: closedSession.tax_amount,
            total: closeResult.final_total_amount,
          },
          payment: {
            method: paymentData.payment_method,
            amount_tendered: paymentData.amount_tendered,
            change: closeResult.change_amount,
          },
          table: closedSession.table,
          customer: closedSession.customer,
          closed_at: closedSession.closed_at,
        },
      };
    } catch (error) {
      console.error('[OrderSessionService.closeTab] Error:', error);

      if (error instanceof AppError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Failed to close tab';

      if (message.includes('not installed')) {
        throw new AppError(message, 503);
      }
      if (message.includes('Session not found')) {
        throw new AppError('Session not found', 404);
      }
      if (
        message.includes('Insufficient stock') ||
        message.includes('Payment amount') ||
        message.includes('Payment method') ||
        message.includes('Discount') ||
        message.includes('Session is not open')
      ) {
        throw new AppError(message, 400);
      }

      throw new AppError('Failed to close tab', 500);
    }
  }

  /**
   * Add order to existing session
   * Validates that the session is open
   * 
   * @param sessionId - Session ID
   * @param orderId - Order ID to add
   */
  static async addOrderToSession(sessionId: string, orderId: string): Promise<void> {
    try {
      console.log(`➕ [OrderSessionService.addOrderToSession] Adding order ${orderId} to session ${sessionId}`);

      const session = await OrderSessionRepository.getById(sessionId);
      if (!session) {
        throw new AppError('Session not found', 404);
      }

      if (session.status !== SessionStatus.OPEN) {
        throw new AppError('Cannot add order to closed session', 400);
      }

      // Update order with session reference
      await OrderRepository.update(orderId, { session_id: sessionId } as any);

      console.log(`✅ [OrderSessionService.addOrderToSession] Order added to session`);
    } catch (error) {
      console.error('❌ [OrderSessionService.addOrderToSession] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to add order to session', 500);
    }
  }

  /**
   * Mark session as abandoned (customer left without paying)
   * For audit purposes
   * 
   * @param sessionId - Session ID
   */
  static async abandonSession(sessionId: string): Promise<OrderSession> {
    try {
      console.log(`⚠️  [OrderSessionService.abandonSession] Marking session as abandoned: ${sessionId}`);

      const session = await OrderSessionRepository.getById(sessionId);
      if (!session) {
        throw new AppError('Session not found', 404);
      }

      if (session.status !== SessionStatus.OPEN) {
        throw new AppError('Can only abandon open sessions', 400);
      }

      // Mark session as abandoned
      const abandonedSession = await OrderSessionRepository.markAbandoned(sessionId);

      // Clear table reference
      if (session.table_id) {
        await OrderSessionRepository.updateTableSession(session.table_id, null);
      }

      console.log(`✅ [OrderSessionService.abandonSession] Session marked as abandoned`);
      return abandonedSession;
    } catch (error) {
      console.error('❌ [OrderSessionService.abandonSession] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to abandon session', 500);
    }
  }

  /**
   * Get session statistics
   * @returns Session stats
   */
  static async getSessionStats() {
    try {
      const activeSessions = await OrderSessionRepository.getAllActiveSessions();

      const totalRevenue = activeSessions.reduce((sum, session) => sum + session.total_amount, 0);
      const averageTicket = activeSessions.length > 0 ? totalRevenue / activeSessions.length : 0;

      return {
        active_sessions: activeSessions.length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        average_ticket: Math.round(averageTicket * 100) / 100,
        sessions: activeSessions,
      };
    } catch (error) {
      console.error('Get session stats error:', error);
      throw new AppError('Failed to get session statistics', 500);
    }
  }
}
