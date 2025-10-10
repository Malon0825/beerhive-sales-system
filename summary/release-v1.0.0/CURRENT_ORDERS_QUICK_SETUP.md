# Current Orders Staging Table - Quick Setup Guide

## What Is This?

A **staging table system** for POS that gives each cashier their own isolated workspace for building orders. Orders stay in `current_orders` during the transaction, then move to permanent `orders` table on checkout.

### Key Feature: Cashier Isolation

- ✅ Each cashier sees **ONLY their own** current orders
- ✅ Multiple cashiers work simultaneously without interference  
- ✅ Real-time updates per cashier
- ✅ Enforced at database level (can't bypass)

---

## Quick Setup (3 Steps)

### Step 1: Run Database Migration

```bash
# Option A: Supabase CLI
cd d:\Projects\beerhive-sales-system
supabase db push

# Option B: Manual in Supabase SQL Editor
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Open: migrations/create_current_orders_table.sql
# 3. Click "Run"
```

**What this creates**:
- `current_orders` table
- `current_order_items` table
- `current_order_item_addons` table
- RLS policies for cashier isolation
- Auto-calculation triggers
- Indexes for performance

### Step 2: Enable Realtime

1. Go to Supabase Dashboard
2. Click **Database** → **Replication**
3. Find and enable:
   - ☑ `current_orders`
   - ☑ `current_order_items`
   - ☑ `current_order_item_addons`
4. Click **Save**

### Step 3: Integrate into POS

Add the component to your POS page:

```typescript
// src/app/(dashboard)/pos/page.tsx
import { CurrentOrderPanel } from '@/views/pos/CurrentOrderPanel';
import { useAuth } from '@/lib/hooks/useAuth';

export default function POSPage() {
  const { user } = useAuth();
  
  return (
    <div className="flex gap-4 h-screen p-4">
      {/* Left: Product selection grid */}
      <div className="flex-1">
        <ProductGrid />
      </div>
      
      {/* Right: Current order panel */}
      <div className="w-96">
        <CurrentOrderPanel 
          cashierId={user.id}
          onCheckout={(orderId) => {
            // Handle checkout
            router.push(`/checkout/${orderId}`);
          }}
        />
      </div>
    </div>
  );
}
```

**Done!** 🎉

---

## How It Works

### Cashier Starts Order

```
1. Cashier logs in → system loads their current orders
2. Click "Start New Order" → creates empty draft order
3. Select products → items added to current order
4. Totals calculate automatically
```

### Multiple Cashiers

```
Cashier A (Terminal 1):
  ├─ Current Order #1 (Table 5, ₱1,200)
  └─ Current Order #2 (On Hold, ₱800)

Cashier B (Terminal 2):
  └─ Current Order #3 (Table 8, ₱2,500)

Cashier C (Terminal 3):
  ├─ Current Order #4 (Walk-in, ₱500)
  └─ Current Order #5 (Table 12, ₱1,800)
```

**Each sees only their own orders!**

### Checkout Process

```
1. Cashier clicks "Checkout"
2. System moves current_order → orders
3. Process payment
4. Print receipt
5. current_order deleted (no longer needed)
```

---

## Testing

### Test Cashier Isolation

1. **Open Browser 1** (Cashier A)
   ```
   - Login as cashier1@test.com
   - Create order
   - Add "Beer Bucket" (₱750)
   ```

2. **Open Browser 2** (Cashier B)
   ```
   - Login as cashier2@test.com
   - Should NOT see Cashier A's order ✓
   - Create own order
   - Add "VIP Package" (₱2,500)
   ```

3. **Verify**
   ```
   - Cashier A sees only Beer Bucket order
   - Cashier B sees only VIP Package order
   - No cross-contamination ✓
   ```

### Test Real-time Updates

1. Keep both browsers open
2. In **Cashier A's browser**:
   - Add item → updates instantly ✓
   - Change quantity → updates instantly ✓
3. **Cashier B's browser**:
   - Should NOT update (different cashier) ✓

### Test Auto-Calculations

1. Add item (₱500 × 2)
   - Subtotal: ₱1,000 ✓
2. Add another item (₱300 × 1)
   - Subtotal: ₱1,300 ✓
3. Remove first item
   - Subtotal: ₱300 ✓

**No manual calculation needed!**

---

## Features

### Current Order Panel

- **Item List**: All items with quantities
- **Quantity Controls**: +/- buttons
- **Remove Item**: X button
- **Clear All**: Trash icon
- **Customer Info**: Name and tier
- **Table Assignment**: Table number and area
- **Auto Totals**: Subtotal, discount, tax, total
- **Hold/Resume**: Pause order to handle another customer
- **Checkout**: Complete the order

### Real-time Updates

Updates happen automatically when:
- ✅ Item added
- ✅ Item removed
- ✅ Quantity changed
- ✅ Customer assigned
- ✅ Table assigned

**No refresh needed!**

---

## API Endpoints

### Current Orders

```
GET    /api/current-orders?cashierId={id}
       → List all current orders for cashier

POST   /api/current-orders
       → Create new current order

PATCH  /api/current-orders/{orderId}
       → Update order (customer, table, notes)

DELETE /api/current-orders/{orderId}
       → Delete order (cancel)
```

### Order Items

```
POST   /api/current-orders/{orderId}/items
       → Add item to order

PATCH  /api/current-orders/{orderId}/items/{itemId}
       → Update item (quantity, price)

DELETE /api/current-orders/{orderId}/items/{itemId}
       → Remove item

DELETE /api/current-orders/{orderId}/items
       → Clear all items
```

---

## Using the React Hook

For custom components:

```typescript
import { useCurrentOrders } from '@/lib/hooks/useCurrentOrders';

function MyPOSComponent() {
  const {
    orders,          // All current orders for this cashier
    activeOrder,     // Current active order
    loading,
    error,
    createOrder,     // Create new order
    addItem,         // Add item to order
    removeItem,      // Remove item
    updateItem,      // Update item quantity
    clearItems,      // Clear all items
    holdOrder,       // Hold order
    resumeOrder,     // Resume held order
  } = useCurrentOrders(cashierId);

  // Component logic...
}
```

---

## Common Tasks

### Start New Order
```typescript
const order = await createOrder({
  customerId: 'customer-uuid',  // optional
  tableId: 'table-uuid',        // optional
  orderNotes: 'Extra ice'       // optional
});
```

### Add Item to Order
```typescript
await addItem(orderId, {
  product_id: 'product-uuid',
  item_name: 'Beer Bucket',
  quantity: 2,
  unit_price: 750.00,
  subtotal: 1500.00,
  discount_amount: 0,
  total: 1500.00,
  notes: 'Extra cold',
  addons: [
    {
      addon_id: 'addon-uuid',
      addon_name: 'Lemon',
      addon_price: 50.00,
      quantity: 2
    }
  ]
});
```

### Update Item Quantity
```typescript
await updateItem(orderId, itemId, {
  quantity: 3,
  subtotal: 2250.00,  // recalculated
  total: 2250.00       // recalculated
});
```

### Hold Order (Pause)
```typescript
await holdOrder(orderId);
// Order moved to "held" state
// Can start new order
```

### Resume Order
```typescript
await resumeOrder(orderId);
// Order becomes active again
```

---

## Troubleshooting

### "Cashier ID is required" error

**Fix**: Pass cashier ID to all API calls
```typescript
// ✅ Correct
await CurrentOrderRepository.getByCashier(user.id);

// ❌ Wrong
await CurrentOrderRepository.getByCashier();
```

### Seeing other cashiers' orders

**Fix**: Check RLS is enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'current_orders';
-- Should show: rowsecurity = true
```

### Totals not updating

**Fix**: Verify trigger exists
```sql
SELECT tgname FROM pg_trigger 
WHERE tgname = 'trigger_current_order_items_totals';
-- Should return 1 row
```

### Real-time not working

**Fix**: Enable Realtime in Supabase Dashboard
- Database → Replication
- Enable for all 3 tables

---

## Files Reference

### Created Files

**Database**:
- `migrations/create_current_orders_table.sql`

**Backend**:
- `src/data/repositories/CurrentOrderRepository.ts`
- `src/app/api/current-orders/route.ts`
- `src/app/api/current-orders/[orderId]/route.ts`
- `src/app/api/current-orders/[orderId]/items/route.ts`
- `src/app/api/current-orders/[orderId]/items/[itemId]/route.ts`

**Frontend**:
- `src/lib/hooks/useCurrentOrders.ts`
- `src/views/pos/CurrentOrderPanel.tsx`

**Documentation**:
- `docs/CURRENT_ORDERS_STAGING_TABLE.md` (full guide)
- `summary/CURRENT_ORDERS_STAGING_IMPLEMENTATION.md` (summary)
- `CURRENT_ORDERS_QUICK_SETUP.md` (this file)

---

## Benefits

### For Cashiers
✅ See only your own orders  
✅ No confusion with other cashiers  
✅ Real-time updates  
✅ Hold/resume for multi-customer handling  

### For Business
✅ Multiple POS terminals  
✅ Faster service  
✅ Accurate auto-calculated totals  
✅ Clear audit trail  

### For Developers
✅ Clean separation of concerns  
✅ Database-enforced security  
✅ Auto-calculated totals (no manual math)  
✅ Real-time subscriptions built-in  

---

## Next Steps

1. ✅ Run migration
2. ✅ Enable Realtime
3. ✅ Integrate component
4. ⬜ Test with multiple cashiers
5. ⬜ Train staff
6. ⬜ Deploy to production

---

## Need Help?

- **Full Documentation**: `docs/CURRENT_ORDERS_STAGING_TABLE.md`
- **Implementation Summary**: `summary/CURRENT_ORDERS_STAGING_IMPLEMENTATION.md`
- **Database Schema**: `migrations/create_current_orders_table.sql`

---

**Setup Complete! Start building orders! 🍺**
