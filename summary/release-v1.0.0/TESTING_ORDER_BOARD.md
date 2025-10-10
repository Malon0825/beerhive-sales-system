# Order Board - Testing Guide

## Prerequisites
1. Development server is running: `npm run dev`
2. Database has sample orders (or create new ones)
3. User is logged in to the system

## Test Scenarios

### 1. Basic Navigation
**Steps:**
1. Log in to the system
2. Look for "Order Board" in the sidebar navigation (Monitor icon)
3. Click on "Order Board"

**Expected Result:**
- ✅ Page loads at `/order-board`
- ✅ Order board displays with header "Order Board"
- ✅ Statistics dashboard shows counts (Total, Pending, Completed, Voided)
- ✅ Last update timestamp is displayed

### 2. View Existing Orders
**Steps:**
1. Navigate to Order Board
2. Observe the displayed orders

**Expected Result:**
- ✅ Orders display as cards in a grid layout
- ✅ Each card shows:
  - Order number (e.g., ORD24010100001)
  - Date and time created
  - Status badge (colored appropriately)
  - Customer name and number (if applicable)
  - Table number and area (if applicable)
  - List of order items with quantities and prices
  - Total amount

### 3. Real-Time Order Creation
**Steps:**
1. Open Order Board in one browser tab/window
2. Open POS interface in another tab/window
3. Create a new order from POS:
   - Add items to cart
   - Select customer (optional)
   - Select table (optional)
   - Complete the order
4. Switch back to Order Board tab

**Expected Result:**
- ✅ New order appears on the board automatically
- ✅ No manual refresh required
- ✅ Statistics update to reflect new order
- ✅ "Last update" timestamp refreshes

### 4. Status Filtering
**Steps:**
1. Navigate to Order Board
2. Note the total order count
3. Click "Pending" filter button
4. Click "Completed" filter button
5. Click "Voided" filter button
6. Click "All" filter button

**Expected Result:**
- ✅ Clicking each filter updates the displayed orders
- ✅ Only orders with selected status are shown
- ✅ Filter button shows count in parentheses (e.g., "Pending (5)")
- ✅ Active filter button is highlighted
- ✅ "All" shows all orders regardless of status

### 5. Statistics Dashboard
**Steps:**
1. Navigate to Order Board
2. Observe the four statistic cards at the top

**Expected Result:**
- ✅ "Total Orders" shows count of all orders (blue)
- ✅ "Pending" shows count of pending orders (yellow)
- ✅ "Completed" shows count of completed orders (green)
- ✅ "Voided" shows count of voided orders (red)
- ✅ Counts update when new orders are created

### 6. Manual Refresh
**Steps:**
1. Navigate to Order Board
2. Note the "Last update" timestamp
3. Click the "Refresh" button (with refresh icon)
4. Observe the button and timestamp

**Expected Result:**
- ✅ Button shows loading spinner during refresh
- ✅ Button is disabled during refresh
- ✅ Orders reload from API
- ✅ "Last update" timestamp updates
- ✅ Statistics refresh

### 7. Order Status Update (Real-Time)
**Steps:**
1. Keep Order Board open
2. In another tab, update an order status:
   - From Kitchen/Bartender interface, mark an order as ready
   - Or from POS, complete an order
3. Return to Order Board

**Expected Result:**
- ✅ Status badge updates automatically in real-time
- ✅ No manual refresh needed
- ✅ Statistics update to reflect status change
- ✅ If using filters, order may move between filter categories

### 8. Empty State
**Steps:**
1. Clear all orders from database (or use a fresh database)
2. Navigate to Order Board

**Expected Result:**
- ✅ Shows message: "No orders yet. Orders will appear here in real-time."
- ✅ Statistics show all zeros
- ✅ No error messages

### 9. Responsive Design
**Steps:**
1. Open Order Board on desktop
2. Resize browser window to tablet size
3. Resize to mobile size

**Expected Result:**
- ✅ Desktop: 3-column grid layout
- ✅ Tablet: 2-column grid layout
- ✅ Mobile: 1-column grid layout
- ✅ All content remains readable and accessible
- ✅ Buttons and filters remain functional

### 10. Permission-Based Access
**Steps:**
1. Log in as different user roles:
   - Admin
   - Manager
   - Cashier
   - Kitchen staff
   - Bartender
   - Waiter

**Expected Result:**
- ✅ All roles can see "Order Board" in sidebar
- ✅ All roles can access `/order-board` page
- ✅ All roles can view orders
- ✅ Real-time updates work for all roles

### 11. Order Details Display
**Steps:**
1. Create an order with:
   - Multiple items
   - Special notes on items
   - Customer assigned
   - Table assigned
2. View on Order Board

**Expected Result:**
- ✅ All items display correctly with quantities
- ✅ Special notes appear under item names
- ✅ Customer information displays
- ✅ Table information displays with area
- ✅ Total amount is calculated correctly
- ✅ Currency formatting is correct (₱)

### 12. Performance Test
**Steps:**
1. Create 20+ orders in the system
2. Navigate to Order Board
3. Create a new order
4. Update an existing order status

**Expected Result:**
- ✅ Page loads quickly (< 2 seconds)
- ✅ Real-time updates arrive promptly
- ✅ Scrolling is smooth
- ✅ No lag when filtering
- ✅ Statistics calculate correctly

## Browser Compatibility
Test on:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Common Issues and Solutions

### Issue: Orders not updating in real-time
**Solution:**
1. Check browser console for WebSocket errors
2. Verify Supabase Realtime is enabled for `orders` table
3. Check network tab for failed subscription
4. Try manual refresh button

### Issue: Orders not displaying
**Solution:**
1. Check browser console for API errors
2. Verify database has orders
3. Check API endpoint: `/api/orders/board`
4. Verify RLS policies allow reading orders

### Issue: Statistics incorrect
**Solution:**
1. Click manual refresh
2. Check if all orders have valid status values
3. Verify filtering logic

### Issue: Layout broken on mobile
**Solution:**
1. Clear browser cache
2. Check for CSS conflicts
3. Verify responsive classes are applied

## API Testing

### Manual API Test
```bash
# Test the API endpoint directly
curl http://localhost:3000/api/orders/board

# Test with status filter
curl http://localhost:3000/api/orders/board?status=pending

# Test with limit
curl http://localhost:3000/api/orders/board?limit=10
```

**Expected Response:**
```json
{
  "success": true,
  "orders": [...],
  "count": 5
}
```

## Database Verification

### Check Realtime Status
1. Go to Supabase Dashboard
2. Navigate to Database → Replication
3. Verify `orders` table has Realtime enabled

### Verify Order Data
```sql
-- Check orders exist
SELECT COUNT(*) FROM orders;

-- Check order items joined
SELECT o.order_number, oi.item_name, oi.quantity
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LIMIT 10;
```

## Sign-Off Checklist

Before marking as complete:
- [ ] All 12 test scenarios pass
- [ ] Tested on 3+ browsers
- [ ] Tested on mobile device
- [ ] Real-time updates work consistently
- [ ] No console errors
- [ ] API responds correctly
- [ ] Database Realtime is enabled
- [ ] Documentation reviewed
- [ ] Code follows project standards

## Troubleshooting Contacts

If issues persist:
1. Check `/docs/ORDER_BOARD_FEATURE.md` for detailed documentation
2. Review code comments in components
3. Check Supabase logs for database errors
4. Review browser Network and Console tabs

---

**Testing Complete When:**
All scenarios pass and no blocking issues remain. Minor UI improvements can be noted for future iterations.
