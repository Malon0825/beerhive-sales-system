# Setup Manager PIN for Order Returns

## Quick Answer
**Default Manager PIN**: `123456`

After running the migration, use PIN **123456** for both Manager and Admin users.

### 🔑 Important: PIN Authorization Works for ANY Manager/Admin

**Any manager or admin can authorize a void/return**, regardless of who is currently logged in:
- Cashier logged in → Can use ANY manager's PIN to process return
- Kitchen staff logged in → Can use ANY admin's PIN to void order
- Manager A logged in → Can use Manager B's PIN to authorize

The system validates the PIN against ALL manager/admin users, not just the logged-in user.

## Setup Steps

### Step 1: Run the Migration
Execute the SQL migration in your Supabase SQL Editor:

```sql
-- Add PIN column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_pin VARCHAR(6);

-- Create index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_users_manager_pin ON users(manager_pin) 
WHERE manager_pin IS NOT NULL;

-- Set default PINs for existing manager/admin users
UPDATE users 
SET manager_pin = '123456' 
WHERE role IN ('manager', 'admin') AND manager_pin IS NULL;
```

Or run the migration file:
```bash
# Copy the SQL from migrations/add_manager_pin.sql
# Paste into Supabase SQL Editor
# Click Run
```

### Step 2: Verify PIN is Set
Check that the PIN was added:

```sql
SELECT username, full_name, role, manager_pin 
FROM users 
WHERE role IN ('manager', 'admin');
```

Expected output:
```
username | full_name              | role    | manager_pin
---------|------------------------|---------|------------
admin    | System Administrator   | admin   | 123456
manager  | Store Manager          | manager | 123456
```

### Step 3: Test the Return Feature

**Scenario 1: Cashier needs manager approval**
1. Login as Cashier (`cashier` / `Cashier123!`)
2. Navigate to Order Board
3. Find a completed order
4. Click "Return Order" button
5. Enter Manager PIN: **123456** (any manager/admin PIN works)
6. Select return reason
7. Click "Void Order"
8. ✅ Return processed using manager's authorization

**Scenario 2: Manager authorizes their own action**
1. Login as Manager (`manager` / `Manager123!`)
2. Navigate to Order Board
3. Click "Return Order" on completed order
4. Enter their own PIN: **123456**
5. Process return
6. ✅ Return processed

**Scenario 3: Admin can authorize anywhere**
1. Login as any user (cashier, kitchen, waiter)
2. Navigate to Order Board
3. Click "Return Order" on completed order
4. Enter Admin PIN: **123456**
5. Process return
6. ✅ Admin authorization accepted regardless of logged-in user

## User Credentials Reference

| Username | Login Password | Manager PIN | Role |
|----------|---------------|-------------|------|
| `admin` | `Admin123!` | `123456` | Admin |
| `manager` | `Manager123!` | `123456` | Manager |

**Important**: 
- **Login Password** is used to log into the system
- **Manager PIN** is used for quick authorization (returns, voids)

## Security Notes

### Development (Current Setup)
- PIN: `123456` (plain text in database)
- Suitable for testing and development only

### Production Requirements
Before deploying to production:

1. **Change the default PIN**:
```sql
UPDATE users SET manager_pin = 'YOUR_NEW_PIN' WHERE username = 'manager';
UPDATE users SET manager_pin = 'YOUR_NEW_PIN' WHERE username = 'admin';
```

2. **Implement PIN hashing**:
- Hash PINs before storing (use bcrypt)
- Update API to compare hashed PINs
- See `docs/ORDER_RETURN_FEATURE.md` for implementation

3. **Add PIN management features**:
- Allow users to change their PIN
- Implement PIN expiry (e.g., 90 days)
- Enforce strong PIN requirements (no simple patterns)

4. **Add security measures**:
- Rate limiting (max 5 attempts per minute)
- Account lockout after 3 failed attempts
- Log all PIN authentication attempts
- Alert on suspicious activity

## Troubleshooting

### Error: "Invalid manager PIN or insufficient permissions"
**Cause**: PIN doesn't match or user doesn't have manager/admin role

**Solutions**:
1. Verify PIN is set in database:
```sql
SELECT username, role, manager_pin FROM users WHERE username = 'manager';
```

2. Check you're entering the correct PIN: `123456`

3. Verify user has manager or admin role:
```sql
SELECT username, role FROM users WHERE username = 'your_username';
```

### Error: Column 'manager_pin' does not exist
**Cause**: Migration not run yet

**Solution**: Run the migration SQL in Step 1 above

### PIN not working after migration
**Cause**: User might not have PIN set

**Solution**: Set PIN manually:
```sql
UPDATE users SET manager_pin = '123456' WHERE username = 'manager';
```

## Changing PINs

### Change PIN for specific user:
```sql
UPDATE users 
SET manager_pin = 'NEW_PIN' 
WHERE username = 'manager';
```

### Set different PINs for each manager:
```sql
-- Manager 1
UPDATE users SET manager_pin = '111111' WHERE username = 'manager';

-- Admin
UPDATE users SET manager_pin = '999999' WHERE username = 'admin';
```

### Reset all PINs to default:
```sql
UPDATE users 
SET manager_pin = '123456' 
WHERE role IN ('manager', 'admin');
```

## Alternative: Using Full Password

If you don't want to use PINs, you can modify the `ReturnOrderDialog.tsx` to accept the full login password instead:

**Update the dialog label**:
```tsx
// Change from:
<Label>Manager PIN</Label>

// To:
<Label>Manager Password</Label>
```

**Then use login passwords**:
- Manager: `Manager123!`
- Admin: `Admin123!`

**Update API** to verify against `password_hash` with bcrypt comparison.

## Summary

**Quick Setup**:
1. Run migration SQL in Supabase
2. Use PIN: `123456` for testing
3. Change PIN before production deployment

**For Testing**:
- Manager PIN: `123456`
- Admin PIN: `123456`

**For Production**:
- Change default PINs
- Implement PIN hashing
- Add rate limiting
- Add audit logging
