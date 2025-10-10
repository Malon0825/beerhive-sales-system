# Fix Login 401 Error - Admin Password Reset

## Problem
You're getting a **401 Unauthorized** error when trying to login with the admin account:
```
POST http://localhost:3000/api/auth/login 401 (Unauthorized)
❌ [AuthContext] Login error: AppError: Invalid username or password
```

## Root Cause
The admin user exists in the database, but either:
1. The password in Supabase Auth doesn't match what you're entering
2. The email is not confirmed
3. The user account needs to be reactivated

## Solution: Reset Admin Password

### **Option 1: Run the Password Reset Script (Recommended)**

Run this command in your terminal:

```powershell
node scripts/reset-admin-password.js
```

This will:
- ✅ Find the admin user
- ✅ Reset password to `Admin123!`
- ✅ Confirm the email address
- ✅ Reactivate the account if disabled
- ✅ Verify roles are configured correctly

### **Option 2: Using PowerShell API Call**

If the script doesn't work, you can manually reset via API:

```powershell
# First, make sure your dev server is running
npm run dev

# Then in another terminal, run:
$body = @{
    userId = "e50986fa-37cb-4bc4-8c5a-bb2e3b6943ee"
} | ConvertTo-Json

# You'll need to be logged in as manager/admin to run this
# If you can't login, use Option 3 instead
```

### **Option 3: Direct Database Update (Advanced)**

If you have access to Supabase Dashboard SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run this SQL:

```sql
-- Get admin user ID first
SELECT id, email FROM users WHERE username = 'admin';

-- Note the ID, then use it below (replace YOUR_ADMIN_ID)
-- This requires you to run it from Supabase Dashboard with service role
```

**Note:** You cannot directly update passwords in SQL. You must use the Supabase Auth Admin API, which is what our script does.

## After Password Reset

### Login Credentials
```
Username: admin
Password: Admin123!
URL: http://localhost:3000/login
```

### Steps to Login
1. Navigate to `http://localhost:3000/login`
2. Enter username: `admin`
3. Enter password: `Admin123!`
4. Click "Sign In"
5. You should be redirected to the dashboard

### **IMPORTANT: Change Your Password**
After successfully logging in:
1. Go to Settings → Profile
2. Change the password to something secure
3. Follow password requirements:
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 number

## Troubleshooting

### Script Error: "Missing required environment variables"
Make sure your `.env.local` file contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Script Error: "Admin user not found"
The admin user doesn't exist. Create it by running:
```powershell
node scripts/create-test-user.js
```

Or use the API to create users (see `CREATE_TEST_USERS.md`).

### Still Getting 401 After Password Reset
1. Clear browser cache and cookies
2. Try in incognito/private mode
3. Check browser console for specific errors
4. Verify Supabase project is running
5. Check server logs for detailed error messages

### Login Works But Redirects to Login Again
This might be a session/cookie issue:
1. Clear all cookies for localhost
2. Make sure `NEXTAUTH_SECRET` is set in `.env.local`
3. Try hard refresh (Ctrl + Shift + R)

## Prevention: Create Test Users Properly

To avoid this issue in the future, always create users via the API (not manual SQL):

```powershell
# Use the provided scripts
node scripts/create-test-user.js

# Or use the PowerShell commands in CREATE_TEST_USERS.md
```

This ensures:
- User is created in both `users` table and `auth.users`
- Password is properly hashed and stored
- Email is confirmed
- Roles are properly configured as arrays
- Account is activated

## Technical Details

### What the Script Does
1. **Finds admin user** in the database
2. **Updates password** using Supabase Auth Admin API
3. **Confirms email** to enable login
4. **Reactivates account** if it was disabled
5. **Fixes roles format** if needed (converts to proper array)

### Authentication Flow
```
Login Form → AuthService.login()
  ↓
POST /api/auth/login
  ↓
Supabase Auth: signInWithPassword(email, password)
  ↓
Check users table: is_active = true
  ↓
Return session + user data
  ↓
Set cookies for middleware
  ↓
Redirect to dashboard
```

The 401 error occurs at the `signInWithPassword` step when:
- Password doesn't match
- Email not confirmed
- User doesn't exist in auth.users

---

## Quick Command Reference

```powershell
# Reset admin password
node scripts/reset-admin-password.js

# Create test users
node scripts/create-test-user.js

# Start dev server
npm run dev

# Check if server is running
curl http://localhost:3000/api/health
```

---

**Last Updated**: 2025-10-07  
**Script Location**: `scripts/reset-admin-password.js`
