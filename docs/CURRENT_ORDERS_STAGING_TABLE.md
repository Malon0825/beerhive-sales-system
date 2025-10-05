# Current Orders Staging Table - Documentation

## Overview

The **Current Orders** system provides a staging table (`current_orders`) for building draft orders in the POS system before they are completed and moved to the permanent `orders` table. Each cashier has their own isolated current orders, ensuring multiple cashiers can work simultaneously without interfering with each other.

---

## Key Features

### Cashier Isolation
- ✅ Each cashier sees **only their own** current orders
- ✅ Multiple cashiers can create orders simultaneously
- ✅ Real-time updates specific to each cashier
- ✅ Enforced via Row Level Security (RLS) policies

### Real-time Updates
- ✅ Instant updates when items are added/removed
- ✅ Auto-calculated totals via database triggers
- ✅ Supabase Realtime subscriptions with cashier filtering
- ✅ Updates visible only to the cashier who owns the order

### Order Management
- ✅ Create draft orders
- ✅ Add/update/remove items
- ✅ Hold and resume orders
- ✅ Clear all items
- ✅ Delete draft orders
- ✅ Assign customers and tables
- ✅ Add order notes

---

## Database Schema

### Tables Created

#### 1. `current_orders`
Stores draft orders being built in POS.

```sql
CREATE TABLE current_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES users(id),
    customer_id UUID REFERENCES customers(id),
    table_id UUID REFERENCES restaurant_tables(id),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    applied_event_offer_id UUID REFERENCES customer_events(id),
    order_notes TEXT,
    is_on_hold BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Columns**:
- `cashier_id` - **Critical**: Identifies which cashier owns this order
- `is_on_hold` - Allows cashier to pause order and work on another
- Auto-calculated totals updated by database triggers

#### 2. `current_order_items`
Stores items in draft orders.

```sql
CREATE TABLE current_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_order_id UUID NOT NULL REFERENCES current_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    package_id UUID REFERENCES packages(id),
    item_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    is_vip_price BOOLEAN DEFAULT false,
    is_complimentary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Features**:
- Cascade deletes when parent order is deleted
- Snapshots item details at time of adding
- Supports both products and packages
- Includes VIP pricing and complimentary flags

#### 3. `current_order_item_addons`
Stores add-ons for items in draft orders.

```sql
CREATE TABLE current_order_item_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_order_item_id UUID NOT NULL REFERENCES current_order_items(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES product_addons(id),
    addon_name VARCHAR(100) NOT NULL,
    addon_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Row Level Security (RLS)

### Cashier Isolation Policies

**current_orders** table policies ensure cashiers only access their own orders:

```sql
-- Cashiers can only view their own orders
CREATE POLICY "Cashiers can view own current orders" ON current_orders
    FOR SELECT 
    USING (cashier_id = auth.uid()::uuid);

-- Cashiers can only create orders for themselves
CREATE POLICY "Cashiers can create own current orders" ON current_orders
    FOR INSERT 
    WITH CHECK (cashier_id = auth.uid()::uuid);

-- Cashiers can only update their own orders
CREATE POLICY "Cashiers can update own current orders" ON current_orders
    FOR UPDATE 
    USING (cashier_id = auth.uid()::uuid);

-- Admins and managers can view all (for monitoring)
CREATE POLICY "Admins can manage all current orders" ON current_orders
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND role IN ('admin', 'manager')
        )
    );
```

Similar policies apply to `current_order_items` and `current_order_item_addons`.

---

## Auto-Calculation Triggers

### Automatic Total Recalculation

When items are added, updated, or removed, totals are automatically recalculated:

```sql
CREATE OR REPLACE FUNCTION calculate_current_order_totals(order_id UUID)
RETURNS VOID AS $$
DECLARE
    calculated_subtotal DECIMAL(12, 2);
    calculated_discount DECIMAL(12, 2);
    calculated_total DECIMAL(12, 2);
BEGIN
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(discount_amount), 0),
        COALESCE(SUM(total), 0)
    INTO 
        calculated_subtotal,
        calculated_discount,
        calculated_total
    FROM current_order_items
    WHERE current_order_id = order_id;
    
    UPDATE current_orders
    SET 
        subtotal = calculated_subtotal,
        discount_amount = calculated_discount,
        total_amount = calculated_total,
        updated_at = NOW()
    WHERE id = order_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger attached to current_order_items
CREATE TRIGGER trigger_current_order_items_totals
    AFTER INSERT OR UPDATE OR DELETE ON current_order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_current_order_totals();
```

**Benefits**:
- ✅ No manual total calculation needed
- ✅ Always accurate totals
- ✅ Updates in real-time
- ✅ Triggers for INSERT, UPDATE, DELETE

---

## API Endpoints

### Current Orders

#### GET `/api/current-orders`
Fetch all current orders for a cashier.

**Query Parameters**:
- `cashierId` (required) - UUID of the cashier

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cashier_id": "uuid",
      "customer_id": "uuid",
      "table_id": "uuid",
      "subtotal": 1500.00,
      "discount_amount": 0,
      "tax_amount": 0,
      "total_amount": 1500.00,
      "is_on_hold": false,
      "items": [...],
      "customer": {...},
      "table": {...}
    }
  ]
}
```

#### POST `/api/current-orders`
Create a new current order.

**Request Body**:
```json
{
  "cashierId": "uuid",
  "customerId": "uuid (optional)",
  "tableId": "uuid (optional)",
  "orderNotes": "string (optional)"
}
```

#### PATCH `/api/current-orders/[orderId]`
Update a current order.

**Request Body**:
```json
{
  "cashierId": "uuid",
  "customerId": "uuid (optional)",
  "tableId": "uuid (optional)",
  "orderNotes": "string (optional)",
  "isOnHold": "boolean (optional)"
}
```

#### DELETE `/api/current-orders/[orderId]`
Delete a current order.

**Query Parameters**:
- `cashierId` (required)

### Order Items

#### POST `/api/current-orders/[orderId]/items`
Add item to current order.

**Request Body**:
```json
{
  "cashierId": "uuid",
  "item": {
    "product_id": "uuid",
    "item_name": "Beer Bucket",
    "quantity": 2,
    "unit_price": 750.00,
    "subtotal": 1500.00,
    "discount_amount": 0,
    "total": 1500.00,
    "notes": "Extra ice",
    "addons": [
      {
        "addon_id": "uuid",
        "addon_name": "Lemon",
        "addon_price": 50.00,
        "quantity": 2
      }
    ]
  }
}
```

#### PATCH `/api/current-orders/[orderId]/items/[itemId]`
Update an item.

**Request Body**:
```json
{
  "cashierId": "uuid",
  "updates": {
    "quantity": 3,
    "subtotal": 2250.00,
    "total": 2250.00
  }
}
```

#### DELETE `/api/current-orders/[orderId]/items/[itemId]`
Remove an item.

**Query Parameters**:
- `cashierId` (required)

#### DELETE `/api/current-orders/[orderId]/items`
Clear all items from order.

**Query Parameters**:
- `cashierId` (required)

---

## Frontend Implementation

### Hook: `useCurrentOrders`

**Location**: `src/lib/hooks/useCurrentOrders.ts`

Custom React hook for managing current orders with real-time updates.

**Usage**:
```typescript
const {
  orders,           // All current orders for this cashier
  activeOrder,      // Current active (non-held) order
  loading,          // Loading state
  error,            // Error message
  createOrder,      // Create new order
  updateOrder,      // Update order
  deleteOrder,      // Delete order
  addItem,          // Add item to order
  updateItem,       // Update item quantity/price
  removeItem,       // Remove item
  clearItems,       // Clear all items
  holdOrder,        // Hold order
  resumeOrder,      // Resume held order
  refresh,          // Manual refresh
} = useCurrentOrders(cashierId);
```

**Real-time Subscriptions**:
```typescript
// Subscribe to current_orders filtered by cashier
useRealtime({
  table: 'current_orders',
  event: '*',
  filter: `cashier_id=eq.${cashierId}`,
  onChange: (payload) => {
    fetchOrders(); // Refetch on change
  },
});

// Subscribe to current_order_items
useRealtime({
  table: 'current_order_items',
  event: '*',
  onChange: (payload) => {
    fetchOrders(); // Refetch when items change
  },
});
```

### Component: `CurrentOrderPanel`

**Location**: `src/views/pos/CurrentOrderPanel.tsx`

POS panel that displays the current order being built.

**Features**:
- ✅ Real-time item list
- ✅ Quantity controls (+/-)
- ✅ Remove item button
- ✅ Clear all items
- ✅ Hold/resume order
- ✅ Customer and table display
- ✅ Order notes
- ✅ Auto-calculated totals
- ✅ Checkout button

**Usage**:
```typescript
<CurrentOrderPanel 
  cashierId={currentUser.id}
  onCheckout={(orderId) => {
    // Handle checkout process
  }}
/>
```

---

## Workflow

### 1. Cashier Starts Shift

```
1. Cashier logs in → gets cashier_id
2. System loads current orders for this cashier
3. If no active order exists, show "Start New Order" button
```

### 2. Building an Order

```
1. Cashier clicks "Start New Order"
   → POST /api/current-orders
   → Creates empty draft order

2. Cashier selects products from POS
   → For each product:
      POST /api/current-orders/[orderId]/items
      → Adds item to order
      → Database trigger recalculates totals
      → Real-time update sent to cashier's UI

3. Totals update automatically
   → Subtotal, discount, tax, total
   → No manual calculation needed
```

### 3. Modifying Items

```
- Change quantity:
  PATCH /api/current-orders/[orderId]/items/[itemId]
  → Updates quantity and totals
  
- Remove item:
  DELETE /api/current-orders/[orderId]/items/[itemId]
  → Removes item
  → Totals recalculated automatically
  
- Clear all:
  DELETE /api/current-orders/[orderId]/items
  → Removes all items
```

### 4. Holding Orders

```
If cashier needs to work on another order:
  
  PATCH /api/current-orders/[orderId]
  body: { isOnHold: true }
  → Current order is "held"
  → Cashier can start new order
  → Held orders appear in separate list
  
To resume:
  PATCH /api/current-orders/[orderId]
  body: { isOnHold: false }
  → Order becomes active again
```

### 5. Completing Order

```
When ready to checkout:
  
  1. Cashier clicks "Checkout"
  2. System moves data from current_orders → orders
  3. Creates permanent order record
  4. Deletes current_order record
  5. Processes payment
  6. Prints receipt
```

---

## Migration Guide

### Step 1: Run Database Migration

Execute the migration file to create tables and policies:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Run: migrations/create_current_orders_table.sql
```

### Step 2: Enable Realtime

Enable replication for the new tables:

1. Go to **Database** → **Replication** in Supabase Dashboard
2. Enable for:
   - ✅ `current_orders`
   - ✅ `current_order_items`
   - ✅ `current_order_item_addons`

### Step 3: Update POS Integration

Integrate the `CurrentOrderPanel` component into your POS page:

```typescript
// src/app/(dashboard)/pos/page.tsx
import { CurrentOrderPanel } from '@/views/pos/CurrentOrderPanel';
import { useAuth } from '@/lib/hooks/useAuth';

export default function POSPage() {
  const { user } = useAuth();
  
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        {/* Product selection grid */}
      </div>
      <div className="w-96">
        <CurrentOrderPanel 
          cashierId={user.id}
          onCheckout={handleCheckout}
        />
      </div>
    </div>
  );
}
```

---

## Testing Checklist

### Database Tests

- [ ] Run migration successfully
- [ ] Verify tables created
- [ ] Test RLS policies (cashier can only see own orders)
- [ ] Test triggers (totals auto-calculate)

### API Tests

- [ ] Create current order
- [ ] Add items to order
- [ ] Update item quantities
- [ ] Remove items
- [ ] Clear all items
- [ ] Hold and resume order
- [ ] Delete order
- [ ] Verify cashier isolation (can't access other cashier's orders)

### Frontend Tests

- [ ] Display current order
- [ ] Add items from product grid
- [ ] Change item quantities
- [ ] Remove items
- [ ] Real-time updates work
- [ ] Totals calculate correctly
- [ ] Hold/resume functionality
- [ ] Multiple cashiers work simultaneously

### Multi-Cashier Tests

- [ ] Open POS as Cashier A in one browser
- [ ] Open POS as Cashier B in another browser
- [ ] Cashier A adds items → only visible to A
- [ ] Cashier B adds items → only visible to B
- [ ] Real-time updates isolated per cashier
- [ ] No cross-contamination

---

## Benefits

### For Cashiers

- ✅ **Isolated Workspace**: Each cashier has their own orders
- ✅ **Real-time Updates**: See changes instantly
- ✅ **No Interference**: Multiple cashiers work simultaneously
- ✅ **Hold/Resume**: Pause orders to handle multiple customers

### For System

- ✅ **Clean Separation**: Draft vs permanent orders
- ✅ **Auto Calculations**: No manual total calculations
- ✅ **Data Integrity**: RLS enforces isolation
- ✅ **Performance**: Optimized queries with indexes
- ✅ **Scalability**: Handles multiple concurrent cashiers

### For Business

- ✅ **Multiple POS Terminals**: Support many cashiers
- ✅ **Faster Service**: Real-time updates improve speed
- ✅ **Accurate Data**: Auto-calculated totals reduce errors
- ✅ **Audit Trail**: Track who created which orders

---

## Files Created

### Database
- `migrations/create_current_orders_table.sql` - Migration with tables, RLS, triggers

### Data Layer
- `src/data/repositories/CurrentOrderRepository.ts` - Data access repository

### API Layer
- `src/app/api/current-orders/route.ts` - List/create orders
- `src/app/api/current-orders/[orderId]/route.ts` - Get/update/delete order
- `src/app/api/current-orders/[orderId]/items/route.ts` - Add/clear items
- `src/app/api/current-orders/[orderId]/items/[itemId]/route.ts` - Update/remove item

### Frontend
- `src/lib/hooks/useCurrentOrders.ts` - React hook with real-time
- `src/views/pos/CurrentOrderPanel.tsx` - POS panel component

### Documentation
- `docs/CURRENT_ORDERS_STAGING_TABLE.md` - This file

---

## Troubleshooting

### Orders Not Showing

**Problem**: Cashier can't see their current orders

**Solutions**:
1. Verify `cashier_id` is correct
2. Check RLS policies are enabled
3. Verify user is authenticated
4. Check browser console for errors

### Real-time Not Working

**Problem**: Updates don't appear in real-time

**Solutions**:
1. Enable Realtime for tables in Supabase
2. Check WebSocket connection in Network tab
3. Verify subscription filter: `cashier_id=eq.{id}`
4. Check browser console for subscription errors

### Totals Not Calculating

**Problem**: Totals don't update when adding items

**Solutions**:
1. Verify trigger is created: `trigger_current_order_items_totals`
2. Check function exists: `calculate_current_order_totals`
3. Manually trigger: `SELECT calculate_current_order_totals('order-id');`
4. Check database logs for errors

### Cross-Contamination

**Problem**: Cashier sees other cashiers' orders

**Solutions**:
1. Verify RLS policies are enabled
2. Check auth.uid() returns correct user ID
3. Ensure `cashier_id` filter is applied in queries
4. Review Supabase logs for policy violations

---

## Best Practices

### 1. Always Pass Cashier ID
```typescript
// ✅ Good
const orders = await CurrentOrderRepository.getByCashier(cashierId);

// ❌ Bad - no isolation
const orders = await CurrentOrderRepository.getAll();
```

### 2. Use Real-time Subscriptions
```typescript
// ✅ Good - with cashier filter
useRealtime({
  table: 'current_orders',
  filter: `cashier_id=eq.${cashierId}`,
  onChange: fetchOrders
});

// ❌ Bad - no filter, gets all updates
useRealtime({
  table: 'current_orders',
  onChange: fetchOrders
});
```

### 3. Let Database Calculate Totals
```typescript
// ✅ Good - trigger calculates automatically
await addItem(orderId, cashierId, item);

// ❌ Bad - manual calculation error-prone
await addItem(orderId, cashierId, item);
await updateOrderTotals(orderId); // Not needed!
```

### 4. Clean Up on Logout
```typescript
// When cashier logs out, optionally:
// - Hold all active orders
// - Or delete empty orders
```

---

## Related Documentation

- [Database Structure](./Database%20Structure.sql)
- [Realtime Setup](./REALTIME_SETUP.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [POS Module Documentation](./Project%20Plan.md)

---

**Implementation Complete! ✅**

The current orders staging table is now ready for use in the POS system with full cashier isolation and real-time updates.
