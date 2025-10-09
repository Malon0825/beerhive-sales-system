# BeerHive Sales System - Database Deployment Guide

**Version:** 2.0  
**Last Updated:** 2025-10-09  
**Author:** Development Team

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Tables Summary](#database-tables-summary)
4. [Table Relationships Diagram](#table-relationships-diagram)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides step-by-step instructions for deploying the BeerHive Sales System database to a production environment. The system consists of 35 tables, 16 custom types, 17 functions, and 24 triggers.

### System Requirements
- PostgreSQL 14.0 or higher
- Supabase (for Auth and Realtime features)
- Minimum 10GB database storage
- Proper network connectivity for real-time features

---

## Prerequisites

### Required Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Required Permissions
- `CREATE DATABASE`
- `CREATE TYPE`
- `CREATE TABLE`
- `CREATE FUNCTION`
- `CREATE TRIGGER`
- `ALTER TABLE`
- `CREATE POLICY`

---

## Database Tables Summary

### Core System Tables (35 Total)

#### 1. Authentication & User Management
| Table | Rows | Purpose |
|-------|------|---------|
| `users` | 5 | System users with role-based access |

#### 2. Product Management (8 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `product_categories` | - | Product categorization |
| `products` | - | Product master data |
| `product_addons` | - | Product add-ons |
| `product_addon_associations` | - | Product-addon links |
| `packages` | - | Product bundles |
| `package_items` | - | Package contents |
| `happy_hour_pricing` | - | Time-based promotions |
| `happy_hour_products` | - | Products in happy hour |

#### 3. Customer Management (2 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `customers` | - | Customer information |
| `customer_events` | - | Special events & offers |

#### 4. Table & Session Management (2 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `restaurant_tables` | - | Table management |
| `order_sessions` | 2 | Tab system for orders |

#### 5. Order Management (7 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `orders` | - | Completed orders |
| `order_items` | - | Order line items |
| `order_item_addons` | - | Add-ons on order items |
| `current_orders` | 0 | Active POS orders |
| `current_order_items` | 0 | Active order items |
| `current_order_item_addons` | 0 | Active order addons |
| `kitchen_orders` | - | Kitchen queue |

#### 6. Payment & Discounts (2 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `split_payments` | - | Multiple payment methods |
| `discounts` | - | Applied discounts |

#### 7. Inventory Management (4 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `inventory_movements` | - | Inventory audit trail |
| `suppliers` | - | Supplier information |
| `product_suppliers` | - | Product-supplier links |
| `purchase_orders` | - | Purchase orders |
| `purchase_order_items` | - | PO line items |

#### 8. System & Monitoring (4 tables)
| Table | Rows | Purpose |
|-------|------|---------|
| `notifications` | 0 | Real-time notifications |
| `price_history` | - | Price change audit |
| `audit_logs` | - | System audit trail |
| `system_settings` | - | Configuration |

---

## Table Relationships Diagram

### Primary Relationships

```
users (5)
├── orders.cashier_id
├── orders.voided_by
├── current_orders.cashier_id
├── kitchen_orders.assigned_to
├── order_sessions.opened_by
├── order_sessions.closed_by
├── notifications.user_id
├── inventory_movements.performed_by
└── audit_logs.user_id

products
├── order_items.product_id
├── current_order_items.product_id
├── inventory_movements.product_id
├── package_items.product_id
├── product_addon_associations.product_id
├── product_suppliers.product_id
├── happy_hour_products.product_id
└── price_history.product_id

customers
├── orders.customer_id
├── current_orders.customer_id
├── order_sessions.customer_id
└── customer_events.customer_id

restaurant_tables
├── orders.table_id
├── current_orders.table_id
├── order_sessions.table_id
└── current_session_id → order_sessions.id

order_sessions (Tab System) (2 active)
├── orders.session_id
└── restaurant_tables.current_session_id

orders
├── order_items.order_id
├── kitchen_orders.order_id
├── split_payments.order_id
├── discounts.order_id
└── inventory_movements.order_id

current_orders
├── current_order_items.current_order_id
└── [transitions to orders when completed]

product_categories
├── products.category_id
└── parent_category_id (self-reference)
```

### Circular Dependencies (Resolved)
- `restaurant_tables.current_session_id` → `order_sessions.id`
- `order_sessions.table_id` → `restaurant_tables.id`

**Resolution:** FK constraint added after both tables exist.

---

## Deployment Steps

### Step 1: Pre-Deployment Backup

```bash
# Backup existing database (if any)
pg_dump -U postgres -d beerhive_db -F c -f beerhive_backup_$(date +%Y%m%d_%H%M%S).dump

# Or using Supabase CLI
supabase db dump -f backup.sql
```

### Step 2: Create Database (if new)

```sql
-- Create new database
CREATE DATABASE beerhive_production
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;
```

### Step 3: Deploy Extensions

```sql
-- Connect to database
\c beerhive_production

-- Install required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Step 4: Deploy Schema Using Supabase CLI

```bash
# Method 1: Using Supabase CLI (Recommended)
cd /path/to/beerhive-sales-system

# Run migrations in order
supabase migration up

# Or apply specific migration
supabase db push
```

### Step 5: Manual SQL Deployment (Alternative)

If not using Supabase CLI, execute migrations in this order:

1. **Base Schema**
   ```bash
   psql -U postgres -d beerhive_production -f migrations/init_beerhive_schema_v2.sql
   ```

2. **Cross-table Foreign Keys**
   ```bash
   psql -U postgres -d beerhive_production -f migrations/add_cross_table_foreign_keys.sql
   ```

3. **Current Orders System**
   ```bash
   psql -U postgres -d beerhive_production -f migrations/create_current_orders_table.sql
   ```

4. **Tab System**
   ```bash
   psql -U postgres -d beerhive_production -f migrations/add_tab_system.sql
   ```

5. **Notifications System**
   ```bash
   psql -U postgres -d beerhive_production -f migrations/create_notifications_table.sql
   psql -U postgres -d beerhive_production -f migrations/fix_notifications_rls.sql
   ```

6. **Authentication & Authorization**
   ```bash
   psql -U postgres -d beerhive_production -f migrations/auth_managed_passwords_and_provisioning.sql
   psql -U postgres -d beerhive_production -f migrations/fix_users_rls_infinite_recursion.sql
   ```

7. **Additional Features**
   ```bash
   psql -U postgres -d beerhive_production -f migrations/add_multiple_roles_support.sql
   psql -U postgres -d beerhive_production -f migrations/add_waiter_role.sql
   psql -U postgres -d beerhive_production -f migrations/add_manager_pin.sql
   ```

### Step 6: Enable Realtime (Supabase)

```sql
-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
```

### Step 7: Create Initial Admin User

```sql
-- Insert first admin user (password will be managed by Supabase Auth)
-- You should create this through Supabase Auth dashboard or API
```

Or use the SQL helper:

```sql
-- Create admin through Auth and it will auto-provision to public.users
-- Use Supabase dashboard: Authentication > Users > Add User
-- Set metadata: { "role": "admin", "full_name": "Admin User" }
```

---

## Post-Deployment Verification

### 1. Verify Tables

```sql
-- Check all tables are created
SELECT 
    schemaname, 
    tablename,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = schemaname) as column_count
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected: 35 tables
```

### 2. Verify Custom Types

```sql
-- Check all custom types
SELECT typname, typtype 
FROM pg_type 
WHERE typnamespace = 'public'::regnamespace
AND typtype = 'e'
ORDER BY typname;

-- Expected: 16 enum types
```

### 3. Verify Functions

```sql
-- Check all functions
SELECT proname, prokind 
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND prokind = 'f'
ORDER BY proname;

-- Expected: 17 functions
```

### 4. Verify Triggers

```sql
-- Check all triggers
SELECT 
    event_object_table, 
    trigger_name,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Expected: 24 triggers
```

### 5. Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: RLS enabled on sensitive tables, 33 policies
```

### 6. Verify Indexes

```sql
-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected: 100+ indexes
```

### 7. Test Basic Operations

```sql
-- Test user query
SELECT COUNT(*) FROM users;
-- Expected: 5 users

-- Test order sessions
SELECT COUNT(*) FROM order_sessions;
-- Expected: 2 active sessions

-- Test products
SELECT COUNT(*) FROM products WHERE is_active = true;

-- Test notifications
SELECT COUNT(*) FROM notifications WHERE is_read = false;
-- Expected: 0 (clean slate)
```

### 8. Test Functions

```sql
-- Test session number generation
SELECT generate_session_number();
-- Expected: TAB-YYYYMMDD-XXX format

-- Test get active session
SELECT * FROM get_active_session_for_table(
    (SELECT id FROM restaurant_tables LIMIT 1)
);
```

### 9. Test Realtime (if using Supabase)

```javascript
// JavaScript test
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test realtime subscription
const channel = supabase
  .channel('test-notifications')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'notifications' },
    (payload) => console.log('New notification:', payload)
  )
  .subscribe()
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Restore from backup
pg_restore -U postgres -d beerhive_production -c beerhive_backup_YYYYMMDD_HHMMSS.dump

# Or using SQL dump
psql -U postgres -d beerhive_production < backup.sql
```

### Partial Rollback (Undo specific migration)

```bash
# Using Supabase CLI
supabase migration list  # Check migration versions
supabase migration down  # Undo last migration

# Manual rollback
psql -U postgres -d beerhive_production -f migrations/rollback/undo_<migration_name>.sql
```

### Emergency Rollback (Drop all)

```sql
-- ⚠️ WARNING: This will delete ALL data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

---

## Troubleshooting

### Issue 1: Circular Foreign Key Error

**Error:**
```
ERROR: relation "order_sessions" does not exist
```

**Solution:**
```sql
-- Create tables without circular FK first
-- Then add FK constraint after both tables exist
ALTER TABLE restaurant_tables
ADD CONSTRAINT restaurant_tables_current_session_id_fkey
FOREIGN KEY (current_session_id) REFERENCES order_sessions(id);
```

### Issue 2: RLS Infinite Recursion

**Error:**
```
ERROR: infinite recursion detected in policy for relation "users"
```

**Solution:**
```sql
-- Use SECURITY DEFINER function to break recursion
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_role_value;
END;
$$;
```

### Issue 3: Migration Already Applied

**Error:**
```
ERROR: type "user_role" already exists
```

**Solution:**
```sql
-- Use conditional creation
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'kitchen', 'bartender', 'waiter');
    END IF;
END $$;
```

### Issue 4: Permission Denied

**Error:**
```
ERROR: permission denied for table users
```

**Solution:**
```sql
-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
```

### Issue 5: Enum Value Already Exists

**Error:**
```
ERROR: enum label "waiter" already exists
```

**Solution:**
```sql
-- Check before adding
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'waiter'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'waiter';
    END IF;
END $$;
```

---

## Performance Tuning

### Recommended Indexes (Already included)

```sql
-- High-traffic query indexes
CREATE INDEX CONCURRENTLY idx_orders_cashier_date ON orders(cashier_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_products_category_active ON products(category_id, is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
```

### Connection Pooling

```
# Recommended pool settings for production
DB_POOL_MIN=10
DB_POOL_MAX=100
DB_POOL_TIMEOUT=30000
```

### Vacuum Schedule

```sql
-- Run weekly
VACUUM ANALYZE;

-- Or set up auto-vacuum
ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE order_items SET (autovacuum_vacuum_scale_factor = 0.1);
```

---

## Security Checklist

- [ ] All sensitive tables have RLS enabled
- [ ] Service role key is kept secure (never exposed to client)
- [ ] Anon key has appropriate permissions
- [ ] Admin users are properly configured
- [ ] Database backups are encrypted
- [ ] SSL/TLS is enforced for connections
- [ ] Audit logging is enabled
- [ ] Password policies are configured in Supabase Auth

---

## Monitoring & Maintenance

### Daily Tasks
- Monitor error logs
- Check notification queue
- Verify backup completion

### Weekly Tasks
- Review audit logs
- Clean up old notifications
- Check inventory levels
- Review performance metrics

### Monthly Tasks
- Analyze slow queries
- Review and optimize indexes
- Archive old data
- Update documentation

---

## Support & Resources

### Documentation
- Main README: `/README.md`
- Database Structure: `/docs/DATABASE_STRUCTURE_COMPLETE.md`
- API Documentation: `/docs/API_DOCUMENTATION.md`

### Scripts
- Migration files: `/migrations/*.sql`
- Utility scripts: `/scripts/*.sql`

### Contact
For deployment issues or questions:
- Create an issue in the repository
- Contact the development team
- Review existing documentation in `/docs` folder

---

**Document Version:** 2.0  
**Last Updated:** 2025-10-09  
**Status:** Production Ready ✅
