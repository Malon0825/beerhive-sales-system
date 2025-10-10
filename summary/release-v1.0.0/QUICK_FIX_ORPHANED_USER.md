# 🔧 Quick Fix: Orphaned User Issue

**Problem**: User exists in auth.users but not in users table → Login fails  
**Solution**: Run cleanup script

---

## Immediate Fix (3 Steps)

### Step 1: Find the Email/Username

What username or email did you try to create?

Example: `newcashier` or `cashier@example.com`

### Step 2: Run Cleanup (Dry-Run)

```bash
cd d:\Projects\beerhive-sales-system

# Replace with actual email
node scripts/cleanup-orphaned-users.js --email=cashier@example.com
```

**Check Output**: Should show the orphaned user

### Step 3: Execute Cleanup

```bash
# Replace with actual email
node scripts/cleanup-orphaned-users.js --email=cashier@example.com --execute
```

**Expected**: `✅ Deleted from auth.users`

---

## Create User Again

1. Go to `/settings/users`
2. Click "Add User"
3. Enter same username/email
4. ✅ Should work now!

---

## Alternative: Clean ALL Orphans

If you don't remember the specific user:

```bash
# Preview all orphaned users
node scripts/cleanup-orphaned-users.js

# Clean all
node scripts/cleanup-orphaned-users.js --execute
```

---

## What Was Fixed

✅ **Pre-validation** - Check duplicates BEFORE creating auth user  
✅ **Better errors** - Shows which field is duplicate  
✅ **No more orphans** - Won't happen with new code  

---

## Need Help?

**See full guide**: `USER_CREATION_FIX_GUIDE.md`

**Manual cleanup**: Supabase Dashboard → Authentication → Users → Delete user

---

**TL;DR**: Run `node scripts/cleanup-orphaned-users.js --email=YOUR_EMAIL --execute`
