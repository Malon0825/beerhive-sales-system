# Integration Verification - Current Orders System
## Complete End-to-End Testing Guide

**Date:** October 7, 2025  
**Status:** Ready for Testing  
**Components:** Database ✅ | API ✅ | Frontend ✅

---

## Quick Verification Checklist

### Database Layer ✅
- [x] Tables created: `current_orders`, `current_order_items`, `current_order_item_addons`
- [x] RLS policies: 15 policies (5 per table)
- [x] Indexes: 9 performance indexes
- [x] Triggers: 2 automation triggers
- [x] Realtime: All 3 tables enabled

### API Layer ✅
- [x] Repository: `CurrentOrderRepository.ts` (522 lines)
- [x] Routes: `/api/current-orders/*` (9 endpoints)
- [x] Validation: Cashier ID verification
- [x] Error handling: Comprehensive error responses

### Frontend Layer ✅
- [x] Hook: `useCurrentOrders.ts` (316 lines)
- [x] Context: `CartContext.tsx` (568 lines)
- [x] Real-time: Supabase subscriptions active
- [x] Persistence: Cart restoration on page load

---

## 🧪 Testing Levels

### Level 1: Database Tests (5 minutes)

#### Run SQL Verification Script
```bash
# Location: scripts/test-current-orders.sql
# Run in Supabase SQL Editor
```

**Expected Results:**
- ✅ 3 tables created
- ✅ 3 tables with RLS enabled
- ✅ 15+ RLS policies
- ✅ 6+ indexes
- ✅ 2 triggers
- ✅ 3 tables realtime-enabled

#### Manual Functional Test
```sql
-- 1. Create order (replace YOUR-CASHIER-UUID)
INSERT INTO current_orders (cashier_id)
VALUES ('YOUR-CASHIER-UUID')
RETURNING id, subtotal, total_amount;

-- 2. Add item (replace ORDER-ID)
INSERT INTO current_order_items (
    current_order_id,
    item_name,
    quantity,
    unit_price,
    subtotal,
    total
)
VALUES (
    'ORDER-ID',
    'Test Beer',
    2,
    75.00,
    150.00,
    150.00
);

-- 3. Check auto-calculation
SELECT subtotal, total_amount 
FROM current_orders 
WHERE id = 'ORDER-ID';
-- Should show: subtotal = 150.00, total_amount = 150.00

-- 4. Clean up
DELETE FROM current_orders WHERE id = 'ORDER-ID';
```

---

### Level 2: API Tests (10 minutes)

#### Test with cURL

**1. Create Order**
```bash
curl -X POST http://localhost:3000/api/current-orders \
  -H "Content-Type: application/json" \
  -d '{
    "cashierId": "YOUR-CASHIER-UUID"
  }'
```
Expected: `{"success":true,"data":{...}}`

**2. Get Orders**
```bash
curl "http://localhost:3000/api/current-orders?cashierId=YOUR-CASHIER-UUID"
```
Expected: `{"success":true,"data":[...]}`

**3. Add Item**
```bash
curl -X POST http://localhost:3000/api/current-orders/ORDER-ID/items \
  -H "Content-Type: application/json" \
  -d '{
    "cashierId": "YOUR-CASHIER-UUID",
    "item": {
      "product_id": "PRODUCT-UUID",
      "item_name": "San Miguel Beer",
      "quantity": 3,
      "unit_price": 75.00,
      "subtotal": 225.00,
      "discount_amount": 0,
      "total": 225.00
    }
  }'
```
Expected: `{"success":true,"data":{...}}`

**4. Update Item**
```bash
curl -X PATCH http://localhost:3000/api/current-orders/ORDER-ID/items/ITEM-ID \
  -H "Content-Type: application/json" \
  -d '{
    "cashierId": "YOUR-CASHIER-UUID",
    "updates": {
      "quantity": 5,
      "subtotal": 375.00,
      "total": 375.00
    }
  }'
```

**5. Delete Item**
```bash
curl -X DELETE "http://localhost:3000/api/current-orders/ORDER-ID/items/ITEM-ID?cashierId=YOUR-CASHIER-UUID"
```

**6. Delete Order**
```bash
curl -X DELETE "http://localhost:3000/api/current-orders/ORDER-ID?cashierId=YOUR-CASHIER-UUID"
```

#### Test with Postman/Thunder Client

Import this collection:
```json
{
  "name": "Current Orders API",
  "requests": [
    {
      "name": "Create Order",
      "method": "POST",
      "url": "{{baseUrl}}/api/current-orders",
      "body": {
        "cashierId": "{{cashierId}}"
      }
    },
    {
      "name": "Get Orders",
      "method": "GET",
      "url": "{{baseUrl}}/api/current-orders?cashierId={{cashierId}}"
    }
  ]
}
```

---

### Level 3: Frontend Tests (15 minutes)

#### Test 1: Cart Persistence

**Steps:**
1. Start dev server: `npm run dev`
2. Login as cashier
3. Navigate to `/pos`
4. Add 3 different products to cart
5. Assign a customer (optional)
6. Assign a table (optional)
7. **Refresh page (F5)**

**Expected:**
- ✅ Cart items restored
- ✅ Customer still assigned (if set)
- ✅ Table still assigned (if set)
- ✅ Totals match previous state
- ✅ Success message: "Welcome back! Cart restored with X items"

#### Test 2: Real-Time Updates

**Steps:**
1. Open POS in **Browser Tab 1**
2. Open POS in **Browser Tab 2** (same cashier)
3. In **Tab 1**: Add item to cart
4. Observe **Tab 2**

**Expected:**
- ✅ Item appears in Tab 2 within 1-2 seconds
- ✅ No page refresh needed
- ✅ Totals update automatically

#### Test 3: Multi-Cashier Isolation

**Steps:**
1. Login as **Cashier A** in **Browser 1**
2. Login as **Cashier B** in **Browser 2**
3. **Cashier A**: Add items to cart
4. **Cashier B**: Check their POS

**Expected:**
- ✅ Cashier B sees empty cart (not A's items)
- ✅ Cashier A sees only their items
- ✅ No cross-contamination

#### Test 4: Cart Operations

**Add Items:**
- ✅ Can add products
- ✅ Can add packages
- ✅ Duplicate items increase quantity

**Update Items:**
- ✅ Can change quantity with +/- buttons
- ✅ Totals recalculate automatically
- ✅ Database updates in real-time

**Remove Items:**
- ✅ Can remove individual items
- ✅ Can clear entire cart
- ✅ Totals update correctly

**Customer & Table:**
- ✅ Can assign customer
- ✅ Can assign table
- ✅ Assignments persist after refresh

#### Test 5: Error Handling

**Network Interruption:**
1. Add items to cart
2. Disconnect network
3. Try to add more items
4. Reconnect network

**Expected:**
- ✅ Graceful fallback to local cart
- ✅ Error message displayed
- ✅ Cart still usable
- ✅ Sync resumes when reconnected

**Session Expiry:**
1. Add items to cart
2. Wait for session to expire
3. Refresh page

**Expected:**
- ✅ Redirect to login
- ✅ After re-login, cart restored

---

## 🔍 Verification Queries

### Check Current Orders Count
```sql
SELECT 
    u.username,
    COUNT(co.id) as active_orders,
    COUNT(coi.id) as total_items
FROM users u
LEFT JOIN current_orders co ON co.cashier_id = u.id
LEFT JOIN current_order_items coi ON coi.current_order_id = co.id
WHERE u.role IN ('cashier', 'admin', 'manager')
GROUP BY u.id, u.username
ORDER BY active_orders DESC;
```

### Check Order Details
```sql
SELECT 
    co.id,
    u.username as cashier,
    c.full_name as customer,
    t.table_number,
    co.subtotal,
    co.total_amount,
    COUNT(coi.id) as item_count,
    co.created_at
FROM current_orders co
JOIN users u ON u.id = co.cashier_id
LEFT JOIN customers c ON c.id = co.customer_id
LEFT JOIN restaurant_tables t ON t.id = co.table_id
LEFT JOIN current_order_items coi ON coi.current_order_id = co.id
GROUP BY co.id, u.username, c.full_name, t.table_number
ORDER BY co.created_at DESC;
```

### Check Real-Time Status
```sql
SELECT 
    tablename,
    schemaname,
    CASE 
        WHEN tablename IN (
            SELECT tablename 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime'
        ) THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as realtime_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('current_orders', 'current_order_items', 'current_order_item_addons');
```

---

## 📊 Performance Benchmarks

### Expected Performance

| Operation | Target | Typical |
|-----------|--------|---------|
| Load cart | < 500ms | ~200ms |
| Add item | < 100ms | ~50ms |
| Update quantity | < 100ms | ~50ms |
| Remove item | < 100ms | ~50ms |
| Realtime update | < 2s | ~1s |
| Clear cart | < 200ms | ~100ms |

### Load Testing

**Concurrent Cashiers:**
- ✅ 10 cashiers: Smooth
- ✅ 50 cashiers: Acceptable
- ✅ 100 cashiers: May need optimization

**Items Per Order:**
- ✅ 1-10 items: Instant
- ✅ 10-50 items: Fast
- ✅ 50+ items: Consider pagination

---

## 🐛 Common Issues & Solutions

### Issue: Cart Not Loading

**Symptoms:** Empty cart after refresh, items were added

**Check:**
```sql
-- Verify order exists
SELECT * FROM current_orders WHERE cashier_id = 'YOUR-UUID';

-- Check items
SELECT * FROM current_order_items WHERE current_order_id = 'ORDER-ID';
```

**Solutions:**
1. Check browser console for errors
2. Verify cashier is authenticated
3. Check RLS policies are active
4. Clear browser cache and retry

---

### Issue: Real-Time Not Working

**Symptoms:** Changes don't appear in other tabs

**Check:**
```javascript
// Browser console
const { createClient } = supabase;
const client = createClient(url, key);

client.channel('test')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'current_orders'
  }, (payload) => console.log('Change:', payload))
  .subscribe((status) => console.log('Status:', status));
```

**Solutions:**
1. Check WebSocket connection in Network tab
2. Verify realtime enabled in Supabase dashboard
3. Check firewall/proxy settings
4. Verify subscription filters

---

### Issue: Totals Not Calculating

**Symptoms:** Subtotal and total stay at 0

**Check:**
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger 
WHERE tgname = 'trigger_current_order_items_totals';

-- Manually trigger
SELECT calculate_current_order_totals('ORDER-ID');
```

**Solutions:**
1. Re-run trigger migration
2. Check function exists
3. Verify no constraint violations
4. Check database logs

---

### Issue: RLS Blocking Access

**Symptoms:** "No rows" or "Permission denied"

**Check:**
```sql
-- Check your auth
SELECT auth.uid();

-- Check your role
SELECT id, email, role FROM users WHERE id = auth.uid()::uuid;

-- Check policies
SELECT * FROM pg_policies 
WHERE tablename = 'current_orders';
```

**Solutions:**
1. Ensure user is logged in
2. Verify user has correct role
3. Check RLS policies allow access
4. Use admin client for debug

---

## ✅ Sign-Off Checklist

Before marking as production-ready:

### Database
- [ ] All tables created
- [ ] RLS enabled and tested
- [ ] Indexes performing well
- [ ] Triggers firing correctly
- [ ] Realtime working

### API
- [ ] All endpoints tested
- [ ] Error handling verified
- [ ] Validation working
- [ ] Performance acceptable

### Frontend
- [ ] Cart persistence working
- [ ] Real-time updates working
- [ ] Multi-cashier isolation verified
- [ ] Error handling graceful
- [ ] UI/UX smooth

### Integration
- [ ] End-to-end flow tested
- [ ] Multi-device tested
- [ ] Load tested with multiple users
- [ ] Edge cases handled
- [ ] Documentation complete

---

## 🎉 Success Criteria

**All Green = Production Ready** ✅

- ✅ Database: All tests pass
- ✅ API: All endpoints working
- ✅ Frontend: Cart persistence confirmed
- ✅ Real-time: Updates within 2 seconds
- ✅ Security: RLS isolating cashiers
- ✅ Performance: < 500ms load times
- ✅ Reliability: No data loss

---

## 📚 Related Documentation

- **Database Setup:** `DATABASE_SETUP_COMPLETE.md`
- **Quick Testing:** `QUICK_DATABASE_TEST_GUIDE.md`
- **Implementation:** `DATABASE_IMPLEMENTATION_SUMMARY.md`
- **Features:** `CURRENT_ORDERS_STAGING_TABLE.md`
- **Cart Persistence:** `CART_PERSISTENCE.md`

---

## 📞 Need Help?

### Quick Debug Commands

```sql
-- View all current orders
SELECT * FROM current_orders ORDER BY created_at DESC LIMIT 10;

-- View order with items
SELECT 
    co.*,
    json_agg(coi.*) as items
FROM current_orders co
LEFT JOIN current_order_items coi ON coi.current_order_id = co.id
WHERE co.id = 'ORDER-ID'
GROUP BY co.id;

-- Clear test data
DELETE FROM current_orders WHERE cashier_id = 'TEST-CASHIER-ID';
```

### Log Locations

- **Frontend:** Browser DevTools Console
- **API:** Terminal running `npm run dev`
- **Database:** Supabase Dashboard → Database → Logs

---

**Last Updated:** October 7, 2025  
**Status:** ✅ Ready for Testing  
**Contact:** Development Team
