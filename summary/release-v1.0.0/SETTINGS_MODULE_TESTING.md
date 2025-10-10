# Settings Module - Testing Guide

**Module**: User Management Settings  
**Access URL**: http://localhost:3000/settings  
**Required Role**: Admin or Manager

---

## Quick Start

### 1. Start the Development Server
```powershell
npm run dev
```

### 2. Login as Admin or Manager
- Navigate to: http://localhost:3000/login
- Use admin or manager credentials

### 3. Access Settings
- Click on **Settings** in the navigation
- Or directly visit: http://localhost:3000/settings

---

## Test Scenarios

### Scenario 1: Create New User

1. **Navigate to User Management**
   - Go to http://localhost:3000/settings/users
   - Click "Add User" button

2. **Fill in User Details**
   - Username: `testuser1` (alphanumeric + underscore only)
   - Email: `testuser1@beerhive.com`
   - Full Name: `Test User One`
   - Role: Select from dropdown (Cashier, Kitchen, Bartender, Waiter, Manager, Admin)
   - Password: `TestUser123!` (min 8 chars, uppercase, lowercase, number)
   - Confirm Password: `TestUser123!`

3. **Submit**
   - Click "Create User"
   - Should see success message and user appears in list

**Expected Result**: ✅ User created successfully and appears in the user table

---

### Scenario 2: Edit Existing User

1. **Locate User** in the table
2. **Click Edit Icon** (pencil)
3. **Modify Details**:
   - Change email or full name
   - Change role
   - Note: Username cannot be changed
4. **Save Changes**

**Expected Result**: ✅ User details updated successfully

---

### Scenario 3: Reset User Password

1. **Click Key Icon** next to any user
2. **Confirm Action** in the dialog
3. **Copy Temporary Password** that appears
4. **Test Login**:
   - Logout
   - Login with the username and temporary password
   - Should be able to login successfully

**Expected Result**: ✅ Temporary password generated and works for login

---

### Scenario 4: Deactivate User

1. **Click Power Off Icon** (red button)
2. **Confirm Deactivation**
3. **Verify Status**: User row should be grayed out with "Inactive" badge
4. **Test Login**:
   - Try to login with deactivated user
   - Should fail with error

**Expected Result**: ✅ User deactivated and cannot login

---

### Scenario 5: Reactivate User

1. **Find Deactivated User** (grayed out)
2. **Click Power Icon** (green button)
3. **Verify Status**: User becomes active
4. **Test Login**: Should be able to login again

**Expected Result**: ✅ User reactivated successfully

---

### Scenario 6: Role-Based Access Control

**Test as Non-Admin/Manager Role**:
1. **Logout** from admin/manager account
2. **Login as Cashier** (or Kitchen, Bartender, Waiter)
3. **Try to Access Settings**:
   - Navigate to http://localhost:3000/settings
   - Should see "Access Denied" message

**Expected Result**: ✅ Access denied for non-admin/manager users

---

## API Testing (Postman/cURL)

### Get Auth Token First
```powershell
# Login to get token
$loginBody = @{
    username = "admin"
    password = "AdminPassword123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method POST `
    -Body $loginBody `
    -ContentType "application/json"

$token = $response.data.session.access_token
```

### Create User via API
```powershell
$userBody = @{
    username = "apiuser1"
    email = "apiuser@beerhive.com"
    password = "ApiUser123!"
    full_name = "API Test User"
    role = "cashier"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users" `
    -Method POST `
    -Body $userBody `
    -ContentType "application/json" `
    -Headers @{ "Authorization" = "Bearer $token" }
```

### Get All Users
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/users" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $token" }
```

### Update User
```powershell
$updateBody = @{
    full_name = "Updated Name"
    role = "manager"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users/USER_ID_HERE" `
    -Method PATCH `
    -Body $updateBody `
    -ContentType "application/json" `
    -Headers @{ "Authorization" = "Bearer $token" }
```

### Reset Password
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/users/USER_ID_HERE/reset-password" `
    -Method POST `
    -Headers @{ "Authorization" = "Bearer $token" }
```

---

## Validation Testing

### Username Validation
Test invalid usernames (should fail):
- ❌ `ab` (too short, min 3 chars)
- ❌ `user name` (contains space)
- ❌ `user@123` (contains @)
- ❌ `user-name` (contains dash)
- ✅ `user_123` (valid)
- ✅ `JohnDoe` (valid)

### Email Validation
Test invalid emails (should fail):
- ❌ `notanemail` (no @)
- ❌ `test@` (incomplete)
- ❌ `@test.com` (no username)
- ✅ `valid@email.com` (valid)

### Password Validation
Test weak passwords (should fail):
- ❌ `short` (too short)
- ❌ `lowercase123` (no uppercase)
- ❌ `UPPERCASE123` (no lowercase)
- ❌ `PasswordOnly` (no number)
- ✅ `Password123` (valid)
- ✅ `SecureP@ss1` (valid)

---

## Common Issues & Solutions

### Issue 1: "Not authenticated" error
**Solution**: 
- Ensure you're logged in
- Check browser console for token errors
- Try logging out and back in

### Issue 2: "Insufficient permissions" error
**Solution**:
- Verify you're logged in as Admin or Manager
- Check your role in the user profile

### Issue 3: "Username already exists" error
**Solution**:
- Choose a different username
- Check existing users list

### Issue 4: API requests failing
**Solution**:
- Verify Supabase connection is active
- Check environment variables (.env.local)
- Ensure database migrations are applied

---

## Performance Checks

- [ ] User list loads within 2 seconds
- [ ] Create user completes within 3 seconds
- [ ] Password reset generates instantly
- [ ] UI remains responsive during operations
- [ ] No console errors in browser DevTools

---

## Security Checks

- [ ] Cannot access `/settings` without login
- [ ] Cannot access `/settings` as non-admin/manager
- [ ] API endpoints reject unauthorized requests
- [ ] Passwords are never displayed after creation
- [ ] Session tokens are properly managed
- [ ] User input is validated on both client and server

---

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (responsive design)

---

## Next Steps After Testing

1. **Create Initial Admin User** (if not exists)
2. **Create Manager Accounts** for your managers
3. **Create Staff Accounts** for cashiers, kitchen, bartenders, waiters
4. **Document Passwords Securely**
5. **Train Staff** on using the system

---

## Support & Documentation

- **Full Implementation Guide**: `summary/SETTINGS_MODULE_IMPLEMENTATION.md`
- **Architecture Reference**: `docs/Folder Structure.md`
- **Database Schema**: `docs/Database Structure.sql`

---

## Quick Reference

| Action | URL | Required Role |
|--------|-----|---------------|
| Settings Dashboard | `/settings` | Admin/Manager |
| User Management | `/settings/users` | Admin/Manager |
| General Settings | `/settings/general` | Admin/Manager |

| User Role | Can Access Settings? |
|-----------|---------------------|
| Admin | ✅ Yes |
| Manager | ✅ Yes |
| Cashier | ❌ No |
| Kitchen | ❌ No |
| Bartender | ❌ No |
| Waiter | ❌ No |
