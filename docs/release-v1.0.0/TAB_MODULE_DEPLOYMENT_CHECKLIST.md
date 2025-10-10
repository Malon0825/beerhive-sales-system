# Tab Module - Production Deployment Checklist

**Date**: 2025-10-09  
**Purpose**: Track deployment status of tab module to production database  
**Use**: Check off items as they are verified in production

---

## 🎯 Quick Status Check

Run this command to quickly verify production database:
```bash
psql -d production_db -f docs/TAB_MODULE_DATABASE_VERIFICATION.sql
```

---

## 📦 Pre-Deployment

- [ ] **Production database backup completed**
- [ ] **Staging environment tested successfully**
- [ ] **All team members notified of deployment**
- [ ] **Maintenance window scheduled**
- [ ] **Rollback plan reviewed and ready**

---

## 🆕 New Tables (4 total)

### order_sessions
- [ ] Table created with 15 columns
- [ ] Primary key `id` (UUID)
- [ ] Unique constraint on `session_number`
- [ ] 4 Foreign keys (table_id, customer_id, opened_by, closed_by)
- [ ] 6 Indexes created
- [ ] RLS enabled
- [ ] 3 RLS policies applied
- [ ] Realtime enabled

### current_orders
- [ ] Table created with 13 columns
- [ ] Primary key `id` (UUID)
- [ ] Unique constraint on `(cashier_id, id)`
- [ ] 4 Foreign keys (cashier_id, customer_id, table_id, applied_event_offer_id)
- [ ] 4 Indexes created
- [ ] RLS enabled
- [ ] 5 RLS policies applied
- [ ] Realtime enabled

### current_order_items
- [ ] Table created with 14 columns
- [ ] Primary key `id` (UUID)
- [ ] Check constraint (product_id XOR package_id)
- [ ] 3 Foreign keys (current_order_id, product_id, package_id)
- [ ] 3 Indexes created
- [ ] RLS enabled
- [ ] 4 RLS policies applied
- [ ] Realtime enabled

### current_order_item_addons
- [ ] Table created with 7 columns
- [ ] Primary key `id` (UUID)
- [ ] 2 Foreign keys (current_order_item_id, addon_id)
- [ ] 1 Index created
- [ ] RLS enabled
- [ ] 2 RLS policies applied

---

## ✏️ Modified Tables (2 total)

### orders
- [ ] New column `session_id` (UUID, nullable)
- [ ] Foreign key to `order_sessions(id)` with ON DELETE SET NULL
- [ ] Index `idx_orders_session` on `session_id`
- [ ] Existing data verified (session_id = NULL for old orders)

### restaurant_tables
- [ ] New column `current_session_id` (UUID, nullable)
- [ ] Foreign key to `order_sessions(id)` with ON DELETE SET NULL
- [ ] Index `idx_tables_session` on `current_session_id`
- [ ] Old `current_order_id` column preserved for compatibility

---

## 🏷️ Enums (2 total)

### session_status (NEW)
- [ ] Enum created with 3 values
- [ ] Value: 'open'
- [ ] Value: 'closed'
- [ ] Value: 'abandoned'

### order_status (EXTENDED)
- [ ] New value: 'draft' added
- [ ] New value: 'confirmed' added
- [ ] New value: 'preparing' added
- [ ] New value: 'ready' added
- [ ] New value: 'served' added
- [ ] Old values preserved: 'pending', 'completed', 'voided', 'on_hold'

---

## ⚙️ Functions (6 total)

- [ ] `generate_session_number()` created
- [ ] `set_session_number()` trigger function created
- [ ] `update_session_totals()` trigger function created
- [ ] `calculate_current_order_totals(UUID)` created
- [ ] `trigger_calculate_current_order_totals()` trigger function created
- [ ] `get_active_session_for_table(UUID)` created

---

## 🔔 Triggers (4 total)

- [ ] `trigger_set_session_number` on `order_sessions` (BEFORE INSERT)
- [ ] `trigger_update_session_totals` on `orders` (AFTER INSERT/UPDATE/DELETE)
- [ ] `trigger_current_order_items_totals` on `current_order_items` (AFTER INSERT/UPDATE/DELETE)
- [ ] `update_current_orders_updated_at` on `current_orders` (BEFORE UPDATE)

---

## 📊 Indexes (16 total)

### order_sessions (6)
- [ ] `idx_sessions_table` on `table_id`
- [ ] `idx_sessions_customer` on `customer_id`
- [ ] `idx_sessions_status` on `status`
- [ ] `idx_sessions_number` on `session_number`
- [ ] `idx_sessions_opened` on `opened_at`
- [ ] `idx_sessions_closed` on `closed_at`

### orders (1 new)
- [ ] `idx_orders_session` on `session_id`

### restaurant_tables (1 new)
- [ ] `idx_tables_session` on `current_session_id`

### current_orders (4)
- [ ] `idx_current_orders_cashier` on `cashier_id`
- [ ] `idx_current_orders_customer` on `customer_id`
- [ ] `idx_current_orders_table` on `table_id`
- [ ] `idx_current_orders_created` on `created_at`

### current_order_items (3)
- [ ] `idx_current_order_items_order` on `current_order_id`
- [ ] `idx_current_order_items_product` on `product_id`
- [ ] `idx_current_order_items_package` on `package_id`

### current_order_item_addons (1)
- [ ] `idx_current_order_item_addons_item` on `current_order_item_id`

---

## 🔒 RLS Policies (14 total)

### order_sessions (3)
- [ ] "Allow authenticated users to view sessions" (SELECT)
- [ ] "Allow staff to create sessions" (INSERT)
- [ ] "Allow staff to update sessions" (UPDATE)

### current_orders (5)
- [ ] "Cashiers can view own current orders" (SELECT)
- [ ] "Cashiers can create own current orders" (INSERT)
- [ ] "Cashiers can update own current orders" (UPDATE)
- [ ] "Cashiers can delete own current orders" (DELETE)
- [ ] "Admins can manage all current orders" (ALL)

### current_order_items (4)
- [ ] "Users can view items in own orders" (SELECT)
- [ ] "Users can insert items in own orders" (INSERT)
- [ ] "Users can update items in own orders" (UPDATE)
- [ ] "Users can delete items in own orders" (DELETE)

### current_order_item_addons (2)
- [ ] "Users can view addons in own orders" (SELECT)
- [ ] "Users can manage addons in own orders" (ALL)

---

## 📺 Views (1 total)

- [ ] `active_sessions_view` created with all required columns

---

## 🔄 Realtime (3 tables)

- [ ] `order_sessions` added to supabase_realtime publication
- [ ] `current_orders` added to supabase_realtime publication
- [ ] `current_order_items` added to supabase_realtime publication

---

## ✅ Post-Deployment Verification

### Database Structure
- [ ] All 4 new tables exist
- [ ] All 2 modified tables have new columns
- [ ] All enums created/extended
- [ ] All foreign keys in place

### Functions & Triggers
- [ ] All 6 functions execute without errors
- [ ] All 4 triggers fire correctly
- [ ] Session number generation works (format: TAB-YYYYMMDD-XXX)
- [ ] Session totals auto-calculate correctly
- [ ] Current order totals auto-calculate correctly

### Security
- [ ] RLS enabled on all 4 new tables
- [ ] All 14 RLS policies working correctly
- [ ] Cashier isolation verified (cashiers only see own current_orders)
- [ ] Admin/manager override verified

### Performance
- [ ] All 16 indexes created
- [ ] Query performance acceptable (< 100ms for most operations)
- [ ] No blocking queries detected

### Realtime
- [ ] Realtime publication includes tab tables
- [ ] Realtime updates working in application
- [ ] WebSocket connections stable

### Functional Testing
- [ ] Can create new session
- [ ] Session number auto-generates correctly
- [ ] Can add orders to session
- [ ] Session totals update automatically
- [ ] Can create current_order
- [ ] Can add items to current_order
- [ ] Current order totals update automatically
- [ ] Can close session
- [ ] Table status updates correctly
- [ ] active_sessions_view returns correct data

---

## 🧪 Test Queries

### Test 1: Create Session
```sql
INSERT INTO order_sessions (table_id, opened_by) 
VALUES (
    (SELECT id FROM restaurant_tables WHERE is_active = true LIMIT 1),
    (SELECT id FROM users WHERE role = 'cashier' LIMIT 1)
)
RETURNING session_number;
```
- [ ] Session created successfully
- [ ] Session number format: TAB-YYYYMMDD-XXX
- [ ] `opened_at` timestamp set automatically

### Test 2: Add Order to Session
```sql
-- First get a session id
WITH session AS (
    SELECT id FROM order_sessions WHERE status = 'open' LIMIT 1
)
INSERT INTO orders (
    session_id, 
    order_number, 
    customer_id, 
    cashier_id, 
    subtotal, 
    total_amount, 
    status
)
VALUES (
    (SELECT id FROM session),
    'TEST-001',
    NULL,
    (SELECT id FROM users WHERE role = 'cashier' LIMIT 1),
    100.00,
    100.00,
    'draft'
)
RETURNING id;
```
- [ ] Order created and linked to session
- [ ] Session total updated automatically (check trigger)

### Test 3: Create Current Order
```sql
INSERT INTO current_orders (
    cashier_id,
    customer_id,
    subtotal,
    total_amount
)
VALUES (
    (SELECT id FROM users WHERE role = 'cashier' LIMIT 1),
    NULL,
    0,
    0
)
RETURNING id;
```
- [ ] Current order created
- [ ] Cashier can only see their own current_order (RLS test)

### Test 4: View Active Sessions
```sql
SELECT * FROM active_sessions_view LIMIT 5;
```
- [ ] View returns data
- [ ] All columns populated correctly
- [ ] Calculated fields (duration_minutes, order_count) accurate

---

## 🔄 Rollback Checklist (if needed)

Only use if deployment fails and needs to be reverted:

### Rollback Step 1: Current Orders
- [ ] Drop trigger `trigger_current_order_items_totals`
- [ ] Drop trigger `update_current_orders_updated_at`
- [ ] Drop function `trigger_calculate_current_order_totals()`
- [ ] Drop function `calculate_current_order_totals(UUID)`
- [ ] Drop table `current_order_item_addons`
- [ ] Drop table `current_order_items`
- [ ] Drop table `current_orders`

### Rollback Step 2: Tab System
- [ ] Drop view `active_sessions_view`
- [ ] Drop trigger `trigger_update_session_totals`
- [ ] Drop trigger `trigger_set_session_number`
- [ ] Drop function `get_active_session_for_table(UUID)`
- [ ] Drop function `update_session_totals()`
- [ ] Drop function `set_session_number()`
- [ ] Drop function `generate_session_number()`
- [ ] Drop column `restaurant_tables.current_session_id`
- [ ] Drop column `orders.session_id`
- [ ] Drop table `order_sessions`
- [ ] Drop type `session_status` (if no other dependencies)

⚠️ **Warning**: Cannot easily rollback `order_status` enum values without database rebuild

---

## 📝 Notes

### Issues Found:
_(Document any issues encountered during deployment)_

- 

### Resolutions:
_(Document how issues were resolved)_

- 

### Additional Steps Taken:
_(Document any extra steps not in the standard checklist)_

- 

---

## ✅ Final Sign-Off

- [ ] **Database Administrator**: All database changes verified _______________
- [ ] **Backend Developer**: All functions and triggers tested _______________
- [ ] **Frontend Developer**: Application integration working _______________
- [ ] **QA Tester**: All test cases passed _______________
- [ ] **Project Manager**: Deployment approved _______________

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Verification Completed**: _____________  
**Status**: ⬜ Pending | ⬜ In Progress | ⬜ Complete | ⬜ Rolled Back
