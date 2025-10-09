# Inventory Integration - Quick Testing Guide

**Purpose**: Verify inventory integration is working correctly  
**Time Required**: ~15 minutes  
**Date**: October 8, 2025

---

## Prerequisites

1. ✅ Database migration completed
2. ✅ Development server running (`npm run dev`)
3. ✅ Test products with various stock levels
4. ✅ Access to database (for verification)

---

## Test Suite

### Test 1: Product Display Filtering (2 minutes)

**Objective**: Verify drinks with 0 stock are hidden, food items always shown

**Steps**:
1. Set up test data:
```sql
-- Set beer to 0 stock
UPDATE products 
SET current_stock = 0 
WHERE name LIKE '%Beer%' 
  AND category_id IN (SELECT id FROM product_categories WHERE name = 'Beer')
LIMIT 1;

-- Set food to 0 stock
UPDATE products 
SET current_stock = 0 
WHERE category_id IN (SELECT id FROM product_categories WHERE name = 'Food')
LIMIT 1;
```

2. Open POS interface (`/pos`)
3. Navigate to "All Products"
4. Search for the beer product → **Should NOT appear**
5. Search for the food product → **Should appear with "Out of Stock" badge**

**Expected Result**:
- ❌ Beer products with 0 stock: Hidden
- ✅ Food products with 0 stock: Visible with warning badge

---

### Test 2: Stock Validation on Order Creation (3 minutes)

**Objective**: Verify orders are blocked if drinks unavailable

**Steps**:
1. Create a new order in POS
2. Try to manually call the API with out-of-stock beer:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product_id": "[beer-with-0-stock-id]",
        "quantity": 5
      }
    ],
    "payment_method": "cash",
    "amount_tendered": 500
  }'
```

**Expected Result**:
```json
{
  "success": false,
  "error": "Insufficient stock: [Beer Name] (requested: 5, available: 0)"
}
```

---

### Test 3: Stock Deduction on POS Order (5 minutes)

**Objective**: Verify inventory decreases when order is completed

**Steps**:

1. **Check initial stock**:
```sql
SELECT id, name, current_stock 
FROM products 
WHERE name LIKE '%San Miguel%' 
LIMIT 1;
-- Note the current_stock value
```

2. **Create and complete order**:
   - Open POS
   - Create new order
   - Add 3x San Miguel Beer
   - Complete payment (cash)
   - Print receipt

3. **Verify stock deducted**:
```sql
-- Check updated stock
SELECT current_stock 
FROM products 
WHERE name LIKE '%San Miguel%' 
LIMIT 1;
-- Should be: initial_stock - 3

-- Check inventory movement log
SELECT 
  movement_type,
  reason,
  quantity_change,
  quantity_before,
  quantity_after,
  created_at
FROM inventory_movements
WHERE product_id = '[san-miguel-id]'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**:
- ✅ Stock decreased by 3
- ✅ Inventory movement logged with:
  - `movement_type`: 'sale'
  - `reason`: 'sale_deduction'
  - `quantity_change`: -3
  - `quantity_before`: [initial]
  - `quantity_after`: [initial - 3]

---

### Test 4: Stock Deduction on Tab Close (5 minutes)

**Objective**: Verify inventory decreases when tab is closed

**Steps**:

1. **Check initial stock** (multiple products):
```sql
SELECT id, name, current_stock 
FROM products 
WHERE name IN ('Red Horse Beer', 'Sisig')
ORDER BY name;
```

2. **Open tab and add multiple orders**:
   - Open new tab (Table 1)
   - **Order 1**: Add 2x Red Horse Beer → Confirm
   - Wait 1 minute...
   - **Order 2**: Add 1x Sisig, 1x Red Horse Beer → Confirm
   - View bill preview → Verify totals
   - **Close tab** with payment

3. **Verify stock deductions**:
```sql
-- Check Red Horse Beer (should be -3 total)
SELECT current_stock 
FROM products 
WHERE name = 'Red Horse Beer';

-- Check Sisig (should be -1)
SELECT current_stock 
FROM products 
WHERE name = 'Sisig';

-- Check all movements for this session
SELECT 
  p.name,
  im.quantity_change,
  im.quantity_before,
  im.quantity_after,
  o.order_number
FROM inventory_movements im
JOIN products p ON p.id = im.product_id
JOIN orders o ON o.id = im.order_id
WHERE o.session_id = '[session-id]'
ORDER BY im.created_at;
```

**Expected Result**:
- ✅ Red Horse Beer: Stock decreased by 3 (2 from order 1, 1 from order 2)
- ✅ Sisig: Stock decreased by 1
- ✅ Two separate movement records (one per order)
- ✅ Each movement has correct order_id reference

---

### Test 5: Stock Status Badge Display (2 minutes)

**Objective**: Verify badge colors and labels are correct

**Steps**:

1. Set up various stock levels:
```sql
-- Out of stock beer
UPDATE products SET current_stock = 0, reorder_point = 10 
WHERE id = '[beer-id-1]';

-- Low stock beer
UPDATE products SET current_stock = 5, reorder_point = 10 
WHERE id = '[beer-id-2]';

-- Adequate stock beer
UPDATE products SET current_stock = 50, reorder_point = 10 
WHERE id = '[beer-id-3]';

-- Out of stock food
UPDATE products SET current_stock = 0, reorder_point = 10 
WHERE id = '[food-id-1]';
```

2. Open POS and check badges:

**Expected Display**:
| Product | Stock | Expected Badge |
|---------|-------|----------------|
| Beer #1 | 0 | 🔴 Not displayed (hidden) |
| Beer #2 | 5 | 🟡 "Low Stock (5)" |
| Beer #3 | 50 | 🟢 "In Stock (50)" |
| Food #1 | 0 | 🔴 "Out of Stock (Kitchen Confirm)" |

---

### Test 6: Error Handling (3 minutes)

**Objective**: Verify system handles stock errors gracefully

**Steps**:

1. **Simulate stock deduction failure**:
   - Create order with valid products
   - Before completing, manually set product to negative stock:
```sql
UPDATE products 
SET current_stock = -999 
WHERE id = '[test-product-id]';
```
   - Complete the order

2. **Check logs**:
   - Look for warning messages in console
   - Order should still complete
   - Warning logged: "Stock deduction failed (non-fatal)"

3. **Verify order status**:
```sql
SELECT status, completed_at 
FROM orders 
WHERE id = '[order-id]';
-- Should be: status = 'completed', completed_at = [timestamp]
```

**Expected Result**:
- ✅ Order marked as completed (payment processed)
- ⚠️ Warning logged for manual inventory adjustment
- ✅ System remains functional

---

## Verification Checklist

After running all tests, verify:

- [ ] Drinks with 0 stock are hidden from product selection
- [ ] Food items with 0 stock are visible with warnings
- [ ] Stock badges show correct colors (red/yellow/green)
- [ ] Orders blocked if drinks unavailable
- [ ] Stock deducted on POS order completion
- [ ] Stock deducted on Tab close (for all orders in session)
- [ ] Inventory movements logged with full details
- [ ] Order_id correctly linked in inventory movements
- [ ] System handles errors without breaking orders
- [ ] UI shows real-time stock updates

---

## Common Issues & Solutions

### Issue: Stock not deducting

**Possible Causes**:
1. Order not marked as COMPLETED
2. StockDeduction service error
3. Database permissions

**Debug**:
```sql
-- Check order status
SELECT id, order_number, status, completed_at 
FROM orders 
WHERE id = '[order-id]';

-- Check for inventory movements
SELECT COUNT(*) 
FROM inventory_movements 
WHERE order_id = '[order-id]';
```

**Solution**: Check server logs for errors, verify order.status = 'completed'

---

### Issue: Products not filtering correctly

**Possible Causes**:
1. Category name mismatch
2. isDrinkProduct logic not working
3. Frontend caching

**Debug**:
```sql
-- Check product categories
SELECT 
  p.name,
  pc.name as category,
  p.current_stock,
  p.is_active
FROM products p
LEFT JOIN product_categories pc ON pc.id = p.category_id
WHERE p.current_stock = 0;
```

**Solution**: 
- Clear browser cache
- Verify category names match (Beer, Beverage, Drink, Alcohol)
- Check is_active = true

---

### Issue: Duplicate stock deductions

**Possible Causes**:
1. Multiple completion calls
2. Tab close called twice
3. Race condition

**Debug**:
```sql
-- Check for duplicate movements
SELECT 
  order_id,
  product_id,
  COUNT(*) as deduction_count,
  SUM(quantity_change) as total_deducted
FROM inventory_movements
WHERE movement_type = 'sale'
GROUP BY order_id, product_id
HAVING COUNT(*) > 1;
```

**Solution**: Check for duplicate API calls, add idempotency checks

---

## Performance Benchmarks

**Expected Performance**:

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Stock validation (5 items) | < 100ms | Single DB query |
| Stock deduction (5 items) | < 500ms | Sequential updates + logging |
| Product filtering | < 50ms | Client-side JavaScript |
| Badge rendering | Instant | Pure UI component |

**If slower**:
- Check database indexes on products.id, inventory_movements.product_id
- Review network latency
- Check for N+1 query problems

---

## Rollback Plan

If issues found:

1. **Disable stock validation** (emergency):
```typescript
// In StockValidationService.ts
static async validateOrderStock() {
  return { valid: true, unavailableItems: [], warnings: [] };
}
```

2. **Disable auto-deduction** (emergency):
```typescript
// In OrderService.ts and OrderSessionService.ts
// Comment out StockDeduction.deductForOrder() calls
```

3. **Manual stock adjustment**:
```sql
-- Revert stock manually if needed
UPDATE products 
SET current_stock = [correct_value]
WHERE id = '[product-id]';

-- Log manual adjustment
INSERT INTO inventory_movements (
  product_id, movement_type, reason, 
  quantity_change, quantity_before, quantity_after,
  performed_by, notes
) VALUES (
  '[product-id]', 'physical_count', 'count_correction',
  [difference], [old_stock], [new_stock],
  '[admin-user-id]', 'Manual correction after system issue'
);
```

---

## Success Criteria

✅ **All tests pass**  
✅ **No console errors**  
✅ **Stock data accurate**  
✅ **Audit trail complete**  
✅ **Performance acceptable**  

**Ready for Production** when all criteria met! 🚀

---

**Last Updated**: October 8, 2025  
**Tested By**: _________________  
**Test Date**: _________________  
**Result**: ⬜ Pass / ⬜ Fail  
**Notes**: _________________
