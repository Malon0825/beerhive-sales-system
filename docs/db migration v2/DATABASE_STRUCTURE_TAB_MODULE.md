# Database Structure - Tab Management Module

**Date**: 2025-10-09  
**Purpose**: Complete database structure documentation for Tab Management System  
**Status**: Production Deployment Reference  
**Version**: 1.0

---

## 📋 Overview

The Tab Management System introduces session-based ordering for restaurants:
- Open tabs that remain active during customer visit
- Multiple orders per tab before payment
- Automatic session total calculations
- Draft order staging area

**Migration Files**:
- `migrations/add_tab_system.sql` (314 lines)
- `migrations/create_current_orders_table.sql` (278 lines)

---

## 🆕 New Tables Created

### 1. `order_sessions` - Main tab tracking table
Represents a complete dining experience (tab) for a table.

**Key Columns**: `id`, `session_number` (UNIQUE), `table_id`, `customer_id`, `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `status` (session_status), `opened_at`, `closed_at`, `opened_by`, `closed_by`, `notes`, `created_at`, `updated_at`

**Foreign Keys**:
- `table_id` → `restaurant_tables(id)` ON DELETE SET NULL
- `customer_id` → `customers(id)` ON DELETE SET NULL
- `opened_by` → `users(id)` ON DELETE SET NULL
- `closed_by` → `users(id)` ON DELETE SET NULL

**Indexes**: 6 (table_id, customer_id, status, session_number, opened_at, closed_at)

---

### 2. `current_orders` - Draft order staging
Staging table for orders being built in POS before confirmation. Each cashier has isolated orders.

**Key Columns**: `id`, `cashier_id` (NOT NULL), `customer_id`, `table_id`, `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `applied_event_offer_id`, `order_notes`, `is_on_hold`, `created_at`, `updated_at`

**Foreign Keys**:
- `cashier_id` → `users(id)` ON DELETE CASCADE
- `customer_id` → `customers(id)` ON DELETE SET NULL
- `table_id` → `restaurant_tables(id)` ON DELETE SET NULL
- `applied_event_offer_id` → `customer_events(id)` ON DELETE SET NULL

**Unique Constraint**: `(cashier_id, id)` - Ensures cashier isolation

**Indexes**: 4 (cashier_id, customer_id, table_id, created_at)

---

### 3. `current_order_items` - Items in draft orders

**Key Columns**: `id`, `current_order_id` (NOT NULL), `product_id`, `package_id`, `item_name`, `quantity`, `unit_price`, `subtotal`, `discount_amount`, `total`, `is_vip_price`, `is_complimentary`, `notes`, `created_at`

**Foreign Keys**:
- `current_order_id` → `current_orders(id)` ON DELETE CASCADE
- `product_id` → `products(id)` ON DELETE RESTRICT
- `package_id` → `packages(id)` ON DELETE RESTRICT

**Check Constraint**: Must have either `product_id` OR `package_id`, not both

**Indexes**: 3 (current_order_id, product_id, package_id)

---

### 4. `current_order_item_addons` - Add-ons for draft items

**Key Columns**: `id`, `current_order_item_id` (NOT NULL), `addon_id`, `addon_name`, `addon_price`, `quantity`, `created_at`

**Foreign Keys**:
- `current_order_item_id` → `current_order_items(id)` ON DELETE CASCADE
- `addon_id` → `product_addons(id)` ON DELETE RESTRICT

**Indexes**: 1 (current_order_item_id)

---

## ✏️ Modified Existing Tables

### 1. `orders` Table
**New Column**: `session_id` UUID - Links order to session  
**Foreign Key**: `session_id` → `order_sessions(id)` ON DELETE SET NULL  
**Index**: `idx_orders_session` ON `session_id`

### 2. `restaurant_tables` Table
**New Column**: `current_session_id` UUID - Tracks active session  
**Foreign Key**: `current_session_id` → `order_sessions(id)` ON DELETE SET NULL  
**Index**: `idx_tables_session` ON `current_session_id`

⚠️ **Note**: Old `current_order_id` column still exists for backward compatibility

---

## 🏷️ New Enums

### 1. `session_status` (NEW)
Values: `'open'`, `'closed'`, `'abandoned'`

```sql
CREATE TYPE session_status AS ENUM ('open', 'closed', 'abandoned');
```

### 2. `order_status` (EXTENDED)
**New Values Added**: `'draft'`, `'confirmed'`, `'preparing'`, `'ready'`, `'served'`  
**Existing Values**: `'pending'`, `'completed'`, `'voided'`, `'on_hold'`

```sql
ALTER TYPE order_status ADD VALUE 'draft';
ALTER TYPE order_status ADD VALUE 'confirmed';
ALTER TYPE order_status ADD VALUE 'preparing';
ALTER TYPE order_status ADD VALUE 'ready';
ALTER TYPE order_status ADD VALUE 'served';
```

---

## ⚙️ Database Functions (6 total)

### 1. `generate_session_number()` → VARCHAR(50)
Auto-generates unique session numbers: TAB-YYYYMMDD-XXX (e.g., TAB-20251009-001)

### 2. `set_session_number()` → TRIGGER
Trigger function to auto-set session_number on INSERT

### 3. `update_session_totals()` → TRIGGER
Recalculates session totals when orders change (INSERT/UPDATE/DELETE)

### 4. `calculate_current_order_totals(order_id UUID)` → VOID
Recalculates totals for current (draft) orders from items

### 5. `trigger_calculate_current_order_totals()` → TRIGGER
Trigger wrapper for calculate_current_order_totals

### 6. `get_active_session_for_table(p_table_id UUID)` → TABLE
Returns active session details for a table

---

## 🔔 Database Triggers (4 total)

| Trigger Name | Table | Event | Function | Purpose |
|--------------|-------|-------|----------|---------|
| `trigger_set_session_number` | order_sessions | BEFORE INSERT | set_session_number() | Auto-generate session numbers |
| `trigger_update_session_totals` | orders | AFTER INSERT/UPDATE/DELETE | update_session_totals() | Update session totals |
| `trigger_current_order_items_totals` | current_order_items | AFTER INSERT/UPDATE/DELETE | trigger_calculate_current_order_totals() | Update current order totals |
| `update_current_orders_updated_at` | current_orders | BEFORE UPDATE | update_updated_at_column() | Update timestamp |

---

## 📊 Database Indexes (16 new total)

### By Table:
- **order_sessions**: 6 indexes
- **orders**: 1 new index (`session_id`)
- **restaurant_tables**: 1 new index (`current_session_id`)
- **current_orders**: 4 indexes
- **current_order_items**: 3 indexes
- **current_order_item_addons**: 1 index

---

## 🔒 Row Level Security Policies (14 total)

### order_sessions (3 policies)
- ✅ All authenticated users can view
- ✅ Cashiers/managers/admins can create
- ✅ Cashiers/managers/admins can update

### current_orders (5 policies)
- ✅ Cashiers view/create/update/delete own orders only
- ✅ Admins/managers can manage all orders

### current_order_items (4 policies)
- ✅ Users view/insert/update/delete items in own orders
- ✅ Admins/managers have full access

### current_order_item_addons (2 policies)
- ✅ Users view/manage addons in own orders
- ✅ Admins/managers have full access

---

## 📺 Views Created

### `active_sessions_view`
Consolidated view of all active (open) sessions with:
- Session details (id, session_number, amounts, dates)
- Table info (table_number, area)
- Customer info (name, tier)
- Staff info (opened_by, closed_by)
- Calculated duration_minutes
- Order counts (total, draft, confirmed, served)

---

## 🔗 Foreign Key Relationships

### New Relationships:
```
order_sessions
  ├─→ restaurant_tables (table_id)
  ├─→ customers (customer_id)
  ├─→ users (opened_by)
  └─→ users (closed_by)

orders
  └─→ order_sessions (session_id) [NEW]

restaurant_tables
  └─→ order_sessions (current_session_id) [NEW]

current_orders
  ├─→ users (cashier_id)
  ├─→ customers (customer_id)
  ├─→ restaurant_tables (table_id)
  └─→ customer_events (applied_event_offer_id)

current_order_items
  ├─→ current_orders (current_order_id) [CASCADE DELETE]
  ├─→ products (product_id)
  └─→ packages (package_id)

current_order_item_addons
  ├─→ current_order_items (current_order_item_id) [CASCADE DELETE]
  └─→ product_addons (addon_id)
```

---

## ✅ Production Deployment Checklist

### Pre-Deployment
- [ ] **Backup Production Database** (CRITICAL)
- [ ] Test migrations on staging environment
- [ ] Verify Supabase connection and credentials
- [ ] Review all SQL migration files
- [ ] Confirm no active orders in progress

### Deployment Steps

#### Step 1: Apply Tab System Migration
```bash
# Apply add_tab_system.sql
psql -d production_db -f migrations/add_tab_system.sql
```

**Expected Results**:
- ✅ `session_status` enum created
- ✅ `order_status` enum extended with 5 new values
- ✅ `order_sessions` table created (15 columns)
- ✅ 6 indexes created on `order_sessions`
- ✅ `session_id` column added to `orders` table
- ✅ `current_session_id` column added to `restaurant_tables` table
- ✅ 6 functions created
- ✅ 2 triggers created on `order_sessions` and `orders`
- ✅ 3 RLS policies created
- ✅ Realtime enabled for `order_sessions`
- ✅ `active_sessions_view` created

#### Step 2: Apply Current Orders Migration
```bash
# Apply create_current_orders_table.sql
psql -d production_db -f migrations/create_current_orders_table.sql
```

**Expected Results**:
- ✅ `current_orders` table created (13 columns)
- ✅ `current_order_items` table created (14 columns)
- ✅ `current_order_item_addons` table created (7 columns)
- ✅ 8 indexes created
- ✅ 14 RLS policies created
- ✅ 2 functions created (calculate_current_order_totals, trigger wrapper)
- ✅ 2 triggers created
- ✅ RLS enabled on all 3 tables

### Post-Deployment Verification

#### 1. Verify Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('order_sessions', 'current_orders', 'current_order_items', 'current_order_item_addons');
```
**Expected**: 4 rows

#### 2. Verify Enums
```sql
SELECT unnest(enum_range(NULL::session_status)) AS session_status;
SELECT unnest(enum_range(NULL::order_status)) AS order_status;
```
**Expected**: 
- session_status: 3 values
- order_status: 9 values total (4 old + 5 new)

#### 3. Verify Columns Added
```sql
-- Check orders.session_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'session_id';

-- Check restaurant_tables.current_session_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'restaurant_tables' AND column_name = 'current_session_id';
```
**Expected**: 2 rows (both should be type 'uuid')

#### 4. Verify Functions
```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN (
    'generate_session_number',
    'set_session_number',
    'update_session_totals',
    'calculate_current_order_totals',
    'trigger_calculate_current_order_totals',
    'get_active_session_for_table'
);
```
**Expected**: 6 rows

#### 5. Verify Triggers
```sql
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname IN (
    'trigger_set_session_number',
    'trigger_update_session_totals',
    'trigger_current_order_items_totals',
    'update_current_orders_updated_at'
);
```
**Expected**: 4 rows

#### 6. Verify Indexes
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('order_sessions', 'orders', 'restaurant_tables', 'current_orders', 'current_order_items', 'current_order_item_addons')
  AND indexname LIKE 'idx_%';
```
**Expected**: 16+ rows

#### 7. Verify RLS Policies
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('order_sessions', 'current_orders', 'current_order_items', 'current_order_item_addons');
```
**Expected**: 14 rows

#### 8. Verify Views
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'active_sessions_view';
```
**Expected**: 1 row

#### 9. Test Session Creation
```sql
-- Create test session
INSERT INTO order_sessions (table_id, opened_by) 
VALUES (
    (SELECT id FROM restaurant_tables LIMIT 1),
    (SELECT id FROM users WHERE role = 'cashier' LIMIT 1)
);

-- Verify session number was auto-generated
SELECT session_number FROM order_sessions ORDER BY created_at DESC LIMIT 1;
```
**Expected**: Session number like "TAB-20251009-001"

#### 10. Test Realtime
```sql
-- Check realtime publication
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('order_sessions', 'current_orders', 'current_order_items');
```
**Expected**: 3 rows

### Rollback Plan

If issues occur, execute rollback in reverse order:

#### Rollback Step 1: Drop Current Orders Tables
```sql
DROP TRIGGER IF EXISTS trigger_current_order_items_totals ON current_order_items;
DROP TRIGGER IF EXISTS update_current_orders_updated_at ON current_orders;
DROP FUNCTION IF EXISTS trigger_calculate_current_order_totals();
DROP FUNCTION IF EXISTS calculate_current_order_totals(UUID);
DROP TABLE IF EXISTS current_order_item_addons CASCADE;
DROP TABLE IF EXISTS current_order_items CASCADE;
DROP TABLE IF EXISTS current_orders CASCADE;
```

#### Rollback Step 2: Drop Tab System
```sql
-- Drop view
DROP VIEW IF EXISTS active_sessions_view;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_session_totals ON orders;
DROP TRIGGER IF EXISTS trigger_set_session_number ON order_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS get_active_session_for_table(UUID);
DROP FUNCTION IF EXISTS update_session_totals();
DROP FUNCTION IF EXISTS set_session_number();
DROP FUNCTION IF EXISTS generate_session_number();

-- Drop columns from existing tables
ALTER TABLE restaurant_tables DROP COLUMN IF EXISTS current_session_id;
ALTER TABLE orders DROP COLUMN IF EXISTS session_id;

-- Drop new table
DROP TABLE IF EXISTS order_sessions CASCADE;

-- Drop enum (be careful - may have dependencies)
-- DROP TYPE IF EXISTS session_status;
```

⚠️ **Warning**: Cannot easily rollback `order_status` enum changes without recreating the enum

---

## 📝 Notes for Production

### Important Considerations:
1. **Enum Values**: Once added to `order_status`, enum values cannot be removed without rebuilding the enum
2. **Backward Compatibility**: Old `current_order_id` on `restaurant_tables` preserved for compatibility
3. **Cascade Deletes**: `current_order_items` and `current_order_item_addons` cascade delete with parent
4. **RLS Security**: Cashier isolation enforced at database level
5. **Auto-calculations**: Triggers handle all total calculations automatically
6. **Realtime**: Ensure Supabase realtime is enabled for `order_sessions` and `current_orders` tables

### Performance Notes:
- All critical columns have indexes
- Triggers are optimized for minimal overhead
- RLS policies use efficient EXISTS clauses
- Expected query time: < 100ms for most operations

### Monitoring:
```sql
-- Monitor active sessions
SELECT COUNT(*) FROM order_sessions WHERE status = 'open';

-- Monitor current orders by cashier
SELECT cashier_id, COUNT(*) 
FROM current_orders 
GROUP BY cashier_id;

-- Check session totals accuracy
SELECT 
    os.id,
    os.total_amount as session_total,
    COALESCE(SUM(o.total_amount), 0) as calculated_total
FROM order_sessions os
LEFT JOIN orders o ON o.session_id = os.id
WHERE os.status = 'open'
GROUP BY os.id, os.total_amount
HAVING os.total_amount != COALESCE(SUM(o.total_amount), 0);
```

---

## 📚 Related Documentation

- `TAB_SYSTEM_IMPLEMENTATION.md` - Full implementation details
- `TAB_SYSTEM_PROPOSAL.md` - Original proposal and requirements
- `UNIFIED_TAB_MANAGEMENT_SYSTEM.md` - UI integration guide
- `DATABASE_IMPLEMENTATION_SUMMARY.md` - Current orders staging system
- `CURRENT_ORDERS_STAGING_TABLE.md` - Staging table details

---

**Document Created**: 2025-10-09  
**Last Updated**: 2025-10-09  
**Status**: ✅ Ready for Production Deployment
