# Current Order Monitor Feature

## Overview

The Current Order Monitor feature provides real-time order tracking for both customers and staff. It consists of two main interfaces:

1. **Customer-Facing Monitor** - Public interface for customers to view their current bill
2. **Staff Dashboard** - Protected interface for cashiers, managers, and admins to monitor all active orders

## Features

### Customer-Facing Monitor

- **Real-time Updates**: Automatically updates when items are added/removed from the order
- **QR Code Access**: Customers can scan QR codes at their table to view their bill
- **Detailed Bill View**: Shows all items, quantities, prices, discounts, and total
- **VIP Pricing Indicators**: Highlights VIP prices and complimentary items
- **Customer Info**: Displays customer name and tier
- **No Authentication Required**: Public access for customer convenience

### Staff Dashboard

- **All Orders Overview**: Displays all pending and on-hold orders
- **Real-time Updates**: Automatically refreshes when orders change
- **Summary Statistics**: Shows active order count and total revenue
- **Order Details**: Full information including:
  - Order number and status
  - Customer information and tier
  - Table assignment
  - Cashier who created the order
  - All order items with quantities and prices
  - Time elapsed since order creation
- **Role-Based Access**: Only accessible to Cashiers, Managers, and Admins
- **Interactive Cards**: Click on orders to highlight and focus
- **Manual Refresh**: Button to force data refresh

## Technical Architecture

### Routes

#### Customer-Facing
- **Page Route**: `/order-monitor/[tableNumber]`
- **Example**: `/order-monitor/T-01`
- **Access**: Public (no authentication)

#### Staff Dashboard
- **Page Route**: `/current-orders`
- **Access**: Protected (Cashier, Manager, Admin only)

### API Endpoints

#### GET /api/orders/current
Fetches all current (pending and on-hold) orders with full details.

**Query Parameters:**
- `tableId` (optional): Filter orders by specific table ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD20241006001",
      "subtotal": 1500.00,
      "discount_amount": 150.00,
      "total_amount": 1350.00,
      "status": "pending",
      "created_at": "2025-10-06T02:00:00Z",
      "customer": {
        "full_name": "John Doe",
        "tier": "vip_gold"
      },
      "table": {
        "table_number": "T-01",
        "area": "Indoor"
      },
      "order_items": [...]
    }
  ]
}
```

#### GET /api/orders/by-table/[tableNumber]
Fetches the current order for a specific table by table number.

**Parameters:**
- `tableNumber`: The table number (e.g., "T-01")

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "ORD20241006001",
    "total_amount": 1350.00,
    "order_items": [...],
    "table": {...}
  }
}
```

Returns `null` data if no active order exists for the table.

### Components

#### CurrentOrderMonitor
**Location**: `src/views/orders/CurrentOrderMonitor.tsx`

Customer-facing component that displays a single table's current order.

**Props:**
- `tableNumber` (string): The table number to monitor
- `refreshInterval` (number, optional): Refresh interval in milliseconds (default: 5000)

**Features:**
- Real-time subscriptions to `orders` and `order_items` tables
- Periodic polling as backup
- Beautiful gradient design with responsive layout
- Error and empty state handling
- Customer tier badges
- VIP price and complimentary item indicators

#### StaffOrderMonitor
**Location**: `src/views/orders/StaffOrderMonitor.tsx`

Staff dashboard component that displays all current orders.

**Features:**
- Real-time subscriptions to `orders` and `order_items` tables
- Summary statistics cards
- Grid layout for multiple orders
- Interactive order cards
- Status and tier badges
- Time elapsed calculation
- Manual refresh button

### Real-time Implementation

Both components use the `useRealtime` hook to subscribe to database changes:

```typescript
// Subscribe to orders table
useRealtime({
  table: 'orders',
  event: '*',
  onChange: (payload) => {
    fetchOrders(); // Refetch when changes occur
  },
});

// Subscribe to order_items table
useRealtime({
  table: 'order_items',
  event: '*',
  onChange: (payload) => {
    fetchOrders(); // Refetch when items change
  },
});
```

## Setup Instructions

### 1. Enable Realtime in Supabase

Ensure the following tables have replication enabled in Supabase:

1. Go to **Database** → **Replication** in Supabase Dashboard
2. Enable replication for:
   - ✅ `orders`
   - ✅ `order_items`
   - ✅ `restaurant_tables`

### 2. Update Navigation (Optional)

Add a link to the staff dashboard in the sidebar:

**File**: `src/views/shared/layouts/Sidebar.tsx`

```typescript
{
  title: 'Current Orders',
  href: '/current-orders',
  icon: <Clock className="w-5 h-5" />,
  roles: ['cashier', 'manager', 'admin'],
}
```

### 3. Generate QR Codes for Tables

To enable easy customer access, generate QR codes for each table:

**QR Code URL Format:**
```
https://your-domain.com/order-monitor/[table-number]
```

**Example:**
```
https://beerhive.com/order-monitor/T-01
```

**Tools for QR Code Generation:**
- Online: https://www.qr-code-generator.com/
- Node.js: `qrcode` npm package
- Python: `qrcode` library

**Recommended Approach:**
Create a script to generate QR codes for all tables:

```typescript
// scripts/generate-table-qr-codes.ts
import QRCode from 'qrcode';

const tables = ['T-01', 'T-02', 'T-03', ...];
const baseUrl = 'https://beerhive.com/order-monitor/';

for (const table of tables) {
  const url = baseUrl + table;
  await QRCode.toFile(`./qr-codes/${table}.png`, url);
}
```

Print the QR codes and place them on each table.

## Usage Guide

### For Customers

1. Scan the QR code on your table
2. View your current order in real-time
3. See items, quantities, and prices
4. Check your total bill before payment
5. Page updates automatically when items are added/removed

### For Staff

1. Navigate to **Current Orders** in the sidebar (or `/current-orders`)
2. View all active orders in the dashboard
3. Click on an order card to highlight it
4. Monitor order status and time elapsed
5. Check total revenue from active orders
6. Use the refresh button if needed

## Testing Checklist

### Customer Monitor Testing

- [ ] Access `/order-monitor/T-01` (or any valid table number)
- [ ] Verify order displays correctly with all items
- [ ] Add a new item to the order from POS
- [ ] Verify the customer monitor updates automatically
- [ ] Remove an item from the order
- [ ] Verify the total updates in real-time
- [ ] Test with a table that has no order
- [ ] Verify proper empty state message
- [ ] Test with an invalid table number
- [ ] Verify proper error handling
- [ ] Test VIP price indicators
- [ ] Test complimentary item badges
- [ ] Test with different customer tiers

### Staff Dashboard Testing

- [ ] Log in as cashier and access `/current-orders`
- [ ] Verify all active orders are displayed
- [ ] Check summary statistics (order count, revenue)
- [ ] Create a new order from POS
- [ ] Verify new order appears in dashboard
- [ ] Complete an order
- [ ] Verify order disappears from dashboard
- [ ] Put an order on hold
- [ ] Verify status updates correctly
- [ ] Test with multiple simultaneous orders
- [ ] Test real-time updates with two browser windows
- [ ] Click on order cards to test selection
- [ ] Test manual refresh button
- [ ] Test access control (kitchen/bartender shouldn't access)
- [ ] Verify time elapsed updates correctly

### Performance Testing

- [ ] Test with 20+ simultaneous orders
- [ ] Verify real-time updates don't cause lag
- [ ] Check memory usage with long-running session
- [ ] Test network resilience (disconnect/reconnect)

## Troubleshooting

### Orders Not Updating in Real-time

1. Check Supabase Realtime is enabled for `orders` and `order_items` tables
2. Verify browser console for subscription errors
3. Check network tab for WebSocket connection
4. Ensure proper environment variables are set

### Customer Monitor Shows "No Active Order" for Occupied Table

1. Verify the order status is 'pending' or 'on_hold'
2. Check that `table.current_order_id` is set correctly
3. Ensure the table number in URL matches database

### Staff Dashboard Access Denied

1. Verify user role is cashier, manager, or admin
2. Check authentication state
3. Verify RLS policies allow access

### Performance Issues

1. Limit the number of orders displayed
2. Implement pagination for large datasets
3. Optimize real-time subscriptions with filters
4. Consider debouncing rapid updates

## Future Enhancements

- [ ] Add order filtering (by status, table, cashier)
- [ ] Add search functionality
- [ ] Export order data to Excel/PDF
- [ ] Add sound notifications for new orders
- [ ] Implement order grouping by area
- [ ] Add time-based alerts (orders over 30 minutes)
- [ ] Create print view for customer receipts
- [ ] Add customer feedback option
- [ ] Implement order priority indicators
- [ ] Add estimated completion time

## Files Created

### API Routes
- `src/app/api/orders/current/route.ts`
- `src/app/api/orders/by-table/[tableNumber]/route.ts`

### Components
- `src/views/orders/CurrentOrderMonitor.tsx`
- `src/views/orders/StaffOrderMonitor.tsx`

### Pages
- `src/app/(public)/order-monitor/[tableNumber]/page.tsx`
- `src/app/(public)/layout.tsx`
- `src/app/(dashboard)/current-orders/page.tsx`

### Documentation
- `docs/CURRENT_ORDER_MONITOR_FEATURE.md` (this file)

## Related Documentation

- [Database Structure](./Database%20Structure.sql)
- [Realtime Setup](./REALTIME_SETUP.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Tech Stack](./Tech%20Stack.md)

## Notes

- Customer-facing monitor is intentionally public (no auth) for ease of use
- Staff dashboard requires authentication for security
- Both interfaces use the same real-time infrastructure
- Components are designed to be under 500 lines as per coding standards
- All functions and classes include JSDoc comments
- Real-time updates use Supabase's efficient WebSocket connections
- Fallback polling ensures updates even if WebSocket fails
