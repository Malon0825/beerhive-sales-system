# Current Orders - Quick Reference Guide
## For Developers

**Last Updated:** October 7, 2025

---

## 🚀 Quick Start (2 minutes)

### 1. Check Database Status
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as tables FROM pg_tables 
WHERE tablename LIKE 'current_order%';
-- Should return: 3
```

### 2. Test API
```bash
# Get orders for a cashier
curl "http://localhost:3000/api/current-orders?cashierId=YOUR-UUID"
```

### 3. Use in Code
```typescript
import { useCurrentOrders } from '@/lib/hooks/useCurrentOrders';

function MyComponent() {
  const { activeOrder, addItem, loading } = useCurrentOrders(cashierId);
  
  return <div>{activeOrder?.items?.length || 0} items</div>;
}
```

---

## 📦 Database Tables

### `current_orders`
```typescript
interface CurrentOrder {
  id: string;
  cashier_id: string;
  customer_id?: string;
  table_id?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  is_on_hold: boolean;
  created_at: string;
  updated_at: string;
}
```

### `current_order_items`
```typescript
interface CurrentOrderItem {
  id: string;
  current_order_id: string;
  product_id?: string;
  package_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  is_vip_price: boolean;
  is_complimentary: boolean;
  notes?: string;
}
```

### `current_order_item_addons`
```typescript
interface CurrentOrderItemAddon {
  id: string;
  current_order_item_id: string;
  addon_id?: string;
  addon_name: string;
  addon_price: number;
  quantity: number;
}
```

---

## 🔌 API Endpoints

### Orders

**GET** `/api/current-orders?cashierId={uuid}`  
→ Fetch all orders for cashier

**POST** `/api/current-orders`  
→ Create new order
```json
{
  "cashierId": "uuid",
  "customerId": "uuid?",
  "tableId": "uuid?"
}
```

**PATCH** `/api/current-orders/[orderId]`  
→ Update order
```json
{
  "cashierId": "uuid",
  "customerId": "uuid?",
  "tableId": "uuid?",
  "isOnHold": "boolean?"
}
```

**DELETE** `/api/current-orders/[orderId]?cashierId={uuid}`  
→ Delete order

### Items

**POST** `/api/current-orders/[orderId]/items`  
→ Add item
```json
{
  "cashierId": "uuid",
  "item": {
    "product_id": "uuid",
    "item_name": "string",
    "quantity": 2,
    "unit_price": 75.00,
    "subtotal": 150.00,
    "total": 150.00
  }
}
```

**PATCH** `/api/current-orders/[orderId]/items/[itemId]`  
→ Update item
```json
{
  "cashierId": "uuid",
  "updates": {
    "quantity": 5,
    "subtotal": 375.00,
    "total": 375.00
  }
}
```

**DELETE** `/api/current-orders/[orderId]/items/[itemId]?cashierId={uuid}`  
→ Remove item

**DELETE** `/api/current-orders/[orderId]/items?cashierId={uuid}`  
→ Clear all items

---

## 🎣 React Hook

### `useCurrentOrders(cashierId: string)`

```typescript
const {
  // State
  orders,         // CurrentOrder[] - All orders
  activeOrder,    // CurrentOrder | null - Active order
  loading,        // boolean - Loading state
  error,          // string | null - Error message
  
  // Actions
  createOrder,    // (data?) => Promise<CurrentOrder>
  updateOrder,    // (id, updates) => Promise<CurrentOrder>
  deleteOrder,    // (id) => Promise<void>
  addItem,        // (orderId, item) => Promise<CurrentOrderItem>
  updateItem,     // (orderId, itemId, updates) => Promise<CurrentOrderItem>
  removeItem,     // (orderId, itemId) => Promise<void>
  clearItems,     // (orderId) => Promise<void>
  holdOrder,      // (orderId) => Promise<CurrentOrder>
  resumeOrder,    // (orderId) => Promise<CurrentOrder>
  refresh,        // () => Promise<void>
} = useCurrentOrders(cashierId);
```

**Example:**
```typescript
import { useCurrentOrders } from '@/lib/hooks/useCurrentOrders';

function POSComponent({ cashierId }) {
  const { activeOrder, addItem, loading } = useCurrentOrders(cashierId);
  
  const handleAddProduct = async (product: Product) => {
    if (!activeOrder) {
      // Will auto-create order
      await createOrder();
    }
    
    await addItem(activeOrder.id, {
      product_id: product.id,
      item_name: product.name,
      quantity: 1,
      unit_price: product.base_price,
      subtotal: product.base_price,
      total: product.base_price,
      discount_amount: 0,
    });
  };
  
  return (
    <div>
      {loading ? 'Loading...' : `${activeOrder?.items?.length || 0} items`}
    </div>
  );
}
```

---

## 🎨 Cart Context

### `useCart()`

```typescript
const {
  items,              // CartItem[] - Items in cart
  customer,           // Customer | null
  table,              // RestaurantTable | null
  paymentMethod,      // PaymentMethod | null
  currentOrderId,     // string | null - DB order ID
  isLoadingCart,      // boolean - Cart loading state
  
  // Actions
  addItem,            // (product, quantity?) => void
  addPackage,         // (package) => void
  removeItem,         // (itemId) => void
  updateQuantity,     // (itemId, quantity) => void
  updateItemNotes,    // (itemId, notes) => void
  setCustomer,        // (customer) => void
  setTable,           // (table) => void
  setPaymentMethod,   // (method) => void
  clearCart,          // () => void
  getSubtotal,        // () => number
  getTotal,           // () => number
  getItemCount,       // () => number
} = useCart();
```

**Features:**
- ✅ Auto-syncs to database on every change
- ✅ Auto-restores cart on page load
- ✅ Real-time updates via Supabase
- ✅ Optimistic UI updates

---

## 🔐 Security (RLS)

### Cashier Isolation

```sql
-- Cashiers can only see their own orders
CREATE POLICY "cashiers_view_own_current_orders" 
ON current_orders FOR SELECT 
USING (cashier_id = auth.uid()::uuid);
```

**How it works:**
- Each cashier has a unique `cashier_id` (their user UUID)
- RLS policies filter queries automatically
- No cashier can see another's orders
- Admins/managers can see all (separate policy)

### Testing Isolation

```sql
-- As Cashier A
SELECT * FROM current_orders;
-- Returns only Cashier A's orders

-- As Cashier B
SELECT * FROM current_orders;
-- Returns only Cashier B's orders (different set)
```

---

## ⚡ Real-Time Updates

### Subscribe to Changes

```typescript
import { useRealtime } from '@/lib/hooks/useRealtime';

useRealtime({
  table: 'current_orders',
  event: '*', // INSERT, UPDATE, DELETE
  filter: `cashier_id=eq.${cashierId}`, // Only this cashier
  onChange: (payload) => {
    console.log('Order changed:', payload);
    // Refresh data
  },
});
```

### How it Works

1. **WebSocket Connection:** Established to Supabase
2. **Filtered Subscription:** Only relevant changes received
3. **Auto-Refresh:** Data refreshed when changes occur
4. **Low Latency:** Updates in 1-2 seconds

---

## 🧮 Auto-Calculations

### Totals Auto-Update

**Trigger:** `trigger_current_order_items_totals`  
**Fires On:** INSERT, UPDATE, DELETE of items  
**Function:** `calculate_current_order_totals(order_id)`

**Example:**
```sql
-- Add item
INSERT INTO current_order_items (...) VALUES (...);
-- Trigger automatically runs: calculate_current_order_totals()
-- Order totals updated!

SELECT subtotal, total_amount FROM current_orders WHERE id = 'order-id';
-- subtotal and total_amount are already calculated
```

**No manual calculation needed!**

---

## 🐛 Debugging

### Check Cart State

```typescript
// Browser console
const cart = useCart();
console.log('Items:', cart.items);
console.log('Order ID:', cart.currentOrderId);
console.log('Loading:', cart.isLoadingCart);
```

### Check Database

```sql
-- Find cashier's orders
SELECT * FROM current_orders 
WHERE cashier_id = 'YOUR-UUID'
ORDER BY created_at DESC;

-- Find order items
SELECT * FROM current_order_items 
WHERE current_order_id = 'ORDER-ID';

-- Check totals
SELECT 
    id,
    subtotal,
    total_amount,
    (SELECT COUNT(*) FROM current_order_items WHERE current_order_id = current_orders.id) as item_count
FROM current_orders 
WHERE id = 'ORDER-ID';
```

### Common Errors

**Error:** "Order not found"  
**Fix:** Ensure `currentOrderId` is set and valid

**Error:** "Access denied"  
**Fix:** Check `cashier_id` matches authenticated user

**Error:** "Totals not updating"  
**Fix:** Verify triggers are active: `SELECT * FROM pg_trigger WHERE tgname LIKE 'trigger_%'`

---

## 📊 Performance Tips

### Optimize Queries

```typescript
// ❌ Bad - Multiple API calls
for (const item of items) {
  await addItem(orderId, cashierId, item);
}

// ✅ Good - Batch operation
await Promise.all(
  items.map(item => addItem(orderId, cashierId, item))
);
```

### Debounce Updates

```typescript
import { debounce } from 'lodash';

const debouncedUpdate = debounce(
  (itemId, quantity) => updateQuantity(itemId, quantity),
  500
);
```

### Pagination for Large Orders

```typescript
// For orders with 50+ items
const itemsPerPage = 20;
const displayItems = items.slice(0, itemsPerPage);
```

---

## ✅ Testing Checklist

### Before Deployment

- [ ] Database tables verified (`test-current-orders.sql`)
- [ ] API endpoints tested (all 9 routes)
- [ ] Cart persistence works (refresh test)
- [ ] Real-time updates work (multi-tab test)
- [ ] Multi-cashier isolation verified
- [ ] Performance acceptable (< 500ms load)
- [ ] Error handling graceful
- [ ] Documentation reviewed

### Quick Test Script

```bash
# 1. Database
psql -f scripts/test-current-orders.sql

# 2. API
curl http://localhost:3000/api/current-orders?cashierId=test-uuid

# 3. Frontend
npm run dev
# Login → Add items → Refresh → Verify restoration
```

---

## 📚 Full Documentation

- **Setup:** `DATABASE_SETUP_COMPLETE.md`
- **Testing:** `INTEGRATION_VERIFICATION.md`
- **Features:** `CURRENT_ORDERS_STAGING_TABLE.md`
- **Implementation:** `DATABASE_IMPLEMENTATION_SUMMARY.md`
- **Troubleshooting:** `QUICK_DATABASE_TEST_GUIDE.md`

---

## 🎯 TL;DR

```typescript
// 1. Use the hook
const { activeOrder, addItem } = useCurrentOrders(cashierId);

// 2. Add items
await addItem(activeOrder.id, itemData);

// 3. Items auto-sync to database
// 4. Cart auto-restores on page load
// 5. Real-time updates work automatically
```

**That's it! Everything else is handled automatically.** ✨

---

**Questions?** Check `INTEGRATION_VERIFICATION.md` for detailed guides.  
**Issues?** See `QUICK_DATABASE_TEST_GUIDE.md` for troubleshooting.

**Status:** ✅ Production Ready | **Version:** 1.0.0
