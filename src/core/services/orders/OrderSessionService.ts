import { OrderSessionRepository } from '@/data/repositories/OrderSessionRepository';
import { OrderRepository } from '@/data/repositories/OrderRepository';
import { DiscountRepository } from '@/data/repositories/DiscountRepository';
import { OrderSession, CreateOrderSessionDto, CloseOrderSessionDto } from '@/models/entities/OrderSession';
import { SessionStatus } from '@/models/enums/SessionStatus';
import { OrderStatus } from '@/models/enums/OrderStatus';
import { StockDeduction } from '@/core/services/inventory/StockDeduction';
import { OrderCalculation } from '@/core/services/orders/OrderCalculation';
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
   * **Idempotent**: If table already has an active session, returns the existing session
   * instead of throwing an error. This allows safe retries and prevents duplicate sessions.
   * 
   * @param data - Session creation data
   * @returns Created or existing session
   */
  static async openTab(data: CreateOrderSessionDto): Promise<OrderSession> {
    try {
      console.log('🎯 [OrderSessionService.openTab] Opening new tab:', data);

      // Check if table already has an active session (idempotent check)
      if (data.table_id) {
        const existingSession = await OrderSessionRepository.getActiveSessionByTable(data.table_id);
        if (existingSession) {
          console.log(`ℹ️ [OrderSessionService.openTab] Table already has active session (idempotent) - returning existing session: ${existingSession.session_number}`);
          return existingSession;
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
      console.log(`💰 [OrderSessionService.closeTab] Closing tab: ${sessionId}`);

      // Get session
      const session = await OrderSessionRepository.getById(sessionId);
      if (!session) {
        throw new AppError('Session not found', 404);
      }

      if (session.status !== SessionStatus.OPEN) {
        throw new AppError('Session is not open', 400);
      }

      // Base financials
      const baseSubtotal = session.subtotal || 0;
      const existingDiscount = session.discount_amount || 0;
      const taxAmount = session.tax_amount || 0;
      const netBeforeAdditionalDiscount = Math.max(0, baseSubtotal - existingDiscount);

      // Derive additional discount from payload (if any)
      let additionalDiscount = 0;

      if (paymentData.discount_type && paymentData.discount_value) {
        const { discountAmount } = OrderCalculation.applyDiscount(
          netBeforeAdditionalDiscount,
          paymentData.discount_type,
          paymentData.discount_value
        );
        additionalDiscount = discountAmount;
      } else if (typeof paymentData.discount_amount === 'number' && paymentData.discount_amount > 0) {
        additionalDiscount = Math.min(paymentData.discount_amount, netBeforeAdditionalDiscount);
      }

      additionalDiscount = Math.min(additionalDiscount, netBeforeAdditionalDiscount);

      const finalDiscountTotal = existingDiscount + additionalDiscount;
      const finalTotalAmount = OrderCalculation.calculateTotal(baseSubtotal, finalDiscountTotal, taxAmount);

      // Validate payment amount
      if (paymentData.amount_tendered < finalTotalAmount) {
        throw new AppError('Payment amount is less than total', 400);
      }

      // Validate closed_by user ID is provided
      if (!paymentData.closed_by) {
        throw new AppError('User ID (closed_by) is required to close tab', 400);
      }

      // Calculate change
      const change = paymentData.amount_tendered - finalTotalAmount;

      // Update in-memory session object for receipt generation
      session.discount_amount = finalDiscountTotal;
      session.total_amount = finalTotalAmount;

      // NOTE: Session discount will be persisted AFTER order updates
      // to prevent database trigger from overwriting it

      // Update all orders in session to COMPLETED and ensure inventory is deducted
      const orders = session.orders || [];
      const performedByUserId = paymentData.closed_by;
      
      console.log(`👤 [OrderSessionService.closeTab] Closing tab as user: ${performedByUserId}`);
      console.log(`📋 [OrderSessionService.closeTab] Processing ${orders.length} orders in session`);
      
      for (const order of orders) {
        if (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.VOIDED) {
          console.log(
            `🔍 [OrderSessionService.closeTab] Processing order ${order.order_number} ` +
            `(current status: ${order.status})`
          );

          // CRITICAL FIX: Check if stock was already deducted (order was CONFIRMED)
          // If order is still DRAFT/PENDING, stock was NEVER deducted - we must deduct now!
          const wasConfirmed = order.status === OrderStatus.CONFIRMED || 
                              order.status === OrderStatus.PREPARING ||
                              order.status === OrderStatus.READY ||
                              order.status === OrderStatus.SERVED;

          if (!wasConfirmed) {
            // Order was never confirmed - stock was NEVER deducted!
            // Deduct stock now before completing the order
            console.warn(
              `⚠️  [OrderSessionService.closeTab] Order ${order.order_number} was never confirmed! ` +
              `Stock was NOT deducted yet. Deducting now...`
            );

            try {
              // Get order items for stock deduction
              const orderItems = order.order_items || [];
              
              if (orderItems.length > 0) {
                await StockDeduction.deductForOrder(
                  order.id,
                  orderItems.map((item: any) => ({
                    product_id: item.product_id,
                    package_id: item.package_id,
                    quantity: item.quantity,
                  })),
                  performedByUserId
                );
                console.log(
                  `✅ [OrderSessionService.closeTab] Stock successfully deducted for order ${order.order_number}`
                );
              } else {
                console.warn(
                  `⚠️  [OrderSessionService.closeTab] Order ${order.order_number} has no items - nothing to deduct`
                );
              }
            } catch (stockError) {
              // Stock deduction failed - this is CRITICAL
              // Log error but continue (payment already collected)
              console.error(
                `❌ [OrderSessionService.closeTab] CRITICAL: Stock deduction failed for order ${order.order_number}:`,
                stockError
              );
              console.error(
                `⚠️  [OrderSessionService.closeTab] Manual inventory adjustment required for order ${order.order_number}`
              );
              // Don't throw - we'll still mark order as completed
              // Admin should review inventory movements and adjust manually
            }
          } else {
            // Stock was already deducted when order was CONFIRMED
            console.log(
              `ℹ️  [OrderSessionService.closeTab] Stock for order ${order.order_number} ` +
              `was already deducted at confirmation time (status: ${order.status}). No additional deduction needed.`
            );
          }

          // Update order status to COMPLETED
          await OrderRepository.updateStatus(order.id, OrderStatus.COMPLETED);
          
          // Update cashier and completion timestamp
          // Payment details (amount_tendered, change_amount) are NOT set on individual orders
          // because payment is handled at the SESSION level for tabs
          // This prevents duplication of payment amounts across multiple orders in a session
          await OrderRepository.update(order.id, {
            cashier_id: performedByUserId, // This ensures the user who closed the tab is credited in reports
            payment_method: paymentData.payment_method as any,
            completed_at: new Date().toISOString(),
          });
        }
      }

      console.log(`✅ [OrderSessionService.closeTab] ${orders.length} orders marked as completed`);
      
      // Close the session (marks as closed, sets closed_at and closed_by)
      // This must happen BEFORE updating discount to prevent trigger overwrite
      const closedSession = await OrderSessionRepository.close(sessionId, paymentData.closed_by);

      // CRITICAL FIX: Update session discount and total AFTER all order updates
      // The update_session_totals() trigger recalculates totals when orders are updated
      // If we set the discount before order updates, the trigger overwrites it to 0
      // By updating AFTER order completion, we preserve the tab-level discount
      if (additionalDiscount > 0 || finalDiscountTotal !== (closedSession.discount_amount || 0)) {
        console.log(`💰 [OrderSessionService.closeTab] Updating session totals with discount:`, {
          finalDiscountTotal,
          finalTotalAmount,
          additionalDiscount,
        });
        
        await OrderSessionRepository.update(sessionId, {
          discount_amount: finalDiscountTotal,
          total_amount: finalTotalAmount,
        });
      }

      // Persist discount entry for reporting (align with POS behavior)
      // Only log NEW discounts applied at closure (additionalDiscount), not existing discounts
      if (additionalDiscount > 0) {
        try {
          // Determine discount type and value
          const discountType = paymentData.discount_type ?? 'fixed_amount';
          const discountValue = paymentData.discount_value ?? additionalDiscount;

          // Create descriptive reason and notes
          const sessionReason = paymentData.notes?.trim() || 'Tab discount applied at closure';
          const sessionNotes = [
            `Session: ${session.session_number}`,
            `Amount: ₱${additionalDiscount.toFixed(2)}`,
            `Type: ${discountType}`,
            `Value: ${discountValue}`,
          ];
          if (session.customer) {
            sessionNotes.push(`Customer: ${session.customer.full_name}`);
          }
          if (session.table) {
            sessionNotes.push(`Table: ${session.table.table_number}`);
          }

          console.log(`🧾 [OrderSessionService.closeTab] Persisting discount to discounts table:`, {
            session_id: session.id,
            session_number: session.session_number,
            discount_amount: additionalDiscount,
            discount_type: discountType,
            discount_value: discountValue,
            cashier_id: paymentData.closed_by,
            order_id: orders[0]?.id ?? null,
          });

          await DiscountRepository.create({
            discount_amount: additionalDiscount,
            discount_type: discountType,
            discount_value: discountValue,
            reason: sessionReason,
            cashier_id: paymentData.closed_by,
            manager_id: null,
            order_id: orders[0]?.id ?? null,
            order_item_id: null,
            notes: sessionNotes.join(' | '),
          });

          console.log(
            `✅ [OrderSessionService.closeTab] Successfully logged discount for session ${session.session_number}: ₱${additionalDiscount.toFixed(
              2
            )} (${discountType}: ${discountValue})`
          );
        } catch (discountLogError) {
          // Log error but don't fail the tab closure
          console.error(
            `❌ [OrderSessionService.closeTab] Failed to log discount to discounts table:`,
            discountLogError
          );
          console.error(
            `⚠️  [OrderSessionService.closeTab] Tab closed successfully but discount not recorded in reports.`
          );
          // Don't throw - tab is already closed
        }
      } else {
        console.log(
          `ℹ️  [OrderSessionService.closeTab] No additional discount applied at closure (additionalDiscount: ${additionalDiscount}, existingDiscount: ${existingDiscount})`
        );
      }

      // Clear table session reference
      if (session.table_id) {
        await OrderSessionRepository.updateTableSession(session.table_id, null);
        console.log(`✅ [OrderSessionService.closeTab] Table marked as available`);
      }

      console.log(`🎉 [OrderSessionService.closeTab] Tab closed successfully`);

      return {
        session: closedSession,
        receipt: {
          session_number: session.session_number,
          orders: orders.map(o => ({
            order_number: o.order_number,
            items: o.order_items || [],
            total: o.total_amount,
          })),
          totals: {
            subtotal: session.subtotal,
            discount: session.discount_amount,
            tax: session.tax_amount,
            total: session.total_amount,
          },
          payment: {
            method: paymentData.payment_method,
            amount_tendered: paymentData.amount_tendered,
            change: change,
          },
          table: session.table,
          customer: session.customer,
          closed_at: closedSession.closed_at,
        },
      };
    } catch (error) {
      console.error('❌ [OrderSessionService.closeTab] Error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to close tab', 500);
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
