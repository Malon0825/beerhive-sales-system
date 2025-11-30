import { SessionBillData, SessionBillItem } from '@/views/orders/sessionReceiptMapper';
import {
  getOrderSessionById,
  type OfflineOrderSession,
} from '@/lib/data-batching/offlineDb';
import { getOrdersBySession } from '@/lib/data-batching/offlineDb';

/**
 * Build SessionBillData from IndexedDB for offline View Bill.
 * Falls back to null if data is not available locally.
 */
export async function buildOfflineSessionBillData(
  sessionId: string
): Promise<SessionBillData | null> {
  try {
    const session: OfflineOrderSession | null = await getOrderSessionById(sessionId);

    if (!session) {
      console.warn('[offlineSessionBillBuilder] Session not found in IndexedDB:', sessionId);
      return null;
    }

    // Only allow OPEN or CLOSED sessions for bill preview
    if (session.status !== 'open' && session.status !== 'closed') {
      console.warn('[offlineSessionBillBuilder] Session not billable (status):', session.status);
      return null;
    }

    // Duration calculation mirrors OrderSessionService.getBillPreview
    const openedAt = new Date(session.opened_at);
    const endTime =
      session.status === 'closed' && session.closed_at
        ? new Date(session.closed_at)
        : new Date();
    const durationMs = endTime.getTime() - openedAt.getTime();
    const durationMinutes = Math.max(0, Math.floor(durationMs / 60000));

    // Load all orders for this session from IndexedDB
    const orders = await getOrdersBySession(session.id);

    // Map offline orders + items into SessionBillData structure
    const mappedOrders = orders.map((order) => {
      const items: SessionBillItem[] = (order.items || []).map((item) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        notes: item.notes ?? null,
        // Offline cache does not track VIP / complimentary flags explicitly yet
        is_complimentary: false,
        is_vip_price: false,
      }));

      return {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        created_at: order.created_at,
        items,
        subtotal: order.subtotal,
        discount_amount: order.discount_amount,
        total_amount: order.total_amount,
      };
    });

    const billData: SessionBillData = {
      session: {
        id: session.id,
        session_number: session.session_number,
        opened_at: session.opened_at,
        duration_minutes: durationMinutes,
        table: session.table
          ? {
              table_number: session.table.table_number,
              area: session.table.area,
            }
          : undefined,
        customer: session.customer
          ? {
              full_name: session.customer.full_name,
              // No customer_number field in OfflineOrderSession.customer; omit
              tier: session.customer.tier,
            }
          : undefined,
      },
      orders: mappedOrders,
      totals: {
        subtotal: session.subtotal,
        discount_amount: session.discount_amount,
        tax_amount: session.tax_amount,
        total_amount: session.total_amount,
      },
    };

    return billData;
  } catch (error) {
    console.error('[offlineSessionBillBuilder] Failed to build offline bill data:', error);
    return null;
  }
}
