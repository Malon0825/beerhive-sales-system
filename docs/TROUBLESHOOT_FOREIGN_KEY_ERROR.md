# Troubleshooting: Foreign Key Constraint Error

## Error Message
```
insert or update on table "orders" violates foreign key constraint "orders_cashier_id_fkey"
```

---

## 🔍 Problem Analysis

### What This Error Means

The error occurs when you try to **insert** or **update** an order with a `cashier_id` that **doesn't exist** in the `users` table.

**Example:**
```sql
-- This fails if '123e4567-...' doesn't exist in users table
INSERT INTO orders (cashier_id, ...) 
VALUES ('123e4567-e89b-12d3-a456-426614174000', ...);
```

### Why This Happens in Development

Your **production environment** has cashier users, but your **development database** might only have:
- ✅ Admin user
- ❌ No cashier users

When the POS system tries to create orders, it uses a `cashier_id` from the logged-in user, which doesn't exist → **Foreign key violation!**

---

## ✅ Solutions

### Solution 1: Create Test Cashier Users (Recommended)

#### Option A: Using Node.js Script (Best)

```bash
# Run the automated script
node scripts/create-dev-cashier.js
```

This creates 3 test cashier users:
- **Email:** `cashier01@beerhive.local`
- **Email:** `cashier02@beerhive.local`
- **Email:** `cashier03@beerhive.local`
- **Password:** `cashier123` (all users)

#### Option B: Using SQL Script

```bash
# Run in Supabase SQL Editor
# File: scripts/create-test-cashier.sql
```

Or manually:

```sql
-- Create a test cashier user
INSERT INTO users (
    username,
    email,
    role,
    full_name,
    is_active,
    created_at,
    updated_at
)
VALUES
    ('cashier_test', 'cashier.test@beerhive.com', 'cashier', 'Test Cashier', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
```

#### Option C: Via Supabase Dashboard

1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Fill in:
   - **Email:** `cashier01@beerhive.local`
   - **Password:** `cashier123`
   - **Auto Confirm:** Yes
4. After user is created, update their role:

```sql
UPDATE users 
SET role = 'cashier', 
    username = 'cashier01',
    full_name = 'Test Cashier'
WHERE email = 'cashier01@beerhive.local';
```

---

### Solution 2: Fix Existing Orphaned Orders

If you have orders with invalid `cashier_id`, run:

```bash
# File: scripts/fix-foreign-key-constraints.sql
```

Or manually:

```sql
-- Option A: Set invalid cashier_ids to NULL
UPDATE orders
SET cashier_id = NULL
WHERE cashier_id NOT IN (SELECT id FROM users);

-- Option B: Reassign to admin user
DO $$
DECLARE
    admin_id uuid;
BEGIN
    SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
    
    UPDATE orders
    SET cashier_id = admin_id
    WHERE cashier_id NOT IN (SELECT id FROM users);
END $$;
```

---

### Solution 3: Use Admin as Cashier (Temporary)

For quick testing, use the admin user:

```typescript
// In your frontend code, use admin ID for testing
const userId = adminUser.id; // Admin can create orders too
```

The admin user can already create orders since admins have all permissions.

---

## 🔧 Verification

### 1. Check Active Cashiers

```sql
SELECT 
    id,
    username,
    email,
    role,
    is_active
FROM users
WHERE role = 'cashier'
AND is_active = true;
```

**Expected:** At least 1 cashier user

### 2. Check for Orphaned Orders

```sql
SELECT 
    o.id,
    o.order_number,
    o.cashier_id,
    u.username
FROM orders o
LEFT JOIN users u ON u.id = o.cashier_id
WHERE o.cashier_id IS NOT NULL
AND u.id IS NULL;
```

**Expected:** 0 rows (no orphaned orders)

### 3. Test Creating an Order

```sql
-- Get a valid cashier_id first
SELECT id FROM users WHERE role = 'cashier' LIMIT 1;

-- Try creating an order (replace with your cashier_id)
INSERT INTO orders (cashier_id, order_number, status, total_amount)
VALUES ('YOUR-CASHIER-UUID', 'TEST-001', 'pending', 100.00);

-- Clean up
DELETE FROM orders WHERE order_number = 'TEST-001';
```

**Expected:** No error

---

## 🎯 Prevention

### For Development

Add this to your dev setup script:

```json
// package.json
{
  "scripts": {
    "db:setup": "node scripts/create-dev-cashier.js",
    "db:fix": "psql -f scripts/fix-foreign-key-constraints.sql"
  }
}
```

### For New Developers

Update your `README.md` or `SETUP.md`:

```markdown
## Setup Database

After pulling the code:

1. Run migrations
2. **Create test users:** `npm run db:setup`
3. Start dev server: `npm run dev`
```

### Database Seed File

Create `scripts/seed-dev-users.sql`:

```sql
-- Seed development users
INSERT INTO users (username, email, role, full_name, is_active)
VALUES
    ('admin', 'admin@beerhive.local', 'admin', 'Admin User', true),
    ('cashier01', 'cashier01@beerhive.local', 'cashier', 'Cashier 01', true),
    ('manager01', 'manager01@beerhive.local', 'manager', 'Manager 01', true)
ON CONFLICT (email) DO UPDATE
SET role = EXCLUDED.role, is_active = true;
```

---

## 🐛 Debug Commands

### Check Foreign Key Constraint

```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_name = 'orders_cashier_id_fkey';
```

### Check What's Causing the Error

Look at your application logs:

```bash
# Check API logs
# Look for the cashier_id being used
grep "cashier_id" logs/api.log

# Or check browser console
# Look for the user ID being sent in requests
```

---

## 📊 Common Scenarios

### Scenario 1: Fresh Database

**Problem:** Just ran migrations, no users exist  
**Solution:** Run `node scripts/create-dev-cashier.js`

### Scenario 2: Copied from Production

**Problem:** Copied production DB, but user IDs don't match  
**Solution:** Run `scripts/fix-foreign-key-constraints.sql`

### Scenario 3: Testing with Hardcoded UUIDs

**Problem:** Frontend uses hardcoded test UUIDs  
**Solution:** Update test data to use real UUIDs from database

```typescript
// ❌ Bad - Hardcoded
const cashierId = '123e4567-...';

// ✅ Good - From auth
const { data: { user } } = await supabase.auth.getUser();
const cashierId = user.id;
```

---

## 🎓 Understanding the Constraint

### What is orders_cashier_id_fkey?

It's a **foreign key constraint** that ensures:
- Every `cashier_id` in `orders` table **must exist** in `users` table
- Prevents orphaned references
- Maintains data integrity

### Constraint Rules

```sql
FOREIGN KEY (cashier_id) 
REFERENCES users(id) 
ON DELETE SET NULL
```

**Meaning:**
- ✅ Can insert order if cashier exists
- ❌ Cannot insert order if cashier doesn't exist
- ⚠️ If cashier is deleted, order's cashier_id → NULL

---

## ✅ Quick Fix Checklist

- [ ] Verify cashier users exist
- [ ] Create test cashier if needed
- [ ] Fix orphaned orders (if any)
- [ ] Test creating an order
- [ ] Update dev setup docs
- [ ] Add to onboarding script

---

## 📞 Still Having Issues?

### Check These

1. **Are you logged in as a cashier?**
   ```sql
   SELECT role FROM users WHERE id = 'YOUR-USER-ID';
   ```

2. **Is the user active?**
   ```sql
   SELECT is_active FROM users WHERE id = 'YOUR-USER-ID';
   ```

3. **Is RLS blocking you?**
   ```sql
   -- Temporarily disable RLS for testing
   ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
   -- Try your operation
   -- Re-enable after
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   ```

### Get Help

- **Documentation:** `docs/DATABASE_SETUP_COMPLETE.md`
- **Scripts:** `scripts/fix-foreign-key-constraints.sql`
- **Create Users:** `scripts/create-dev-cashier.js`

---

**Last Updated:** October 7, 2025  
**Status:** ✅ Complete Solution Guide  
**Related Error:** `orders_cashier_id_fkey violation`
