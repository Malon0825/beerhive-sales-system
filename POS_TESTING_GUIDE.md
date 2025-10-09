# POS UI & Stock Tracker Testing Guide

**Quick reference for testing the new POS interface and realtime stock tracking**

---

## Quick Start Testing

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Login as Cashier/Manager/Admin
Navigate to: `http://localhost:3000/pos`

---

## Test Scenarios

### ✅ Test 1: Product Display & Stock Visibility

**Steps**:
1. Open POS interface
2. Observe product grid

**Expected Results**:
- ✅ Products displayed in responsive grid (2-5 columns)
- ✅ Full product names visible (no truncation except after 2 lines)
- ✅ Stock badges show with colors:
  - Green: In Stock (quantity shown)
  - Yellow: Low Stock (quantity shown)
  - Red: Out of Stock
- ✅ Drinks with 0 stock are hidden
- ✅ Food with 0 stock shows with warning

---

### ✅ Test 2: Realtime Stock Deduction

**Steps**:
1. Note the stock quantity of a product (e.g., "San Miguel Beer: 50")
2. Click to add it to cart
3. Observe the stock badge

**Expected Results**:
- ✅ Stock badge updates immediately (shows 49)
- ✅ Cart shows 1 item
- ✅ No database call made yet (check Network tab)

**Continue**:
4. Click the product again
5. Observe stock badge

**Expected Results**:
- ✅ Stock shows 48
- ✅ Cart shows quantity 2

---

### ✅ Test 3: Stock Restoration on Remove

**Steps**:
1. Add a product to cart (stock decreases)
2. Click the trash icon to remove it

**Expected Results**:
- ✅ Stock badge returns to original value
- ✅ Item removed from cart
- ✅ Stock count accurate

---

### ✅ Test 4: Quantity Update Stock Adjustment

**Steps**:
1. Add product to cart
2. Click + button to increase quantity
3. Observe stock badge

**Expected Results**:
- ✅ Stock decreases by 1 each click
- ✅ Quantity in cart increases
- ✅ If insufficient stock, shows alert

**Continue**:
4. Click - button to decrease quantity

**Expected Results**:
- ✅ Stock increases by 1
- ✅ Quantity decreases
- ✅ If quantity reaches 0, item removed

---

### ✅ Test 5: Clear Cart Resets Stock

**Steps**:
1. Add multiple products to cart (stock decreases)
2. Click "Clear" button
3. Observe all stock badges

**Expected Results**:
- ✅ All stock badges return to original values
- ✅ Cart is empty
- ✅ No database updates

---

### ✅ Test 6: Stock Validation

**Test 6a: Out of Stock Product**
1. Find a drink with 0 stock (should be hidden)
2. Manually set a product to 0 stock in DB
3. Refresh POS

**Expected**: Drink product hidden from grid

**Test 6b: Insufficient Stock**
1. Add 5 of a product (stock: 10)
2. Try to increase quantity to 20

**Expected**: Alert "Insufficient stock" appears

---

### ✅ Test 7: Payment & Database Save

**Steps**:
1. Add 5x "San Miguel Beer" to cart (original stock: 50)
2. Observe display stock shows 45
3. Click "Proceed to Payment"
4. Select payment method (e.g., Cash)
5. Enter amount and confirm payment

**Expected Results**:
- ✅ Payment successful
- ✅ Cart cleared
- ✅ Database stock updated to 45
- ✅ Success message shown

**Verify in Database**:
```sql
SELECT name, current_stock 
FROM products 
WHERE name = 'San Miguel Beer';
-- Should show 45
```

---

### ✅ Test 8: Search & Filter with Stock

**Steps**:
1. Enter search term (e.g., "beer")
2. Observe filtered results

**Expected Results**:
- ✅ Only matching products shown
- ✅ Stock badges still accurate
- ✅ Out of stock drinks still hidden

**Continue**:
3. Select a category filter
4. Observe results

**Expected Results**:
- ✅ Products filtered by category
- ✅ Stock tracking still works
- ✅ Stock badges accurate

---

### ✅ Test 9: Professional Layout

**Visual Checks**:
- ✅ Search bar has icon and proper styling
- ✅ View toggle buttons have icons
- ✅ Product cards have proper spacing
- ✅ Order summary has gradient header
- ✅ Quantity controls are clear and easy to use
- ✅ Totals section is prominent
- ✅ Payment button is large and obvious

**Responsive Check**:
1. Resize browser window
2. Observe layout changes

**Expected**:
- ✅ Grid adjusts columns (2 → 3 → 4 → 5)
- ✅ Order summary stays fixed width
- ✅ No horizontal scrolling
- ✅ All elements visible and usable

---

### ✅ Test 10: Edge Cases

**Test 10a: Concurrent Stock Changes**
1. Add item to cart (stock decreases)
2. Another user purchases same item (DB stock decreases)
3. Complete payment

**Expected**: Database handles final stock correctly

**Test 10b: Browser Refresh**
1. Add items to cart
2. Refresh browser (F5)

**Expected**:
- ✅ Cart restored from database
- ✅ Stock tracker re-initialized
- ✅ Display stock accurate

**Test 10c: Multiple Products**
1. Add 3 different products to cart
2. Remove one
3. Update quantity of another
4. Clear cart

**Expected**:
- ✅ All stock values tracked correctly
- ✅ Each product independent
- ✅ Reset restores all correctly

---

## Component-Specific Tests

### ProductCard Component

**Visual Elements**:
- [ ] Product image or placeholder shown
- [ ] Full product name visible (2 lines max)
- [ ] Price displayed prominently
- [ ] Stock badge visible and color-coded
- [ ] Category badge shown
- [ ] Featured badge if applicable
- [ ] Hover effect works
- [ ] Click adds to cart

### OrderSummaryPanel Component

**Functional Elements**:
- [ ] Header shows item count
- [ ] Customer selection button works
- [ ] Table selection button works
- [ ] Each cart item has:
  - [ ] Product name
  - [ ] Unit price
  - [ ] Quantity controls (+/-)
  - [ ] Remove button (trash icon)
  - [ ] Subtotal
- [ ] Totals section accurate
- [ ] Payment button enabled when items in cart
- [ ] Clear button works
- [ ] Loading state during cart load

---

## Database Verification Queries

### Check Stock After Purchase
```sql
-- Before purchase
SELECT id, name, current_stock FROM products WHERE name = 'Test Product';

-- Add to cart and complete payment

-- After purchase
SELECT id, name, current_stock FROM products WHERE name = 'Test Product';
-- Stock should be decreased
```

### Check Inventory Movements
```sql
SELECT 
  im.created_at,
  p.name as product_name,
  im.quantity_change,
  im.quantity_before,
  im.quantity_after,
  im.reason
FROM inventory_movements im
JOIN products p ON p.id = im.product_id
ORDER BY im.created_at DESC
LIMIT 10;
```

### Check Order Items
```sql
SELECT 
  o.id,
  o.order_number,
  oi.item_name,
  oi.quantity,
  oi.unit_price,
  oi.subtotal,
  o.status
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
ORDER BY o.created_at DESC
LIMIT 10;
```

---

## Common Issues & Solutions

### Issue: Stock not updating in UI
**Solution**: Check browser console for errors. Ensure StockTrackerProvider is wrapping CartProvider.

### Issue: Products not showing
**Solution**: Check if products have stock. Drinks with 0 stock are intentionally hidden.

### Issue: Stock becomes negative
**Solution**: This shouldn't happen. Check validation in handleUpdateQuantity. Report as bug.

### Issue: Stock not saved to DB after payment
**Solution**: Check OrderService.completeOrder() includes StockDeduction.deductForOrder().

### Issue: Cart not persisting
**Solution**: Check CartContext is properly initialized with userId.

---

## Performance Checks

### Load Time
- [ ] Products load in < 2 seconds
- [ ] Stock tracker initializes immediately
- [ ] No lag when adding to cart
- [ ] UI remains responsive

### Memory Usage
- [ ] Browser memory stable
- [ ] No memory leaks on repeated actions
- [ ] Stock state size reasonable

### Network
- [ ] Only necessary API calls made
- [ ] No duplicate requests
- [ ] Stock updates don't trigger API calls

---

## Success Criteria Summary

✅ **Functional Requirements**
- Stock tracked in memory correctly
- Stock saved to DB only after payment
- All cart operations work properly
- Validation prevents overselling

✅ **UI Requirements**
- Professional, modern design
- Full product names visible
- Clear stock indicators
- Responsive layout
- Proper spacing and alignment

✅ **Code Quality**
- Components under 500 lines
- Well-documented code
- Reusable components
- TypeScript type safety
- Follows project standards

---

## Automated Testing (Future)

Create test files for:
- `StockTrackerContext.test.tsx`
- `ProductCard.test.tsx`
- `OrderSummaryPanel.test.tsx`
- `POSInterface.test.tsx`

---

**Testing Complete!** 🎉

If all tests pass, the POS UI redesign and stock tracker are working correctly!
