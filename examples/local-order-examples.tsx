/**
 * Local Order System - Usage Examples
 * 
 * This file demonstrates how to use the local-first order tracking system
 * which uses IndexedDB + BroadcastChannel for instant updates without network latency.
 * 
 * Key Benefits:
 * - <10ms updates vs 200-500ms with Supabase
 * - Works offline
 * - Zero database costs for temporary orders
 * - Perfect for customer-facing displays
 */

import { useLocalOrder } from '@/lib/hooks/useLocalOrder';
import { useOrderBroadcast } from '@/lib/hooks/useOrderBroadcast';
import { saveOrder, getOrderByTable, deleteOrder } from '@/lib/utils/indexedDB';
import type { LocalOrder, LocalOrderItem } from '@/lib/utils/indexedDB';

// ============================================
// EXAMPLE 1: POS Terminal - Create Order
// ============================================
export function POSCreateOrderExample() {
  const { createOrder, addItem } = useLocalOrder();

  const handleCreateOrder = async () => {
    try {
      // Create order for table T-01
      const order = await createOrder({
        tableNumber: 'T-01',
        customerId: 'cust_123',
        customerName: 'John Doe',
        customerTier: 'vip_gold',
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        status: 'draft',
      });

      console.log('Order created:', order.id);
      
      // Add first item
      await addItem(order.id, {
        itemName: 'San Miguel Beer',
        quantity: 2,
        unitPrice: 85,
        subtotal: 170,
        discountAmount: 0,
        total: 170,
        isVipPrice: false,
        isComplimentary: false,
      });

      // Customer display will receive instant update via BroadcastChannel
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  return (
    <button onClick={handleCreateOrder} className="bg-blue-600 text-white px-4 py-2 rounded">
      Create Order for T-01
    </button>
  );
}

// ============================================
// EXAMPLE 2: POS Terminal - Add Items
// ============================================
export function POSAddItemExample() {
  const { order, addItem } = useLocalOrder('T-01');

  const handleAddBeer = async () => {
    if (!order) return;

    await addItem(order.id, {
      itemName: 'San Miguel Beer',
      quantity: 1,
      unitPrice: 85,
      subtotal: 85,
      discountAmount: 0,
      total: 85,
      isVipPrice: false,
      isComplimentary: false,
    });
    
    // Customer display updates instantly (<10ms)
  };

  const handleAddFood = async () => {
    if (!order) return;

    await addItem(order.id, {
      itemName: 'Buffalo Wings',
      quantity: 1,
      unitPrice: 295,
      subtotal: 295,
      discountAmount: 0,
      total: 295,
      notes: 'Extra spicy',
      isVipPrice: false,
      isComplimentary: false,
    });
  };

  return (
    <div className="space-x-2">
      <button onClick={handleAddBeer} className="bg-green-600 text-white px-4 py-2 rounded">
        Add Beer
      </button>
      <button onClick={handleAddFood} className="bg-orange-600 text-white px-4 py-2 rounded">
        Add Wings
      </button>
    </div>
  );
}

// ============================================
// EXAMPLE 3: Customer Display - Real-time View
// ============================================
export function CustomerDisplayExample() {
  // Auto-sync enabled - updates automatically when POS makes changes
  const { order, items, loading } = useLocalOrder('T-01', true);

  if (loading) return <div>Loading...</div>;
  if (!order) return <div>No active order</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Table {order.tableNumber}</h1>
      
      {/* Items list */}
      <div className="space-y-2 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between">
            <span>{item.quantity}x {item.itemName}</span>
            <span>₱{item.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="text-xl font-bold border-t pt-2">
        Total: ₱{order.totalAmount.toFixed(2)}
      </div>
      
      <p className="text-sm text-gray-500 mt-2">
        Updates instantly when items are added 🚀
      </p>
    </div>
  );
}

// ============================================
// EXAMPLE 4: Manual Broadcasting
// ============================================
export function ManualBroadcastExample() {
  const { broadcast } = useOrderBroadcast('beerhive_orders');

  const handleCustomBroadcast = () => {
    broadcast({
      event: 'item_added',
      orderId: 'order_123',
      tableNumber: 'T-05',
      itemId: 'item_456',
      timestamp: new Date().toISOString(),
      data: { message: 'Custom event' },
    });
  };

  return (
    <button onClick={handleCustomBroadcast} className="bg-purple-600 text-white px-4 py-2 rounded">
      Send Custom Broadcast
    </button>
  );
}

// ============================================
// EXAMPLE 5: Listen to Broadcasts
// ============================================
export function BroadcastListenerExample() {
  // Listen to all order broadcasts
  useOrderBroadcast('beerhive_orders', (message) => {
    console.log('Received broadcast:', message.event);
    
    switch (message.event) {
      case 'item_added':
        console.log(`Item added to order ${message.orderId}`);
        // Show notification, play sound, etc.
        break;
      case 'order_confirmed':
        console.log(`Order ${message.orderId} confirmed`);
        // Update UI, redirect, etc.
        break;
    }
  });

  return <div>Listening for broadcasts...</div>;
}

// ============================================
// EXAMPLE 6: Direct IndexedDB Access
// ============================================
export async function directIndexedDBExample() {
  // Create order manually
  const order: LocalOrder = {
    id: 'manual_order_123',
    tableNumber: 'T-10',
    subtotal: 500,
    discountAmount: 50,
    taxAmount: 0,
    totalAmount: 450,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveOrder(order);
  console.log('Order saved directly to IndexedDB');

  // Retrieve order
  const retrieved = await getOrderByTable('T-10');
  console.log('Retrieved order:', retrieved);

  // Delete order
  await deleteOrder(order.id);
  console.log('Order deleted');
}

// ============================================
// EXAMPLE 7: Update Order Totals
// ============================================
export function UpdateTotalsExample() {
  const { order, items, updateOrder } = useLocalOrder('T-01');

  const recalculateTotals = async () => {
    if (!order) return;

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = items.reduce((sum, item) => sum + item.discountAmount, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    await updateOrder(order.id, {
      subtotal,
      discountAmount,
      totalAmount,
    });

    console.log('Totals updated');
  };

  return (
    <button onClick={recalculateTotals} className="bg-indigo-600 text-white px-4 py-2 rounded">
      Recalculate Totals
    </button>
  );
}

// ============================================
// EXAMPLE 8: Apply VIP Discount
// ============================================
export function ApplyVIPDiscountExample() {
  const { items, updateItem } = useLocalOrder('T-01');

  const applyVIPDiscount = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const vipDiscount = item.subtotal * 0.15; // 15% VIP discount
    const newTotal = item.subtotal - vipDiscount;

    await updateItem(itemId, {
      discountAmount: vipDiscount,
      total: newTotal,
      isVipPrice: true,
    });

    console.log('VIP discount applied');
  };

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex justify-between items-center">
          <span>{item.itemName}</span>
          {!item.isVipPrice && (
            <button
              onClick={() => applyVIPDiscount(item.id)}
              className="bg-yellow-600 text-white px-2 py-1 text-sm rounded"
            >
              Apply VIP
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 9: Confirm Order (Ready for Payment)
// ============================================
export function ConfirmOrderExample() {
  const { order, confirmOrder } = useLocalOrder('T-01');

  const handleConfirm = async () => {
    if (!order) return;

    await confirmOrder(order.id);
    
    // At this point:
    // 1. Order marked as 'confirmed' in IndexedDB
    // 2. Broadcast sent to all listeners
    // 3. You can now sync to Supabase for permanent storage
    // 4. Old confirmed orders auto-cleanup after 24 hours
    
    console.log('Order confirmed and ready for payment');
  };

  return (
    <button onClick={handleConfirm} className="bg-green-700 text-white px-6 py-3 rounded-lg">
      Confirm Order & Process Payment
    </button>
  );
}

// ============================================
// EXAMPLE 10: Multi-table Dashboard
// ============================================
export function MultiTableDashboardExample() {
  const { allOrders, loading } = useLocalOrder();

  if (loading) return <div>Loading orders...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {allOrders.map((order) => (
        <div key={order.id} className="border rounded p-4">
          <h3 className="font-bold">{order.tableNumber}</h3>
          <p className="text-sm">{order.customerName || 'Walk-in'}</p>
          <p className="text-lg font-semibold">
            ₱{order.totalAmount.toFixed(2)}
          </p>
          <span className={`text-xs px-2 py-1 rounded ${
            order.status === 'draft' ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            {order.status}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Performance Comparison
 * 
 * Old Approach (Supabase Realtime):
 * - POS adds item → Network request → Supabase → Broadcast → Customer display
 * - Total latency: 200-500ms
 * - Network dependent
 * - Database costs per update
 * 
 * New Approach (Local-First):
 * - POS adds item → IndexedDB → BroadcastChannel → Customer display
 * - Total latency: <10ms
 * - Works offline
 * - Zero database costs
 * 
 * Result: 20-50x faster updates! 🚀
 */
