# Current Order Monitor - Quick Start Guide

## What's New?

Two new pages have been added to monitor current orders in real-time:

1. **Customer Monitor** - Public page for customers to view their bill
2. **Staff Dashboard** - Protected page for staff to monitor all active orders

---

## Customer Monitor

### Access
```
URL: /order-monitor/[table-number]
Example: /order-monitor/T-01
Access: Public (no login required)
```

### Purpose
Allows customers to view their current bill before payment by scanning a QR code at their table.

### Features
- ✅ Real-time updates when items are added/removed
- ✅ Shows all order items with quantities and prices
- ✅ Displays discounts and VIP pricing
- ✅ Shows customer information and tier
- ✅ Beautiful, responsive design

### How to Set Up QR Codes

1. **Generate QR codes** for each table pointing to:
   ```
   https://your-domain.com/order-monitor/T-01
   https://your-domain.com/order-monitor/T-02
   etc.
   ```

2. **Print and place** the QR codes on each table

3. **Customers scan** the code to view their current order

---

## Staff Dashboard

### Access
```
URL: /current-orders
Access: Cashier, Manager, Admin only
Navigation: Sidebar → "Current Orders"
```

### Purpose
Provides staff with a real-time overview of all active orders across all tables.

### Features
- ✅ Shows all pending and on-hold orders
- ✅ Real-time updates when orders change
- ✅ Summary statistics (order count, total revenue)
- ✅ Order details (customer, table, items, cashier)
- ✅ Time elapsed since order creation
- ✅ Interactive cards (click to highlight)
- ✅ Manual refresh button

### Usage
1. Navigate to "Current Orders" in the sidebar
2. View all active orders in grid layout
3. Click on any order card to highlight it
4. Monitor real-time updates as orders are created/updated
5. Use refresh button if needed

---

## Real-time Updates

Both pages update automatically when:
- ✅ New orders are created
- ✅ Items are added to orders
- ✅ Items are removed from orders
- ✅ Orders are completed or voided
- ✅ Order status changes

No manual refresh needed!

---

## Testing the Feature

### Test Customer Monitor

1. **Create an order** from POS for table T-01
2. **Open** `/order-monitor/T-01` in a browser
3. **Verify** the order displays correctly
4. **Add an item** to the order from POS
5. **Verify** the customer monitor updates automatically
6. **Remove an item** from the order
7. **Verify** the total updates in real-time

### Test Staff Dashboard

1. **Log in** as cashier, manager, or admin
2. **Navigate** to "Current Orders" in sidebar
3. **Create** 2-3 orders from POS
4. **Verify** all orders appear in dashboard
5. **Complete** one order
6. **Verify** it disappears from the dashboard
7. **Add items** to another order
8. **Verify** the order updates in real-time

---

## Troubleshooting

### "No Active Order" message appears for occupied table
- ✅ Verify the order status is 'pending' or 'on_hold'
- ✅ Check the table's `current_order_id` is set
- ✅ Ensure the table number in URL matches database

### Orders not updating in real-time
- ✅ Check Supabase Realtime is enabled for `orders` and `order_items` tables
- ✅ Verify browser console for errors
- ✅ Check network tab for WebSocket connection

### Staff dashboard shows "Access Denied"
- ✅ Verify user role is cashier, manager, or admin
- ✅ Check authentication state
- ✅ Try logging out and back in

---

## Key Files

### API Routes
- `src/app/api/orders/current/route.ts` - Get all current orders
- `src/app/api/orders/by-table/[tableNumber]/route.ts` - Get order by table

### Components
- `src/views/orders/CurrentOrderMonitor.tsx` - Customer monitor component
- `src/views/orders/StaffOrderMonitor.tsx` - Staff dashboard component

### Pages
- `src/app/(public)/order-monitor/[tableNumber]/page.tsx` - Customer page
- `src/app/(dashboard)/current-orders/page.tsx` - Staff page

---

## Benefits

### For Customers
- 👀 **Transparency**: See exactly what they're paying for
- 💰 **No Surprises**: Know the total before payment
- ⚡ **Real-time**: Always up-to-date bill
- 📱 **Easy Access**: Simple QR code scan

### For Staff
- 📊 **Overview**: See all active orders at once
- 💵 **Revenue Tracking**: Real-time total revenue
- ⏱️ **Time Monitoring**: Track how long orders have been pending
- 🔄 **Efficiency**: No need to manually check each table

---

## Next Steps

1. ✅ **Test** both interfaces thoroughly
2. ✅ **Generate QR codes** for all tables
3. ✅ **Train staff** on using the dashboard
4. ✅ **Print and place** QR codes on tables
5. ✅ **Enable** Supabase Realtime for required tables

---

## Need Help?

Refer to the full documentation:
- `docs/CURRENT_ORDER_MONITOR_FEATURE.md` - Complete feature documentation
- `docs/REALTIME_SETUP.md` - Realtime configuration guide
- `docs/Database Structure.sql` - Database schema reference

---

**Happy Monitoring! 🍺**
