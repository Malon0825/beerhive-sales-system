# RLS Policies Quick Reference Guide

**For Developers**: Quick lookup for table access permissions by role

---

## Role Hierarchy

```
Admin (highest privileges)
  └── Manager
      └── Cashier
      └── Kitchen
      └── Bartender
```

---

## Access Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Full Access (Read/Write/Delete) |
| 📖 | Read Only |
| ✏️ | Read + Create |
| 🔒 | No Access |
| 👤 | Own Records Only |

---

## Quick Access Matrix

### Core POS Tables

| Table | Cashier | Kitchen | Bartender | Manager | Admin |
|-------|---------|---------|-----------|---------|-------|
| **users** | 👤 | 👤 | 👤 | 📖 | ✅ |
| **customers** | ✏️ | 📖 | 📖 | ✏️ | ✅ |
| **products** | 📖 | 📖 | 📖 | ✅ | ✅ |
| **product_categories** | 📖 | 📖 | 📖 | ✅ | ✅ |
| **product_addons** | 📖 | 📖 | 📖 | ✅ | ✅ |
| **packages** | 📖 | 📖 | 📖 | ✅ | ✅ |

### Order Management

| Table | Cashier | Kitchen | Bartender | Manager | Admin |
|-------|---------|---------|-----------|---------|-------|
| **orders** | ✏️ | 📖 | 📖 | ✅ | ✅ |
| **order_items** | ✏️ | 📖 | 📖 | ✅ | ✅ |
| **order_item_addons** | ✏️ | 📖 | 📖 | ✅ | ✅ |
| **kitchen_orders** | 📖 | ✏️ | ✏️ | ✅ | ✅ |
| **split_payments** | ✏️ | 🔒 | 🔒 | ✅ | ✅ |
| **discounts** | ✏️ | 🔒 | 🔒 | ✅ | ✅ |

### Table Management

| Table | Cashier | Kitchen | Bartender | Manager | Admin |
|-------|---------|---------|-----------|---------|-------|
| **restaurant_tables** | ✏️ | 📖 | 📖 | ✅ | ✅ |

### Pricing & Promotions

| Table | Cashier | Kitchen | Bartender | Manager | Admin |
|-------|---------|---------|-----------|---------|-------|
| **happy_hour_pricing** | 📖 | 📖 | 📖 | ✅ | ✅ |
| **happy_hour_products** | 📖 | 📖 | 📖 | ✅ | ✅ |
| **customer_events** | 📖 | 📖 | 📖 | ✏️ | ✅ |
| **price_history** | 📖 | 📖 | 📖 | ✅ | ✅ |

### Inventory Management

| Table | Cashier | Kitchen | Bartender | Manager | Admin |
|-------|---------|---------|-----------|---------|-------|
| **suppliers** | 📖 | 📖 | 📖 | ✅ | ✅ |
| **product_suppliers** | 📖 | 📖 | 📖 | ✅ | ✅ |
| **purchase_orders** | 📖 | 📖 | 📖 | ✅ | ✅ |
| **purchase_order_items** | 📖 | 📖 | 📖 | ✅ | ✅ |
| **inventory_movements** | 📖 | 📖 | 📖 | ✏️ | ✅ |

### System & Audit

| Table | Cashier | Kitchen | Bartender | Manager | Admin |
|-------|---------|---------|-----------|---------|-------|
| **audit_logs** | 🔒 | 🔒 | 🔒 | 🔒 | ✅ |
| **system_settings** | 📖* | 📖* | 📖* | 📖* | ✅ |

_*Only public settings visible to non-admins_

---

## Common Use Cases

### 1. Creating an Order (Cashier)
```typescript
// ✅ Allowed
- Read products (get pricing)
- Read customers (search customer)
- Read happy_hour_pricing (check active promotions)
- Create order
- Create order_items
- Create order_item_addons
- Create split_payments
- Update restaurant_tables (assign table)

// ❌ Not Allowed
- Modify product prices
- Delete orders
- View audit logs
```

### 2. Managing Kitchen Orders (Kitchen/Bartender)
```typescript
// ✅ Allowed
- Read kitchen_orders (view pending orders)
- Update kitchen_orders (change status: pending → preparing → ready → served)
- Read order_items (see what to prepare)
- Read products (check ingredients/details)

// ❌ Not Allowed
- Create new orders
- Delete kitchen orders
- Modify order items
- Access financial data
```

### 3. Managing Products (Manager)
```typescript
// ✅ Allowed
- Full access to products, categories, addons
- Create/update happy_hour_pricing
- Create/update packages
- Create purchase_orders
- Create inventory_movements
- View all orders and reports

// ❌ Not Allowed
- View audit logs (admin only)
- Modify audit logs
- Manage system settings
```

### 4. System Administration (Admin)
```typescript
// ✅ Allowed
- FULL ACCESS to all tables
- View/manage audit_logs
- Manage system_settings
- Manage user accounts
- Override any restriction

// ⚠️ Responsibilities
- Protect admin credentials
- Review audit logs regularly
- Monitor system settings changes
```

---

## Policy Implementation Details

### Security Helper Functions

**⚠️ IMPORTANT**: To prevent infinite recursion in RLS policies, we use security definer functions for role checks:

```sql
-- Check if current user is admin
public.is_admin() RETURNS boolean

-- Check if current user is manager or admin
public.is_manager_or_admin() RETURNS boolean

-- Check if current user is active staff
public.is_active_staff() RETURNS boolean

-- Get current user's role
public.current_user_role() RETURNS user_role
```

These functions use `SECURITY DEFINER` to bypass RLS and prevent circular dependencies.

### Standard Patterns Used

#### 1. All Authenticated Read Access
```sql
CREATE POLICY "Authenticated users can view [table]" 
ON [table] FOR SELECT 
USING (auth.role() = 'authenticated');
```

**Used on**: products, product_categories, happy_hour_pricing, etc.

#### 2. Staff Create Access (UPDATED - Using Helper Function)
```sql
CREATE POLICY "Staff can create [records]" 
ON [table] FOR INSERT 
WITH CHECK (public.is_active_staff());
```

**Used on**: orders, order_items, customers, etc.

**⚠️ Old Pattern (Causes Recursion)**:
```sql
-- ❌ DON'T USE THIS - Causes infinite recursion on users table
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid()::uuid 
        AND is_active = true
    )
)
```

#### 3. Manager/Admin Management (UPDATED - Using Helper Function)
```sql
CREATE POLICY "Managers can manage [table]" 
ON [table] FOR ALL 
USING (public.is_manager_or_admin());
```

**Used on**: products, categories, suppliers, etc.

#### 4. Admin Only Access (UPDATED - Using Helper Function)
```sql
CREATE POLICY "Admins can manage [table]" 
ON [table] FOR ALL 
USING (public.is_admin());
```

**Used on**: audit_logs, system_settings, users table

---

## Testing RLS Policies

### Test User Setup

```sql
-- Create test users for each role
INSERT INTO users (username, email, password_hash, full_name, role, is_active)
VALUES
  ('cashier1', 'cashier@test.com', '$2a$10$...', 'Test Cashier', 'cashier', true),
  ('kitchen1', 'kitchen@test.com', '$2a$10$...', 'Test Kitchen', 'kitchen', true),
  ('manager1', 'manager@test.com', '$2a$10$...', 'Test Manager', 'manager', true),
  ('admin1', 'admin@test.com', '$2a$10$...', 'Test Admin', 'admin', true);
```

### Manual Policy Test

```sql
-- Test as specific user
SET SESSION AUTHORIZATION 'authenticated';
SET request.jwt.claim.sub = '[user-uuid]';

-- Try operations
SELECT * FROM products; -- Should work for all roles
INSERT INTO products (...); -- Should fail for cashier
UPDATE audit_logs ...; -- Should fail for non-admins
```

### API Integration Test

```typescript
// Test with Supabase client
const { data, error } = await supabase
  .from('products')
  .select('*')
  
// Should succeed for authenticated users
// Should respect RLS based on current user's role
```

---

## Troubleshooting

### Common RLS Errors

#### Error: "new row violates row-level security policy"
```
Cause: User trying to INSERT/UPDATE with insufficient permissions
Solution: Check user role and policy WITH CHECK clause
```

#### Error: "permission denied for table [table_name]"
```
Cause: RLS enabled but user has no matching policy
Solution: Verify user is authenticated and active
```

#### Error: No rows returned (but data exists)
```
Cause: RLS filtering out rows user shouldn't see
Solution: Check USING clause in SELECT policy
```

#### Error: "infinite recursion detected in policy for relation 'users'" ⚠️
```
Cause: RLS policy queries the same table it's protecting, creating circular dependency
Solution: Use security definer helper functions (public.is_admin(), etc.)
          instead of direct EXISTS subqueries on the same table

Example Fix:
❌ USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
✅ USING (public.is_admin())

See: summary/RLS_INFINITE_RECURSION_FIX.md for complete solution
```

### Debug Queries

```sql
-- Check current user's role
SELECT role, is_active FROM users WHERE id = auth.uid()::uuid;

-- Check policies on a table
SELECT * FROM pg_policies WHERE tablename = 'products';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'products';
```

---

## Best Practices for Developers

### 1. Always Handle Permission Errors
```typescript
try {
  const { data, error } = await supabase.from('products').insert(newProduct);
  if (error) {
    if (error.code === '42501') {
      // Permission denied - show friendly message
      toast.error('You do not have permission to create products');
    }
  }
} catch (err) {
  // Handle error
}
```

### 2. Use Service Role Sparingly
```typescript
// ❌ BAD - Don't use service role for user actions
const { data } = await supabaseAdmin.from('orders').insert(order);

// ✅ GOOD - Use user's session (respects RLS)
const { data } = await supabase.from('orders').insert(order);
```

### 3. Validate Roles on Frontend
```typescript
const { hasRole } = useAuth();

// Hide UI elements user can't use
{hasRole(['admin', 'manager']) && (
  <Button onClick={deleteProduct}>Delete</Button>
)}
```

### 4. Test with Different Roles
- Always test API endpoints with cashier, manager, and admin roles
- Verify error messages are user-friendly
- Ensure UI adapts to user's permissions

---

## Related Documentation

- [RLS Policies Implementation Summary](../summary/RLS_POLICIES_IMPLEMENTATION.md)
- [Security Advisories Resolution](../summary/SECURITY_ADVISORIES_RESOLUTION.md)
- [Database Structure](./Database%20Structure.sql)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated**: 2025-10-05  
**Maintained By**: Development Team  
**Version**: 1.0
