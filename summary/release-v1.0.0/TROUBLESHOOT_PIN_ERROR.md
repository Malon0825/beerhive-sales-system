# Troubleshooting 403 Forbidden Error on Order Void

## Error
```
POST http://localhost:3000/api/orders/.../void 403 (Forbidden)
```

## Cause
The API is rejecting the PIN authorization. Most likely:
1. ❌ Migration not run yet (manager_pin column doesn't exist)
2. ❌ PIN not set for manager/admin users
3. ❌ Wrong PIN entered

## Quick Fix - Step by Step

### Step 1: Run the Migration in Supabase

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste this SQL:

```sql
-- Add manager_pin column
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_pin VARCHAR(6);

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_manager_pin ON users(manager_pin) 
WHERE manager_pin IS NOT NULL;

-- Set default PINs for manager/admin users
UPDATE users 
SET manager_pin = '123456' 
WHERE role IN ('manager', 'admin') AND manager_pin IS NULL;
```

5. Click **Run** or press F5
6. Wait for "Success" message

### Step 2: Verify PIN is Set

Run this query to check:
```sql
SELECT username, role, manager_pin, is_active 
FROM users 
WHERE role IN ('manager', 'admin');
```

Expected result:
```
username | role    | manager_pin | is_active
---------|---------|-------------|----------
admin    | admin   | 123456      | true
manager  | manager | 123456      | true
```

### Step 3: Test the Return Feature Again

1. Go back to Order Board
2. Click "Return Order" on a completed order
3. Enter PIN: **123456**
4. Select return reason
5. Click "Void Order"
6. Should work now! ✅

## Still Getting 403 Error?

### Check 1: Verify Column Exists
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'manager_pin';
```

Should return:
```
column_name  | data_type
-------------|----------
manager_pin  | character varying
```

### Check 2: Check User is Active
```sql
SELECT username, role, manager_pin, is_active 
FROM users 
WHERE username IN ('manager', 'admin');
```

Both should have `is_active = true`

### Check 3: Check Browser Console

Open browser Developer Tools (F12), go to Console tab, look for error details:
```javascript
// Should show detailed error message
{
  "success": false,
  "error": "Invalid manager PIN or insufficient permissions. Only active managers or admins can void orders."
}
```

### Check 4: Check Server Logs

Look at your terminal where `npm run dev` is running. Should see:
```
✅ Order void authorized by: Store Manager (manager) - Role: manager
```

If you see error instead, check what it says.

## Manual PIN Setup (If Migration Failed)

If the migration didn't work, set PINs manually:

```sql
-- For manager user
UPDATE users 
SET manager_pin = '123456' 
WHERE username = 'manager';

-- For admin user
UPDATE users 
SET manager_pin = '123456' 
WHERE username = 'admin';

-- Verify it worked
SELECT username, role, manager_pin FROM users WHERE manager_pin IS NOT NULL;
```

## Create Manager User if None Exists

If you don't have a manager user yet:

```sql
-- Check if manager exists
SELECT username, role FROM users WHERE role IN ('manager', 'admin');
```

If no results, create a manager using PowerShell:

```powershell
$body = @{
    username = "manager"
    email = "manager@beerhive.com"
    password = "Manager123!"
    full_name = "Store Manager"
    role = "manager"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $body -ContentType "application/json"
```

Then set their PIN:
```sql
UPDATE users SET manager_pin = '123456' WHERE username = 'manager';
```

## Common Mistakes

### ❌ Using Wrong PIN
- Default PIN is: `123456` (six digits)
- NOT the login password (`Manager123!`)
- Case sensitive (if you change it)

### ❌ Column Doesn't Exist Yet
Run the migration first! The `manager_pin` column must exist.

### ❌ User Not Active
```sql
UPDATE users SET is_active = true WHERE username = 'manager';
```

### ❌ Wrong Role
```sql
-- Verify user has manager or admin role
SELECT username, role FROM users WHERE username = 'manager';
-- Should show role = 'manager' or 'admin'
```

## Test API Directly (Advanced)

Test the API with curl/PowerShell to isolate the issue:

```powershell
$body = @{
    managerPin = "123456"
    reason = "Test return"
    isReturn = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/orders/YOUR_ORDER_ID/void" -Method POST -Body $body -ContentType "application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Order returned successfully",
  "data": { ... }
}
```

If you get 403:
```json
{
  "success": false,
  "error": "Invalid manager PIN or insufficient permissions. Only active managers or admins can void orders."
}
```

## Final Checklist

- [ ] Migration SQL executed in Supabase
- [ ] `manager_pin` column exists in `users` table
- [ ] Manager/Admin users have PIN set to `123456`
- [ ] Manager/Admin users are active (`is_active = true`)
- [ ] Using correct PIN: `123456` (not password)
- [ ] Server is running (`npm run dev`)
- [ ] Browser cache cleared (Ctrl+Shift+R)

## Quick Test Query

Run this all-in-one check:

```sql
-- This will tell you exactly what's wrong
SELECT 
  username,
  role,
  CASE 
    WHEN manager_pin IS NULL THEN '❌ NO PIN SET'
    WHEN manager_pin = '123456' THEN '✅ PIN OK (123456)'
    ELSE '⚠️ PIN: ' || manager_pin
  END as pin_status,
  CASE 
    WHEN is_active = true THEN '✅ Active'
    ELSE '❌ Inactive'
  END as active_status,
  CASE 
    WHEN role IN ('manager', 'admin') THEN '✅ Has Permission'
    ELSE '❌ No Permission'
  END as permission_status
FROM users
WHERE username IN ('manager', 'admin');
```

Expected output:
```
username | role    | pin_status        | active_status | permission_status
---------|---------|-------------------|---------------|------------------
admin    | admin   | ✅ PIN OK (123456) | ✅ Active     | ✅ Has Permission
manager  | manager | ✅ PIN OK (123456) | ✅ Active     | ✅ Has Permission
```

If any column shows ❌, that's your problem!

## Still Stuck?

1. Check the server console (terminal running npm run dev)
2. Check browser console (F12 → Console tab)
3. Verify order exists and is completed status
4. Try restarting the dev server: `npm run dev`
