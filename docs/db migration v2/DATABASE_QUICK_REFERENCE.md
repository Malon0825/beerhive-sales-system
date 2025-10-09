# BeerHive Database - Quick Reference Card

## 📊 Database Statistics

| Metric | Count |
|--------|-------|
| **Total Tables** | 35 |
| **Custom Types (ENUMs)** | 16 |
| **Functions** | 17 |
| **Triggers** | 24 |
| **RLS Policies** | 33 |
| **Indexes** | 100+ |
| **Current Users** | 5 |
| **Active Sessions** | 2 |

---

## 🔑 Key Tables by Category

### 👥 Users & Authentication
```
users (5 rows)
├─ Columns: id, username, email, role, roles[], manager_pin
├─ Primary Key: id
└─ Unique: username, email
```

### 🍺 Products
```
products
├─ product_categories (hierarchical)
├─ product_addons
├─ product_addon_associations
├─ packages
└─ package_items
```

### 👤 Customers
```
customers
├─ Tiers: regular, vip_silver, vip_gold, vip_platinum
└─ customer_events (birthdays, anniversaries)
```

### 🪑 Tables & Sessions
```
restaurant_tables
└─ order_sessions (TAB system)
    ├─ Format: TAB-YYYYMMDD-XXX
    ├─ Status: open, closed, abandoned
    └─ Links multiple orders
```

### 📦 Orders Flow
```
POS Screen:
  current_orders (active)
  └─ current_order_items
      └─ current_order_item_addons
          ⬇️ [Complete Order]
Completed:
  orders
  ├─ order_items
  │   └─ order_item_addons
  └─ kitchen_orders (preparation queue)
```

---

## 🔐 User Roles

| Role | Permissions | PIN Required |
|------|------------|--------------|
| **admin** | Full system access | No |
| **manager** | Manage products, view reports, authorize discounts | Yes (6-digit) |
| **cashier** | Create orders, process payments | No |
| **kitchen** | View/update kitchen orders | No |
| **bartender** | View/update bar orders | No |
| **waiter** | View orders, deliver food | No |

---

## 📋 Custom Types (ENUMs)

### user_role
```sql
'admin' | 'manager' | 'cashier' | 'kitchen' | 'bartender' | 'waiter'
```

### order_status
```sql
'pending' | 'completed' | 'voided' | 'on_hold' | 'draft' | 
'confirmed' | 'preparing' | 'ready' | 'served'
```

### kitchen_order_status
```sql
'pending' | 'preparing' | 'ready' | 'served'
```

### payment_method
```sql
'cash' | 'card' | 'gcash' | 'paymaya' | 'bank_transfer' | 'split'
```

### table_status
```sql
'available' | 'occupied' | 'reserved' | 'cleaning'
```

### session_status
```sql
'open' | 'closed' | 'abandoned'
```

### customer_tier
```sql
'regular' | 'vip_silver' | 'vip_gold' | 'vip_platinum'
```

### notification_type
```sql
'order_created' | 'order_completed' | 'order_voided' | 
'food_ready' | 'food_delivered' | 'beverage_ready' | 'beverage_delivered' |
'low_stock' | 'out_of_stock' | 'reorder_point' | 'system_alert'
```

### notification_priority
```sql
'low' | 'normal' | 'high' | 'urgent'
```

---

## 🔄 Key Functions

### Session Management
```sql
-- Generate new tab number
generate_session_number() → 'TAB-YYYYMMDD-XXX'

-- Get active session for table
get_active_session_for_table(table_id UUID) → session details
```

### Calculations
```sql
-- Update order totals
calculate_current_order_totals(order_id UUID)

-- Update session totals (triggered automatically)
update_session_totals()
```

### Notifications
```sql
-- Create order notification
create_order_notification(order_id, type, title, message) → UUID

-- Create inventory notification
create_inventory_notification(product_id, product_name, stock, reorder_point, type) → UUID

-- Mark all as read
mark_all_notifications_read(user_id UUID) → INTEGER

-- Cleanup
cleanup_old_notifications()  -- Deletes read notifications > 30 days
delete_expired_notifications()  -- Deletes expired notifications
```

### User Management
```sql
-- Get current user's role
get_current_user_role() → user_role

-- Auth user provisioning (triggered on Supabase Auth user creation)
handle_auth_user_created()
```

---

## 🔔 Automatic Triggers

### Order Triggers
- `trigger_notify_new_order` - Creates notification when order is inserted
- `trigger_notify_order_completed` - Creates notification when order is completed
- `trigger_update_session_totals` - Updates session totals when order changes

### Kitchen Triggers
- `trigger_notify_kitchen_order_ready` - Notifies waiters when food/beverage is ready

### Inventory Triggers
- `trigger_notify_low_stock` - Creates alert when stock falls below reorder point

### Current Order Triggers
- `trigger_current_order_items_totals` - Recalculates order totals when items change
- `trigger_current_orders_updated_at` - Updates timestamp

### Timestamp Triggers
- `update_*_updated_at` - Auto-updates updated_at on 15+ tables

---

## 🗂️ Important Indexes

### High-Performance Queries
```sql
-- Users
idx_users_username, idx_users_role, idx_users_active

-- Products
idx_products_sku, idx_products_category, idx_products_stock_level

-- Orders
idx_orders_number, idx_orders_cashier, idx_orders_date, idx_orders_session

-- Kitchen
idx_kitchen_orders_status, idx_kitchen_orders_destination

-- Notifications
idx_notifications_user, idx_notifications_role, idx_notifications_is_read

-- Current Orders (with conditions)
idx_current_orders_cashier_id WHERE is_on_hold = false
```

---

## 🛡️ Row Level Security (RLS)

### Users Table
```sql
✅ Admins can manage all users
✅ Admins & Managers can view all users
✅ Users can view their own data
```

### Products Table
```sql
✅ Authenticated users can view products
✅ Managers can manage products
```

### Orders Table
```sql
✅ Staff can view all orders
✅ Cashiers can create orders
✅ Cashiers can update their own orders
```

### Current Orders Table
```sql
✅ Cashiers can manage their own current orders
✅ Admins & Managers can manage all current orders
```

### Notifications Table
```sql
✅ Users can view their own or role-based notifications
✅ Users can update their own notifications
✅ Service role can insert notifications
```

---

## 📊 Common Queries

### Get Active Orders
```sql
SELECT * FROM current_orders 
WHERE cashier_id = auth.uid() 
AND is_on_hold = false;
```

### Get Open Tab Sessions
```sql
SELECT * FROM order_sessions 
WHERE status = 'open' 
ORDER BY opened_at DESC;
```

### Get Available Tables
```sql
SELECT * FROM restaurant_tables 
WHERE status = 'available' 
AND is_active = true;
```

### Get Unread Notifications
```sql
SELECT * FROM notifications 
WHERE (user_id = auth.uid() OR role = get_current_user_role())
AND is_read = false
ORDER BY priority DESC, created_at DESC;
```

### Get Low Stock Products
```sql
SELECT * FROM products 
WHERE current_stock <= reorder_point 
AND is_active = true
ORDER BY current_stock ASC;
```

### Get Today's Sales
```sql
SELECT 
    COUNT(*) as order_count,
    SUM(total_amount) as total_sales
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
AND status = 'completed';
```

### Get Kitchen Queue
```sql
SELECT * FROM kitchen_orders 
WHERE status IN ('pending', 'preparing')
ORDER BY priority DESC, created_at ASC;
```

---

## 🔧 Maintenance Commands

### Analyze Tables
```sql
ANALYZE;  -- Update statistics
VACUUM ANALYZE;  -- Cleanup and analyze
```

### Check Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Active Connections
```sql
SELECT count(*) FROM pg_stat_activity 
WHERE datname = current_database();
```

### Monitor Long-Running Queries
```sql
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - pg_stat_activity.query_start > interval '1 minute';
```

---

## 🚀 Quick Start Queries

### Create New User (via Auth)
```javascript
// Use Supabase Auth API
const { data, error } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  password: 'secure_password',
  email_confirm: true,
  user_metadata: {
    role: 'cashier',
    full_name: 'John Doe'
  }
})
// Automatically provisioned to public.users via trigger
```

### Open New Tab Session
```sql
INSERT INTO order_sessions (table_id, customer_id, opened_by)
VALUES (
    'table-uuid',
    'customer-uuid',  -- optional
    auth.uid()
)
RETURNING *;
-- session_number auto-generated: TAB-YYYYMMDD-XXX
```

### Create POS Order
```sql
-- 1. Create current order
INSERT INTO current_orders (cashier_id, table_id)
VALUES (auth.uid(), 'table-uuid')
RETURNING id;

-- 2. Add items
INSERT INTO current_order_items (
    current_order_id, product_id, item_name, 
    quantity, unit_price, subtotal, total
)
VALUES (
    'current-order-uuid',
    'product-uuid',
    'Beer Large',
    2, 150.00, 300.00, 300.00
);
-- Totals auto-calculated via trigger
```

### Complete Order
```sql
-- Move from current_orders to orders
-- (Handled by application logic)
```

---

## 📞 Emergency Contacts

### Issues
- Database down → Check Supabase status
- RLS errors → Verify user authentication
- Slow queries → Check indexes
- Notification not working → Check realtime connection

### Useful Links
- Supabase Dashboard: `https://app.supabase.com`
- Database Logs: Check Supabase Dashboard → Database → Logs
- API Logs: Check Supabase Dashboard → API → Logs

---

## 🎯 Performance Tips

1. **Use indexes** - All FK columns are indexed
2. **Enable connection pooling** - Set appropriate pool sizes
3. **Use prepared statements** - Reduces parsing overhead
4. **Limit SELECT queries** - Only fetch needed columns
5. **Use pagination** - Don't load all records at once
6. **Monitor slow queries** - Use `pg_stat_statements`
7. **Regular VACUUM** - Keeps table statistics updated
8. **Archive old data** - Keep active tables lean

---

## 📝 Notes

- **Session Numbers:** Auto-generated in format `TAB-YYYYMMDD-XXX`
- **Manager PIN:** 6-digit numeric, stored in users table
- **Realtime:** Enabled on kitchen_orders, notifications, orders, order_sessions
- **Soft Deletes:** Not implemented, use `is_active` flags instead
- **Timestamps:** All tables have `created_at`, most have `updated_at`
- **Currency:** All monetary values in decimal(12,2)
- **Quantities:** Stored as decimal(12,3) to support fractional units

---

**Last Updated:** 2025-10-09  
**Version:** 2.0  
**Status:** ✅ Production Ready
