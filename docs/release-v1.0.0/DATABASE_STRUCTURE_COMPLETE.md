# BeerHive Sales System - Complete Database Structure

**Version:** 2.0  
**Generated:** 2025-10-09  
**Total Tables:** 35  
**Total Users:** 5

## Overview

This document provides a comprehensive overview of the BeerHive POS System database structure, designed for production replication.

## Database Statistics

- **Custom Types (ENUMs):** 16
- **Tables:** 35
- **Functions:** 17
- **Triggers:** 24
- **Indexes:** 100+
- **RLS Policies:** 33

## Custom Types (ENUMs)

### 1. user_role
```sql
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'kitchen', 'bartender', 'waiter');
```

### 2. order_status
```sql
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'voided', 'on_hold', 'draft', 'confirmed', 'preparing', 'ready', 'served');
```

### 3. kitchen_order_status
```sql
CREATE TYPE kitchen_order_status AS ENUM ('pending', 'preparing', 'ready', 'served');
```

### 4. order_destination
```sql
CREATE TYPE order_destination AS ENUM ('kitchen', 'bartender', 'both');
```

### 5. payment_method
```sql
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'gcash', 'paymaya', 'bank_transfer', 'split');
```

### 6. table_status
```sql
CREATE TYPE table_status AS ENUM ('available', 'occupied', 'reserved', 'cleaning');
```

### 7. session_status
```sql
CREATE TYPE session_status AS ENUM ('open', 'closed', 'abandoned');
```

### 8. customer_tier
```sql
CREATE TYPE customer_tier AS ENUM ('regular', 'vip_silver', 'vip_gold', 'vip_platinum');
```

### 9. event_type
```sql
CREATE TYPE event_type AS ENUM ('birthday', 'anniversary', 'custom');
```

### 10. discount_type
```sql
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'complimentary');
```

### 11. package_type
```sql
CREATE TYPE package_type AS ENUM ('vip_only', 'regular', 'promotional');
```

### 12. adjustment_type
```sql
CREATE TYPE adjustment_type AS ENUM ('stock_in', 'stock_out', 'transfer', 'physical_count', 'sale', 'void_return');
```

### 13. adjustment_reason
```sql
CREATE TYPE adjustment_reason AS ENUM ('purchase', 'damaged', 'expired', 'theft', 'waste', 'count_correction', 'transfer_in', 'transfer_out', 'sale_deduction', 'void_return');
```

### 14. notification_type
```sql
CREATE TYPE notification_type AS ENUM ('order_created', 'order_completed', 'order_voided', 'food_ready', 'food_delivered', 'beverage_ready', 'beverage_delivered', 'low_stock', 'out_of_stock', 'reorder_point', 'system_alert');
```

### 15. notification_priority
```sql
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
```

## Core Tables Structure

### 1. users
**Purpose:** System users with role-based access control

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | User ID |
| username | VARCHAR(50) | UNIQUE NOT NULL | Login username |
| email | VARCHAR(255) | UNIQUE NOT NULL | Email address |
| password_hash | VARCHAR(255) | | Hashed password |
| full_name | VARCHAR(255) | | Full name |
| role | user_role | NOT NULL DEFAULT 'cashier' | Primary role |
| roles | user_role[] | DEFAULT ARRAY['cashier'] | Multiple roles support |
| manager_pin | VARCHAR(6) | CHECK (6 digits) | Manager authorization PIN |
| is_active | BOOLEAN | DEFAULT true | Active status |
| last_login | TIMESTAMPTZ | | Last login timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_users_username` on username
- `idx_users_role` on role
- `idx_users_active` on is_active
- `idx_users_manager_pin` on manager_pin (WHERE manager_pin IS NOT NULL)

---

### 2. product_categories
**Purpose:** Product categorization with hierarchical support

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Category ID |
| name | VARCHAR(100) | NOT NULL | Category name |
| description | TEXT | | Description |
| parent_category_id | UUID | FK to product_categories | Parent category for hierarchy |
| is_active | BOOLEAN | DEFAULT true | Active status |
| display_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

---

### 3. products
**Purpose:** Product master data with pricing and inventory tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Product ID |
| sku | VARCHAR(50) | UNIQUE NOT NULL | Stock keeping unit |
| name | VARCHAR(255) | NOT NULL | Product name |
| description | TEXT | | Product description |
| category_id | UUID | FK to product_categories | Category |
| regular_price | DECIMAL(12,2) | NOT NULL, >= 0 | Regular price |
| vip_price | DECIMAL(12,2) | >= 0 | VIP member price |
| unit_of_measure | VARCHAR(50) | DEFAULT 'piece' | Unit of measure |
| current_stock | DECIMAL(12,3) | DEFAULT 0, >= 0 | Current stock level |
| reorder_point | DECIMAL(12,3) | DEFAULT 0 | Reorder threshold |
| is_active | BOOLEAN | DEFAULT true | Active status |
| is_featured | BOOLEAN | DEFAULT false | Featured product |
| image_url | TEXT | | Product image URL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Key Indexes:**
- `idx_products_sku` on sku
- `idx_products_name` on name
- `idx_products_category` on category_id
- `idx_products_active` on is_active
- `idx_products_stock_level` on current_stock

---

### 4. product_addons
**Purpose:** Optional add-ons for products

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Addon ID |
| name | VARCHAR(255) | NOT NULL | Addon name |
| description | TEXT | | Description |
| price | DECIMAL(12,2) | NOT NULL DEFAULT 0, >= 0 | Addon price |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

---

### 5. customers
**Purpose:** Customer information with VIP membership tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Customer ID |
| customer_number | VARCHAR(50) | UNIQUE NOT NULL | Customer number |
| vip_membership_number | VARCHAR(50) | UNIQUE | VIP membership ID |
| full_name | VARCHAR(255) | NOT NULL | Full name |
| email | VARCHAR(255) | | Email address |
| phone | VARCHAR(50) | | Phone number |
| tier | customer_tier | DEFAULT 'regular' | Customer tier |
| birth_date | DATE | | Birthday |
| anniversary_date | DATE | | Anniversary |
| address | TEXT | | Address |
| notes | TEXT | | Notes |
| total_visits | INTEGER | DEFAULT 0 | Total visit count |
| total_spent | DECIMAL(12,2) | DEFAULT 0, >= 0 | Lifetime spending |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

---

### 6. restaurant_tables
**Purpose:** Restaurant table management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Table ID |
| table_number | VARCHAR(20) | UNIQUE NOT NULL | Table number |
| area | VARCHAR(100) | | Table area/section |
| capacity | INTEGER | NOT NULL DEFAULT 4, > 0 | Seating capacity |
| status | table_status | DEFAULT 'available' | Current status |
| current_session_id | UUID | FK to order_sessions | Active session |
| is_active | BOOLEAN | DEFAULT true | Active status |
| notes | TEXT | | Notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

---

### 7. order_sessions (Tab System)
**Purpose:** Tab sessions for tracking multiple orders per table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Session ID |
| session_number | VARCHAR(50) | UNIQUE NOT NULL | Session number (TAB-YYYYMMDD-XXX) |
| table_id | UUID | FK to restaurant_tables | Table |
| customer_id | UUID | FK to customers | Customer |
| subtotal | DECIMAL(12,2) | DEFAULT 0 | Running subtotal |
| discount_amount | DECIMAL(12,2) | DEFAULT 0 | Total discounts |
| tax_amount | DECIMAL(12,2) | DEFAULT 0 | Total tax |
| total_amount | DECIMAL(12,2) | DEFAULT 0 | Running total |
| status | session_status | DEFAULT 'open' | Session status |
| opened_at | TIMESTAMPTZ | DEFAULT NOW() | Opened timestamp |
| closed_at | TIMESTAMPTZ | | Closed timestamp |
| opened_by | UUID | FK to users | Staff who opened |
| closed_by | UUID | FK to users | Staff who closed |
| notes | TEXT | | Notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

---

### 8. orders
**Purpose:** Completed sales transactions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Order ID |
| order_number | VARCHAR(50) | UNIQUE NOT NULL | Order number |
| session_id | UUID | FK to order_sessions | Tab session |
| cashier_id | UUID | FK to users, NOT NULL | Cashier |
| customer_id | UUID | FK to customers | Customer |
| table_id | UUID | FK to restaurant_tables | Table |
| subtotal | DECIMAL(12,2) | NOT NULL DEFAULT 0, >= 0 | Subtotal |
| discount_amount | DECIMAL(12,2) | DEFAULT 0 | Discount |
| tax_amount | DECIMAL(12,2) | DEFAULT 0 | Tax |
| total_amount | DECIMAL(12,2) | NOT NULL DEFAULT 0, >= 0 | Total |
| payment_method | payment_method | | Payment method |
| amount_tendered | DECIMAL(12,2) | | Amount paid |
| change_amount | DECIMAL(12,2) | | Change given |
| status | order_status | DEFAULT 'pending' | Order status |
| applied_event_offer_id | UUID | FK to customer_events | Applied offer |
| order_notes | TEXT | | Order notes |
| void_reason | TEXT | | Void reason |
| voided_at | TIMESTAMPTZ | | Void timestamp |
| voided_by | UUID | FK to users | Staff who voided |
| completed_at | TIMESTAMPTZ | | Completion timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

---

### 9. order_items
**Purpose:** Line items for completed orders

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Item ID |
| order_id | UUID | FK to orders ON DELETE CASCADE | Order |
| product_id | UUID | FK to products | Product |
| package_id | UUID | FK to packages | Package |
| item_name | VARCHAR(255) | NOT NULL | Item name snapshot |
| quantity | DECIMAL(12,3) | NOT NULL DEFAULT 1, > 0 | Quantity |
| unit_price | DECIMAL(12,2) | NOT NULL | Unit price |
| subtotal | DECIMAL(12,2) | NOT NULL | Subtotal |
| discount_amount | DECIMAL(12,2) | DEFAULT 0 | Discount |
| total | DECIMAL(12,2) | NOT NULL | Total |
| is_vip_price | BOOLEAN | DEFAULT false | VIP pricing applied |
| is_complimentary | BOOLEAN | DEFAULT false | Complimentary item |
| notes | TEXT | | Item notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

---

### 10. current_orders
**Purpose:** Active orders being built in POS (not yet completed)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Order ID |
| cashier_id | UUID | FK to users, NOT NULL | Cashier |
| customer_id | UUID | FK to customers | Customer |
| table_id | UUID | FK to restaurant_tables | Table |
| subtotal | DECIMAL(12,2) | DEFAULT 0 | Subtotal |
| discount_amount | DECIMAL(12,2) | DEFAULT 0 | Discount |
| tax_amount | DECIMAL(12,2) | DEFAULT 0 | Tax |
| total_amount | DECIMAL(12,2) | DEFAULT 0 | Total |
| applied_event_offer_id | UUID | FK to customer_events | Applied offer |
| order_notes | TEXT | | Order notes |
| is_on_hold | BOOLEAN | DEFAULT false | On hold status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

---

### 11. current_order_items
**Purpose:** Line items for active POS orders

Similar structure to `order_items` but linked to `current_orders`.

---

### 12. kitchen_orders
**Purpose:** Kitchen and bar order queue for preparation tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Kitchen order ID |
| order_id | UUID | FK to orders | Order |
| order_item_id | UUID | FK to order_items | Order item |
| destination | order_destination | NOT NULL | Kitchen/Bar routing |
| item_name | VARCHAR(255) | NOT NULL | Item name |
| quantity | DECIMAL(12,3) | NOT NULL | Quantity |
| special_instructions | TEXT | | Special instructions |
| status | kitchen_order_status | DEFAULT 'pending' | Preparation status |
| assigned_to | UUID | FK to users | Assigned staff |
| priority | INTEGER | DEFAULT 0 | Priority level |
| started_at | TIMESTAMPTZ | | Started timestamp |
| completed_at | TIMESTAMPTZ | | Completed timestamp |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

---

### 13. notifications
**Purpose:** Real-time notifications for orders, inventory, and kitchen operations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Notification ID |
| type | notification_type | NOT NULL | Notification type |
| title | VARCHAR(255) | NOT NULL | Title |
| message | TEXT | NOT NULL | Message content |
| priority | notification_priority | DEFAULT 'normal' | Priority level |
| reference_id | UUID | | Related record ID |
| reference_table | VARCHAR(100) | | Related table name |
| user_id | UUID | FK to users | Target user |
| role | user_role | | Target role |
| is_read | BOOLEAN | DEFAULT false | Read status |
| read_at | TIMESTAMPTZ | | Read timestamp |
| data | JSONB | | Additional data |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| expires_at | TIMESTAMPTZ | | Expiration timestamp |

---

### 14. inventory_movements
**Purpose:** Complete audit trail of all inventory changes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Movement ID |
| product_id | UUID | FK to products | Product |
| movement_type | adjustment_type | NOT NULL | Type of movement |
| quantity | DECIMAL(12,3) | NOT NULL | Quantity changed |
| reason | adjustment_reason | | Reason for adjustment |
| reference_id | UUID | | Reference ID |
| reference_type | VARCHAR(50) | | Reference type |
| order_id | UUID | FK to orders | Related order |
| performed_by | UUID | FK to users | Staff who performed |
| notes | TEXT | | Notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

---

### Additional Tables

15. **order_item_addons** - Addons for completed order items
16. **current_order_item_addons** - Addons for active POS order items
17. **product_addon_associations** - Product-addon relationships
18. **packages** - Product bundles and promotional packages
19. **package_items** - Products included in packages
20. **customer_events** - Customer special events and offers
21. **split_payments** - Multiple payment methods for orders
22. **discounts** - Applied discounts with authorization
23. **suppliers** - Supplier/vendor information
24. **product_suppliers** - Product-supplier relationships
25. **purchase_orders** - Purchase orders for procurement
26. **purchase_order_items** - PO line items
27. **happy_hour_pricing** - Time-based promotional pricing
28. **happy_hour_products** - Products in happy hour
29. **price_history** - Audit trail of price changes
30. **audit_logs** - System-wide audit trail
31. **system_settings** - Application configuration

## Key Functions

### 1. calculate_current_order_totals(order_id UUID)
Calculates and updates totals for active POS orders.

### 2. update_session_totals()
Trigger function to update order session totals when orders are added/modified.

### 3. generate_session_number()
Generates unique session numbers in format `TAB-YYYYMMDD-XXX`.

### 4. notify_new_order()
Creates notifications when new orders are placed.

### 5. notify_kitchen_order_ready()
Creates notifications when kitchen/bar orders are ready.

### 6. notify_low_stock()
Creates inventory notifications when stock is low.

### 7. create_inventory_notification(...)
Creates inventory-related notifications with appropriate priority.

### 8. create_order_notification(...)
Creates order-related notifications.

### 9. handle_auth_user_created()
Trigger to sync Supabase Auth users to public.users table.

### 10. get_current_user_role()
Returns the role of the currently authenticated user.

### 11. get_active_session_for_table(p_table_id UUID)
Gets active tab session for a specific table.

### 12. mark_all_notifications_read(p_user_id UUID)
Marks all notifications as read for a user.

### 13. cleanup_old_notifications()
Deletes old read notifications (>30 days).

### 14. delete_expired_notifications()
Deletes expired notifications.

### 15. set_session_number()
Trigger to auto-generate session numbers.

### 16. update_updated_at_column()
Trigger to automatically update updated_at timestamps.

### 17. trigger_set_updated_at()
Alternative trigger for updating timestamps.

## Key Triggers

1. **trigger_current_order_items_totals** - Auto-calculate order totals
2. **trigger_current_orders_updated_at** - Update timestamps
3. **trigger_update_session_totals** - Update session totals
4. **trigger_notify_new_order** - Create new order notifications
5. **trigger_notify_kitchen_order_ready** - Create ready notifications
6. **trigger_notify_low_stock** - Create stock notifications
7. **trigger_set_session_number** - Auto-generate session numbers
8. **update_*_updated_at** - Update timestamps on various tables

## Row Level Security (RLS) Policies

### Users Table
- Admins can manage all users
- Admins and Managers can view all users
- Users can view their own data

### Products Table
- Authenticated users can view products
- Managers can manage products

### Customers Table
- Authenticated users can view customers
- Staff can manage customers

### Orders Table
- Staff can view all orders
- Cashiers can create orders
- Cashiers can update their own orders

### Current Orders Table
- Cashiers can view their own current orders
- Cashiers can create/update/delete their own current orders
- Admins and managers can manage all current orders

### Notifications Table
- Users can view their own or role-based notifications
- Users can update their own notifications
- Service role can insert notifications

### Order Sessions Table
- Authenticated users can view sessions
- Staff (cashier/manager/admin) can create/update sessions

## Migration History

The system has been built through 21 migrations:

1. `create_current_orders_table`
2. `create_current_order_items_table`
3. `create_current_order_item_addons_table`
4. `create_current_orders_triggers`
5. `enable_realtime_kitchen_orders`
6. `add_tab_system_step1_enums`
7. `add_tab_system_step2_tables`
8. `init_beerhive_schema_v2`
9. `add_cross_table_foreign_keys`
10. `auth_managed_passwords_and_provisioning`
11. `provision_trigger_use_role_from_metadata`
12. `allow_server_side_inserts_into_public_users`
13. `cleanup_temp_policy`
14. `add_roles_array_to_users`
15. `fix_circular_fk_orders_tables`
16. `fix_users_rls_infinite_recursion`
17. `create_notifications_table`
18. `notifications_rls_and_helpers`
19. `notifications_triggers`
20. `add_waiter_role`
21. `add_manager_pin_column`

## Replication Instructions

To replicate this database structure on production:

1. **Backup Current Database** (if applicable)
   ```bash
   pg_dump -U postgres -d database_name > backup.sql
   ```

2. **Create SQL Migration Script**
   Use the provided `PRODUCTION_SCHEMA.sql` file or generate using:
   ```bash
   supabase db dump --schema public > production_schema.sql
   ```

3. **Apply to Production**
   ```bash
   psql -U postgres -d production_db < production_schema.sql
   ```

4. **Verify Structure**
   ```sql
   -- Check tables
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   
   -- Check types
   SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace;
   
   -- Check functions
   SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
   ```

5. **Enable RLS**
   ```sql
   ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
   ```

6. **Test Functionality**
   - Test user authentication
   - Test order creation
   - Test inventory movements
   - Test notifications
   - Test RLS policies

## Performance Considerations

- All foreign keys have corresponding indexes
- Frequently queried columns are indexed
- Composite indexes on common query patterns
- Partial indexes for conditional queries
- JSONB indexes for data column where needed

## Security Features

- Row Level Security (RLS) enabled on all sensitive tables
- Manager PIN authorization for sensitive operations
- Audit logging for compliance
- Password hashing via Supabase Auth
- Role-based access control (RBAC)

## Realtime Features

The following tables have realtime enabled:
- `kitchen_orders` - For kitchen display system
- `notifications` - For real-time alerts
- `orders` - For order monitoring
- `restaurant_tables` - For table status updates

## Backup and Recovery

Recommended backup schedule:
- **Daily:** Full database backup
- **Hourly:** Transaction log backup
- **Weekly:** Long-term archival backup

## Contact & Support

For questions about the database structure or replication issues, refer to the documentation in the `/docs` folder or contact the development team.

---

**Document End**
