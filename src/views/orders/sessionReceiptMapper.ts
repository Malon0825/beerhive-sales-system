import { Order, OrderItem } from '@/models/entities/Order';
import { OrderStatus } from '@/models/enums/OrderStatus';

/**
 * Canonical tab session bill structure shared across Tab module surfaces.
 */
export interface SessionBillData {
  session: {
    id: string;
    session_number: string;
    opened_at: string;
    duration_minutes: number;
    table?: {
      table_number: string;
      area?: string;
    };
    customer?: {
      full_name: string;
      customer_number?: string;
      tier?: string;
    };
  };
  orders: Array<{
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    items: Array<SessionBillItem>;
    subtotal: number;
    discount_amount: number;
    total_amount: number;
  }>;
  totals: {
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
  };
}

/**
 * Tab bill entry enriched with receipt attributes.
 */
export interface SessionBillItem
  extends Pick<
      OrderItem,
      'item_name' | 'quantity' | 'unit_price' | 'total' | 'notes'
    > {
  is_complimentary: boolean;
  is_vip_price: boolean;
}

/**
 * Convert tab bill data into the POS `PrintableReceipt` order payload.
 * Merges same products across all orders to conserve vertical space.
 */
export function createSessionReceiptOrderData(billData: SessionBillData) {
  // Aggregate items across all orders, merging products with same name
  const itemMap = new Map<string, OrderItem>();
  
  billData.orders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.item_name; // Group by item name
      
      if (itemMap.has(key)) {
        // Merge with existing item
        const existing = itemMap.get(key)!;
        existing.quantity += item.quantity;
        existing.total += item.total;
        existing.subtotal += item.unit_price * item.quantity;
        existing.discount_amount += Math.max(0, item.unit_price * item.quantity - item.total);
        
        // Keep VIP/complimentary flags if any instance has them
        existing.is_vip_price = existing.is_vip_price || item.is_vip_price;
        existing.is_complimentary = existing.is_complimentary || item.is_complimentary;
        
        // Concatenate notes if different
        if (item.notes && existing.notes !== item.notes) {
          existing.notes = existing.notes 
            ? `${existing.notes}; ${item.notes}` 
            : item.notes;
        }
      } else {
        // Add new item
        itemMap.set(key, {
          id: `merged-${item.item_name}`,
          order_id: order.id,
          product_id: null,
          package_id: null,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.unit_price * item.quantity,
          discount_amount: Math.max(0, item.unit_price * item.quantity - item.total),
          total: item.total,
          is_vip_price: item.is_vip_price,
          is_complimentary: item.is_complimentary,
          notes: item.notes ?? null,
          created_at: order.created_at,
        });
      }
    });
  });
  
  const mergedItems = Array.from(itemMap.values());

  const createdAt = billData.orders[0]?.created_at ?? billData.session.opened_at;
  const updatedAt =
    billData.orders[billData.orders.length - 1]?.created_at ?? createdAt;

  const printableOrder: Order = {
    id: billData.session.id,
    order_number: billData.session.session_number,
    customer_id: null,
    cashier_id: null,
    table_id: null,
    session_id: billData.session.id,
    subtotal: billData.totals.subtotal,
    discount_amount: billData.totals.discount_amount,
    tax_amount: billData.totals.tax_amount,
    total_amount: billData.totals.total_amount,
    applied_event_offer_id: null,
    payment_method: null,
    amount_tendered: null,
    change_amount: null,
    status: OrderStatus.CONFIRMED,
    order_notes: null,
    voided_by: null,
    voided_reason: null,
    voided_at: null,
    completed_at: null,
    created_at: createdAt,
    updated_at: updatedAt,
  };

  return {
    order: {
      ...printableOrder,
      order_items: mergedItems, // Merged items across all orders
      customer: billData.session.customer
        ? {
            full_name: billData.session.customer.full_name,
            customer_number: billData.session.customer.customer_number ?? '',
          }
        : undefined,
      cashier: undefined,
      table: billData.session.table
        ? { table_number: billData.session.table.table_number }
        : undefined,
    },
    // Add session metadata for receipt display
    sessionMetadata: {
      session_number: billData.session.session_number,
      opened_at: billData.session.opened_at,
      duration_minutes: billData.session.duration_minutes,
      order_count: billData.orders.length,
    },
  };
}
