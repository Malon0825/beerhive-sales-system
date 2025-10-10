# Waiter/Server Module

## Overview
The Waiter module allows servers to view orders that have been prepared by the kitchen/bartender and are ready for delivery to customers.

## Purpose
Completes the order fulfillment workflow:
```
Cashier → Kitchen/Bartender → Waiter → Customer
(Create)   (Prepare → Ready)   (Serve)  (Receive)
```

## Features

### ✅ View Ready Orders
- Shows only orders with status **"ready"**
- Grouped by table for efficient delivery
- Realtime updates when kitchen marks items ready
- Visual indicators for items waiting too long (>5 min)

### ✅ Mark as Served
- One-click to mark items as delivered
- Updates order status to "served"
- Removes from both kitchen and waiter displays
- Sends update to all connected displays via realtime

### ✅ Order Grouping
- Orders grouped by table number
- Shows all ready items for each table
- Makes it easy to deliver entire table orders at once
- Handles takeout orders separately

### ✅ Time Tracking
- Shows how long each item has been ready
- Alerts for items waiting >5 minutes
- Helps prioritize deliveries

## User Interface

### Page: `/waiter`

**Header:**
- Current date/time
- Total ready items count
- Number of tables with ready orders
- Refresh button

**Main Display:**
- Orders grouped by table
- Each table shows:
  - Table number or "Takeout"
  - Number of ready items
  - Time since oldest item ready
  - Individual order cards

**Order Cards:**
- Item name and quantity
- Order number
- Time ready
- Special instructions (if any)
- "Mark as Served" button
- Visual alert if waiting too long

## Workflow

### Step 1: Kitchen Prepares Order
```
Kitchen staff clicks "Mark Ready" on kitchen display
   ↓
Order status changes: preparing → ready
   ↓
Realtime update triggers
   ↓
Order appears on waiter display
```

### Step 2: Waiter Delivers Order
```
Waiter sees order on /waiter page
   ↓
Waiter picks up items from kitchen pass
   ↓
Waiter delivers to table
   ↓
Waiter clicks "Mark as Served"
   ↓
Order status changes: ready → served
   ↓
Order removed from both displays
```

## Access Control

### Required Role: `waiter`

Create waiter users with:
```sql
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES 
  ('waiter1', 'waiter1@beerhive.com', 'hashed_password', 'John Server', 'waiter'),
  ('waiter2', 'waiter2@beerhive.com', 'hashed_password', 'Jane Server', 'waiter');
```

Or via API (PowerShell):
```powershell
$body = @{
    username = "waiter1"
    email = "waiter1@beerhive.com"
    password = "Waiter123!"
    full_name = "John Server"
    role = "waiter"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

## Components

### WaiterDisplay.tsx
Main container component
- Fetches ready orders from API
- Subscribes to realtime updates
- Groups orders by table
- Handles order served actions

### ReadyOrderCard.tsx
Individual order display
- Shows order details
- Time tracking
- Special instructions display
- Mark as served button

## API Endpoints Used

### GET `/api/kitchen/orders?destination=kitchen`
- Fetches all kitchen orders
- Filtered client-side for "ready" status
- Returns orders with related data (order, table, items)

### PATCH `/api/kitchen/orders/[orderId]/status`
- Updates order status to "served"
- Body: `{ status: "served" }`
- Triggers realtime update

## Realtime Subscriptions

Subscribes to `kitchen_orders` table:
```typescript
supabase
  .channel('waiter-orders-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'kitchen_orders'
  }, callback)
  .subscribe()
```

**Triggers toast notification when:**
- Kitchen marks order as ready (UPDATE event)
- Shows: "Order Ready! New order ready for delivery"

## Visual Design

### Color Scheme
- **Primary**: Green (ready status)
- **Alert**: Yellow/Red (delayed orders)
- **Background**: Green-50 for ready items

### Icons
- ✅ CheckCircle - Ready/Served status
- 🕐 Clock - Time tracking
- 🍽️ Table indicator
- 📦 Takeout indicator

## Testing the Waiter Module

### 1. Setup
```bash
# Ensure dev server is running
npm run dev

# Enable realtime on kitchen_orders table in Supabase
```

### 2. Create Test Order
1. Go to POS: `http://localhost:3000/pos`
2. Add items to cart
3. Complete payment

### 3. Prepare Order (Kitchen)
1. Go to Kitchen: `http://localhost:3000/kitchen`
2. Find the order
3. Click "Start Preparing"
4. Click "Mark Ready"

### 4. Deliver Order (Waiter)
1. Go to Waiter: `http://localhost:3000/waiter`
2. Order should appear automatically
3. Click "Mark as Served"
4. Order disappears from display

### 5. Verify Realtime
1. Open waiter page in Browser 1
2. Open kitchen page in Browser 2
3. Mark order ready in kitchen
4. Waiter page updates automatically ✨

## Performance Considerations

### Optimizations
- Orders filtered client-side (no extra API calls)
- Realtime subscriptions shared across components
- Grouped display reduces visual clutter
- Auto-removes served orders

### Scalability
- Efficient for up to 50+ concurrent orders
- Grouped by table reduces scrolling
- Time-based prioritization built-in

## Future Enhancements

### Possible Additions
- [ ] Sort by wait time (longest waiting first)
- [ ] Filter by area (dining room, patio, bar)
- [ ] Print delivery slips
- [ ] Track waiter delivery times
- [ ] Delivery confirmation from customer (tablet/QR)
- [ ] Integration with table management
- [ ] Multi-item batch serving (mark all table items)
- [ ] Push notifications for mobile waiters

## Integration Points

### With Kitchen Module
- Kitchen marks items "ready" → Waiter sees them
- Shared realtime subscriptions
- Same API endpoints

### With Table Management
- Shows table numbers from restaurant_tables
- Could integrate with table status
- Could auto-release table when all items served

### With Order Management
- Links back to original order
- Could show order totals
- Could integrate with payment status

## User Roles Comparison

| Role | View Orders | Prepare | Mark Ready | Mark Served |
|------|-------------|---------|------------|-------------|
| Cashier | ✅ (Create) | ❌ | ❌ | ❌ |
| Kitchen | ✅ (Pending/Preparing) | ✅ | ✅ | ❌ |
| Bartender | ✅ (Pending/Preparing) | ✅ | ✅ | ❌ |
| Waiter | ✅ (Ready only) | ❌ | ❌ | ✅ |

## Complete Order Status Flow

```
pending (Cashier creates)
   ↓
preparing (Kitchen/Bartender starts)
   ↓
ready (Kitchen/Bartender completes)
   ↓
served (Waiter delivers) ← NEW!
```

## Files Created

```
src/
├── app/(dashboard)/waiter/
│   └── page.tsx                    # Waiter page route
├── views/waiter/
│   ├── WaiterDisplay.tsx           # Main waiter interface
│   └── ReadyOrderCard.tsx          # Individual order card
└── models/enums/
    └── UserRole.ts                 # Added WAITER role
```

## Summary

The Waiter module:
✅ Shows orders ready for delivery  
✅ Grouped by table for efficiency  
✅ Realtime updates from kitchen  
✅ One-click mark as served  
✅ Time tracking and alerts  
✅ Clean, focused UI  

**Result**: Complete order fulfillment workflow from creation to delivery! 🎉
