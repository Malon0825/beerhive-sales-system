# Apply Manager PIN Migration

**Error**: `column users.manager_pin does not exist`  
**Solution**: Run the migration to add the column

---

## Quick Fix - Run This SQL

Copy and paste this SQL into your Supabase SQL Editor:

```sql
-- Migration: Add manager PIN field for quick authorization

-- Add PIN column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_pin VARCHAR(6);

-- Create index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_users_manager_pin ON users(manager_pin) 
WHERE manager_pin IS NOT NULL;

-- Set default PINs for existing manager/admin users (CHANGE IN PRODUCTION!)
UPDATE users 
SET manager_pin = '123456' 
WHERE role IN ('manager', 'admin') AND manager_pin IS NULL;

-- Add comment
COMMENT ON COLUMN users.manager_pin IS 'Quick 6-digit PIN for manager authorization (order returns, voids, etc.)';
```

---

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Select your project: `beerhive-sales-system`

### 2. Navigate to SQL Editor
- Click **"SQL Editor"** in the left sidebar
- Click **"New Query"**

### 3. Paste the SQL
- Copy the SQL code above
- Paste it into the editor

### 4. Run the Migration
- Click **"Run"** button (or press Ctrl+Enter)
- ✅ Wait for success message

### 5. Verify the Column Was Added
Run this query to verify:
```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'manager_pin';
```

Expected result:
```
column_name  | data_type        | character_maximum_length
-------------|------------------|-------------------------
manager_pin  | character varying| 6
```

### 6. Test the Feature
- Restart your Next.js dev server: `npm run dev`
- Navigate to Settings > Users
- Edit an admin or manager user
- ✅ Manager PIN field should now work!

---

## Verification

After running the migration, check your existing users:

```sql
SELECT username, full_name, role, manager_pin 
FROM users 
WHERE role IN ('admin', 'manager');
```

Users with admin/manager roles should now have `manager_pin = '123456'` (default).

---

## Security Note

The default PIN `123456` is for **development only**. 

**Before production:**
1. Change all default PINs
2. Implement PIN hashing (bcrypt)
3. Add rate limiting
4. Enable audit logging

See: `SETUP_MANAGER_PIN.md` for security best practices.

---

## Troubleshooting

**Error: "permission denied"**
- Ensure you're using admin privileges in Supabase
- Run as postgres role if needed

**Error: "relation users does not exist"**
- Check your database schema
- Ensure you're connected to the correct database

**Column still not found after migration**
- Restart your Next.js server
- Clear any database connection pools
- Verify migration ran successfully

---

**Status**: Ready to Apply ✅
