# Testing Guide - Customer Dashboard Feature

## Quick Test Instructions

### Prerequisites
- Server running: `npm run dev`
- Database connected and seeded with sample data
- At least one customer with orders in the database

---

## Test 1: Dashboard Page Loads

**URL**: `http://localhost:3000/`

**Expected**:
- Welcome message displays
- Page loads without console errors
- Order History section shows (may be empty)
- Help card displays at bottom

**Pass Criteria**: ✅ Page loads successfully

---

## Test 2: Customer Statistics Display

**URL**: `http://localhost:3000/?customerId=YOUR_CUSTOMER_UUID`

**Steps**:
1. Replace `YOUR_CUSTOMER_UUID` with actual customer ID from database
2. Reload page

**Expected**:
- 4 statistics cards display:
  - Total Orders (number)
  - Total Spent (PHP currency)
  - Loyalty Points (number)
  - Member Tier (text)
- All values are accurate from database

**Pass Criteria**: ✅ Statistics match database records

---

## Test 3: Order List Display

**With customer ID in URL**

**Expected**:
- Orders display in cards
- Each order shows:
  - Order number (e.g., ORD20241006001)
  - Status badge with color
  - Date and time
  - Total amount in PHP
  - Table number (if applicable)
  - Expand/collapse icon

**Pass Criteria**: ✅ All orders display correctly

---

## Test 4: Order Expansion

**Steps**:
1. Click on any order card
2. Order details should expand

**Expected**:
- Smooth transition animation
- Order items list displays
- Each item shows:
  - Item name
  - Quantity and unit price
  - Total price
  - Notes (if any)
- Totals section shows:
  - Subtotal
  - Discount (if applicable)
  - Tax (if applicable)
  - Final total
- Payment method displays

**Pass Criteria**: ✅ Order details expand correctly

---

## Test 5: Status Filtering

**Steps**:
1. Click "Pending" filter button
2. Observe order list
3. Click "Completed" filter button
4. Click "All" filter button

**Expected**:
- Pending: Only shows pending orders
- Completed: Only shows completed orders
- All: Shows all orders
- Active filter button has different styling

**Pass Criteria**: ✅ Filtering works correctly

---

## Test 6: Empty State

**Steps**:
1. Use customer ID with no orders
2. Or filter by status with no matching orders

**Expected**:
- Shopping cart icon displays
- Message: "No orders found"
- No error in console

**Pass Criteria**: ✅ Empty state displays properly

---

## Test 7: Error Handling

**Steps**:
1. Use invalid customer ID
2. Or disconnect from database

**Expected**:
- Error message displays
- "Try Again" button appears
- No app crash

**Pass Criteria**: ✅ Errors handled gracefully

---

## Test 8: Loading States

**Steps**:
1. Use network throttling in DevTools
2. Reload page

**Expected**:
- Loading spinners show for statistics
- Loading spinner shows for order list
- Content appears after loading

**Pass Criteria**: ✅ Loading states work

---

## Test 9: Responsive Design

### Mobile (375px)
**Steps**:
1. Resize browser to 375px width
2. Check all elements

**Expected**:
- Statistics cards stack vertically
- Order cards are full width
- Text is readable
- Buttons are tappable
- No horizontal scroll

**Pass Criteria**: ✅ Mobile layout works

### Tablet (768px)
**Steps**:
1. Resize browser to 768px width

**Expected**:
- Statistics in 2×2 grid
- Order cards full width
- Good spacing

**Pass Criteria**: ✅ Tablet layout works

### Desktop (1024px+)
**Steps**:
1. Resize browser to 1024px+ width

**Expected**:
- Statistics in 1×4 row
- Order cards full width
- Optimal spacing

**Pass Criteria**: ✅ Desktop layout works

---

## Test 10: Status Badge Colors

**Check each status**:

| Status | Expected Color | Badge Text |
|--------|---------------|------------|
| pending | Yellow | PENDING |
| completed | Green | COMPLETED |
| voided | Red | VOIDED |
| on_hold | Blue | ON HOLD |

**Pass Criteria**: ✅ All badges show correct colors

---

## Browser Compatibility Tests

### Chrome/Edge
- [ ] All features work
- [ ] No console errors
- [ ] Animations smooth

### Firefox
- [ ] All features work
- [ ] No console errors
- [ ] Animations smooth

### Safari (if available)
- [ ] All features work
- [ ] No console errors
- [ ] Animations smooth

---

## Performance Tests

### Load Time
- [ ] Initial page load < 3 seconds
- [ ] Order list renders < 1 second
- [ ] Expand animation smooth (60fps)

### Memory Usage
- [ ] No memory leaks
- [ ] Console has no warnings
- [ ] Network requests are optimized

---

## API Tests

### GET /api/orders?customerId={id}
```bash
# Using curl
curl http://localhost:3000/api/orders?customerId=YOUR_UUID

# Expected response
{
  "success": true,
  "data": [...orders with items...],
  "count": 5
}
```

### GET /api/customers/{id}
```bash
# Using curl
curl http://localhost:3000/api/customers/YOUR_UUID

# Expected response
{
  "success": true,
  "data": {...customer data...}
}
```

---

## Database Verification

### Check Orders Query
```sql
-- Run in Supabase SQL Editor
SELECT 
  o.*,
  json_agg(oi.*) as order_items,
  t.table_number
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN restaurant_tables t ON t.id = o.table_id
WHERE o.customer_id = 'YOUR_CUSTOMER_UUID'
GROUP BY o.id, t.table_number
ORDER BY o.created_at DESC;
```

**Expected**: Returns orders with items and table info

---

## Common Issues & Solutions

### Orders Not Loading
**Issue**: Blank order list  
**Check**:
1. Customer ID is valid
2. Customer has orders in database
3. API endpoint works (check Network tab)
4. Console for errors

### Statistics Not Showing
**Issue**: Stats cards don't appear  
**Check**:
1. Customer ID in URL query param
2. `/api/customers/{id}` returns data
3. Customer record exists

### Status Filter Not Working
**Issue**: Filter doesn't change display  
**Check**:
1. Network tab shows API call
2. Response includes filtered orders
3. No JavaScript errors

---

## Test Data Setup

### Create Test Customer
```sql
-- Run in Supabase SQL Editor
INSERT INTO customers (
  customer_number,
  full_name,
  phone,
  email,
  tier,
  loyalty_points,
  total_spent,
  visit_count
) VALUES (
  'CUST001',
  'Test Customer',
  '+639171234567',
  'test@example.com',
  'vip_gold',
  500,
  5000.00,
  10
) RETURNING id;
```

### Create Test Orders
```sql
-- Use customer ID from above
INSERT INTO orders (
  order_number,
  customer_id,
  subtotal,
  total_amount,
  status
) VALUES (
  'ORD20241006001',
  'YOUR_CUSTOMER_ID',
  1000.00,
  1000.00,
  'completed'
) RETURNING id;

-- Add order items
INSERT INTO order_items (
  order_id,
  item_name,
  quantity,
  unit_price,
  subtotal,
  total
) VALUES (
  'YOUR_ORDER_ID',
  'Test Item',
  2,
  500.00,
  1000.00,
  1000.00
);
```

---

## Acceptance Criteria

### Must Pass
- ✅ All 10 functional tests pass
- ✅ No console errors
- ✅ Responsive on all viewports
- ✅ API endpoints work correctly
- ✅ Database queries succeed

### Nice to Have
- ⭐ Smooth animations
- ⭐ Fast load times
- ⭐ Good accessibility scores
- ⭐ Clean console output

---

## Final Checklist

- [ ] Dashboard loads successfully
- [ ] Customer statistics display
- [ ] Order list renders
- [ ] Order expansion works
- [ ] Status filtering works
- [ ] Empty state displays
- [ ] Error handling works
- [ ] Loading states appear
- [ ] Mobile responsive
- [ ] Tablet responsive
- [ ] Desktop responsive
- [ ] Status badges correct colors
- [ ] All browsers tested
- [ ] API endpoints work
- [ ] Database queries succeed
- [ ] No console errors
- [ ] Good performance
- [ ] Documentation reviewed

---

## Sign Off

**Tester Name**: _______________  
**Date**: _______________  
**Status**: ⬜ PASS  ⬜ FAIL  ⬜ NEEDS REVISION  

**Notes**:
```
[Add any additional notes or findings here]
```

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Deploy to staging environment
2. Run tests again on staging
3. Get stakeholder approval
4. Deploy to production
5. Monitor for issues

### If Tests Fail ❌
1. Document specific failures
2. Create bug tickets
3. Fix issues
4. Retest
5. Repeat until passing

---

**Last Updated**: October 6, 2025  
**Version**: 1.0  
**Status**: Ready for Testing
