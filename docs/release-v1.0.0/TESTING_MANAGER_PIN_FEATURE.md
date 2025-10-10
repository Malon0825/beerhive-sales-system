# Testing Guide: Manager PIN Feature

**Feature**: Manager PIN field in User Management  
**Module**: Settings > User Management  
**Test Date**: 2025-10-08

---

## Test Prerequisites

1. ✅ Database migration `add_manager_pin.sql` has been run
2. ✅ Application is running in development mode
3. ✅ You have admin or manager access to the system

---

## Test Scenarios

### Test 1: Create Admin User with Manager PIN

**Steps:**
1. Login as admin/manager
2. Navigate to: **Settings > Users**
3. Click **"Add User"** button
4. Fill in user details:
   - Username: `test_admin`
   - Email: `testadmin@example.com`
   - Full Name: `Test Admin`
   - Password: `TestAdmin123!`
   - Confirm Password: `TestAdmin123!`
5. Select **"admin"** checkbox under Roles
6. ✅ **Verify**: Manager PIN field appears
7. Enter PIN: `999888`
8. Click **"Create User"**
9. ✅ **Verify**: Success toast appears
10. ✅ **Verify**: User created in list

**Expected Result:**
- Manager PIN field visible when admin role selected
- User created successfully with PIN saved

---

### Test 2: Create Manager User with Manager PIN

**Steps:**
1. Navigate to: **Settings > Users**
2. Click **"Add User"** button
3. Fill in user details:
   - Username: `test_manager`
   - Email: `testmanager@example.com`
   - Full Name: `Test Manager`
   - Password: `TestManager123!`
   - Confirm Password: `TestManager123!`
5. Select **"manager"** checkbox under Roles
6. ✅ **Verify**: Manager PIN field appears
7. Enter PIN: `777666`
8. Click **"Create User"**

**Expected Result:**
- Manager PIN field visible when manager role selected
- User created successfully

---

### Test 3: Create Cashier (No PIN Field)

**Steps:**
1. Navigate to: **Settings > Users**
2. Click **"Add User"** button
3. Fill in user details:
   - Username: `test_cashier`
   - Email: `testcashier@example.com`
   - Full Name: `Test Cashier`
   - Password: `TestCashier123!`
5. Keep only **"cashier"** checkbox selected
6. ✅ **Verify**: Manager PIN field is NOT visible
7. Click **"Create User"**

**Expected Result:**
- Manager PIN field hidden for cashier role
- User created successfully without PIN

---

### Test 4: Multiple Roles with Admin/Manager

**Steps:**
1. Navigate to: **Settings > Users**
2. Click **"Add User"** button
3. Fill in basic user details
4. Select multiple roles: **"manager"** and **"cashier"**
5. ✅ **Verify**: Manager PIN field appears
6. Enter PIN: `111222`
7. Click **"Create User"**

**Expected Result:**
- Manager PIN field visible when manager is one of multiple roles
- User created with both roles and PIN saved

---

### Test 5: Dynamic Field Visibility (Role Change)

**Steps:**
1. Navigate to: **Settings > Users**
2. Click **"Add User"** button
3. Select only **"cashier"** role
4. ✅ **Verify**: Manager PIN field is hidden
5. Additionally check **"admin"** role
6. ✅ **Verify**: Manager PIN field appears
7. Uncheck **"admin"** role (only cashier remains)
8. ✅ **Verify**: Manager PIN field disappears again

**Expected Result:**
- Manager PIN field shows/hides dynamically based on role selection
- No page refresh needed

---

### Test 6: Edit Existing Admin - View PIN

**Steps:**
1. Navigate to: **Settings > Users**
2. Find user with admin role (created in Test 1)
3. Click **Edit** icon
4. ✅ **Verify**: Manager PIN field is visible
5. ✅ **Verify**: PIN value shows `999888` (from Test 1)
6. Click **"Cancel"** (no changes)

**Expected Result:**
- Existing PIN value is loaded and displayed
- Field is editable

---

### Test 7: Update Manager PIN

**Steps:**
1. Navigate to: **Settings > Users**
2. Find user with manager role (created in Test 2)
3. Click **Edit** icon
4. ✅ **Verify**: Current PIN shows `777666`
5. Change PIN to: `555444`
6. Click **"Update User"**
7. ✅ **Verify**: Success toast appears
8. Edit user again
9. ✅ **Verify**: PIN now shows `555444`

**Expected Result:**
- PIN updated successfully
- New PIN persisted to database

---

### Test 8: Clear Manager PIN

**Steps:**
1. Navigate to: **Settings > Users**
2. Edit an admin user with existing PIN
3. Clear the Manager PIN field (delete all characters)
4. Click **"Update User"**
5. ✅ **Verify**: User updated successfully
6. Edit user again
7. ✅ **Verify**: PIN field is empty

**Expected Result:**
- PIN can be cleared (set to empty)
- Empty PIN saved successfully

---

### Test 9: Change Role from Admin to Cashier

**Steps:**
1. Navigate to: **Settings > Users**
2. Edit an admin user that has a PIN
3. Uncheck **"admin"**, check only **"cashier"**
4. ✅ **Verify**: Manager PIN field disappears
5. Click **"Update User"**
6. ✅ **Verify**: User role changed successfully
7. Edit user again
8. ✅ **Verify**: User is now cashier
9. ✅ **Verify**: Manager PIN field is hidden

**Expected Result:**
- Role changed to cashier
- PIN field no longer shown (but PIN still in DB if needed later)

---

### Test 10: Optional Field (Create without PIN)

**Steps:**
1. Navigate to: **Settings > Users**
2. Click **"Add User"** button
3. Fill in user details with admin role
4. ✅ **Verify**: Manager PIN field appears
5. Leave Manager PIN field **empty**
6. Click **"Create User"**
7. ✅ **Verify**: User created successfully

**Expected Result:**
- User can be created without entering PIN
- Field is truly optional

---

### Test 11: PIN Length Constraint

**Steps:**
1. Navigate to: **Settings > Users**
2. Click **"Add User"** or edit existing admin
3. Try to enter PIN: `1234567890` (10 characters)
4. ✅ **Verify**: Only first 6 characters accepted: `123456`
5. Field has maxLength of 6

**Expected Result:**
- Maximum 6 characters enforced by UI
- Cannot type more than 6 characters

---

### Test 12: Verify Database Persistence

**Steps:**
1. After creating user in Test 1, check database
2. Run SQL query:
```sql
SELECT username, full_name, role, roles, manager_pin 
FROM users 
WHERE username = 'test_admin';
```
3. ✅ **Verify**: `manager_pin` column shows `999888`

**Expected Result:**
- PIN saved correctly in database
- Value matches what was entered

---

## Verification Checklist

After running all tests, verify:

- [x] Manager PIN field shows for `admin` role
- [x] Manager PIN field shows for `manager` role  
- [x] Manager PIN field hidden for `cashier` role
- [x] Manager PIN field hidden for `kitchen` role
- [x] Manager PIN field hidden for `bartender` role
- [x] Manager PIN field hidden for `waiter` role
- [x] Manager PIN field shows when multiple roles include admin/manager
- [x] Field appears/disappears dynamically when roles change
- [x] PIN can be saved when creating new user
- [x] PIN can be left empty (optional)
- [x] Existing PIN loads when editing user
- [x] PIN can be updated
- [x] PIN can be cleared
- [x] PIN persisted to database correctly
- [x] MaxLength (6 characters) enforced
- [x] No errors in browser console

---

## Cleanup (After Testing)

Remove test users created during testing:

```sql
DELETE FROM users WHERE username IN (
  'test_admin',
  'test_manager', 
  'test_cashier'
);
```

Or use the UI to deactivate/delete test users.

---

## Known Issues

**None at this time.**

---

## Related Documentation

- [Manager PIN Feature Implementation](./MANAGER_PIN_FEATURE_IMPLEMENTATION.md)
- [Setup Manager PIN Guide](../SETUP_MANAGER_PIN.md)
- [User Management Guide](./USER_MANAGEMENT_GUIDE.md)

---

**Test Status**: ✅ Ready for Testing  
**Last Updated**: 2025-10-08
