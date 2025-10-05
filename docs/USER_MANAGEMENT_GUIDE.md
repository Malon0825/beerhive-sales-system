# User Management Guide

**Module**: Settings > User Management  
**Route**: `/settings/users`  
**Access**: Admin and Manager roles only

---

## Overview

The User Management module allows administrators and managers to:
- Create new system users
- Edit existing user information
- Deactivate/reactivate user accounts
- Reset user passwords
- View user activity (last login)

---

## Features

### 1. User List
- Displays all users in a sortable table
- Shows user status (Active/Inactive)
- Role badges with color coding
- Last login timestamp
- Quick actions for each user

### 2. Create User
- Username (unique, 3-50 characters, alphanumeric + underscore)
- Email (valid email format, unique)
- Full Name (required)
- Role selection (Admin, Manager, Cashier, Kitchen, Bartender, Waiter)
- Password (min 8 chars, must contain uppercase, lowercase, and number)

### 3. Edit User
- Can update email, full name, and role
- Username cannot be changed after creation
- Password changes done via Reset Password action

### 4. Deactivate User
- Prevents user from logging in
- User data is preserved (soft delete)
- Can be reactivated later
- Requires confirmation

### 5. Reactivate User
- Re-enables login access
- Restores full account functionality
- Requires confirmation

### 6. Reset Password
- Generates secure temporary password
- Invalidates current password
- Shows password once (must be copied)
- User must change password on first login

---

## Role-Based Access Control

### Admin
- Full access to all user management features
- Can create/edit/deactivate any user
- Can manage other admins

### Manager
- Full access to all user management features
- Can create/edit/deactivate any user
- Can manage other managers

### Other Roles
- No access to user management
- Redirected to dashboard if attempting to access

---

## User Roles Explained

| Role | Description | Access |
|------|-------------|--------|
| **Admin** | Full system access | Everything |
| **Manager** | Operations management | All except system settings |
| **Cashier** | Point of Sale operations | POS, Orders, Customers |
| **Kitchen** | Kitchen display | Kitchen orders, Inventory view |
| **Bartender** | Bar operations | Bar orders, Inventory view |
| **Waiter** | Order taking & serving | Tables, Orders, Customer lookup |

---

## User Creation Workflow

### Step 1: Navigate to User Management
```
Dashboard → Settings → Users → Add User
```

### Step 2: Fill in User Details
- **Username**: Unique identifier (e.g., `john_doe`, `cashier01`)
- **Email**: For notifications and password reset
- **Full Name**: Display name (e.g., "John Doe")
- **Role**: Select appropriate role
- **Password**: Must meet security requirements

### Step 3: Validation Rules
- Username: 3-50 chars, letters/numbers/underscore only
- Email: Valid email format, unique in system
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
- Full Name: Required, any characters allowed

### Step 4: Submit
- Click "Create User"
- Success toast appears
- User added to list
- Form closes automatically

---

## Password Reset Workflow

### Step 1: Initiate Reset
1. Find user in list
2. Click key icon (🔑)
3. Confirmation dialog appears

### Step 2: Confirm Reset
- Review warning message
- Understand consequences:
  - Current password invalidated
  - Temporary password generated
  - User must change on first login
- Click "Reset Password"

### Step 3: Copy Temporary Password
- New password displayed (only once!)
- Click "Copy" to copy to clipboard
- Save password securely
- Provide to user through secure channel

### Step 4: User First Login
1. User logs in with temporary password
2. System prompts password change
3. User sets new password
4. Normal access granted

---

## Deactivation vs Deletion

### Deactivation (Soft Delete) ✅ Recommended
- User cannot log in
- All data preserved
- Can be reactivated
- Audit trail maintained
- Orders/history remain intact

### Deletion (Hard Delete) ⚠️ Not Recommended
- Permanently removes user
- Cannot be undone
- May break referential integrity
- Use only for test accounts

**Best Practice**: Always deactivate instead of delete.

---

## Security Best Practices

### Password Management
1. **Strength Requirements**
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter  
   - At least 1 number
   - Consider special characters for extra security

2. **Temporary Passwords**
   - Auto-generated 12 characters
   - Includes uppercase, lowercase, numbers, symbols
   - Shown only once
   - Must be changed on first use

3. **Password Reset**
   - Use secure channel to share (not email/SMS if possible)
   - User should change immediately
   - Old password invalidated immediately

### User Account Security
1. **Deactivate Immediately** when:
   - Employee leaves company
   - Suspected security breach
   - Extended leave of absence
   - Role change requires it

2. **Regular Audits**
   - Review active users monthly
   - Check last login dates
   - Deactivate unused accounts (90+ days)
   - Verify role assignments

3. **Least Privilege Principle**
   - Grant minimum required access
   - Don't give Admin unless necessary
   - Review Manager assignments regularly
   - Limit Cashier access to POS only

---

## Common Issues & Solutions

### Issue: Cannot Create User - "Username already exists"
**Solution**: Choose a different username. Usernames must be unique.

### Issue: Cannot Create User - "Email already exists"
**Solution**: Each user must have unique email. Check if user already exists.

### Issue: Password doesn't meet requirements
**Solution**: Ensure password has:
- At least 8 characters
- 1 uppercase letter
- 1 lowercase letter
- 1 number

### Issue: Cannot deactivate user
**Solution**: 
- Check your role (must be Manager or Admin)
- User might already be inactive
- Check API logs for errors

### Issue: Reset password not working
**Solution**:
- Ensure user exists and is not deleted
- Check network connection
- Verify authentication token is valid

### Issue: Changes not saving
**Solution**:
- Check network connection
- Verify you have proper permissions
- Look for error toast notifications
- Check browser console for errors

---

## API Endpoints

### List Users
```
GET /api/users
Authorization: Bearer <token>
Roles: Admin, Manager
```

### Create User
```
POST /api/users
Authorization: Bearer <token>
Roles: Admin, Manager
Body: {
  username: string,
  email: string,
  password: string,
  full_name: string,
  role: string
}
```

### Update User
```
PATCH /api/users/[userId]
Authorization: Bearer <token>
Roles: Admin, Manager
Body: {
  email?: string,
  full_name?: string,
  role?: string
}
```

### Deactivate User
```
POST /api/users/[userId]/deactivate
Authorization: Bearer <token>
Roles: Admin, Manager
```

### Reactivate User
```
POST /api/users/[userId]/reactivate
Authorization: Bearer <token>
Roles: Admin, Manager
```

### Reset Password
```
POST /api/users/[userId]/reset-password
Authorization: Bearer <token>
Roles: Admin, Manager
Response: {
  success: true,
  temporaryPassword: string
}
```

---

## Component Structure

```
src/app/(dashboard)/settings/users/
├── page.tsx                    # Route page

src/views/settings/users/
├── UserManagement.tsx          # Main container
├── UserList.tsx                # User table
├── UserForm.tsx                # Create/Edit form
├── PasswordResetDialog.tsx     # Password reset modal
└── RoleBadge.tsx              # Role display badge

src/views/shared/ui/
├── confirm-dialog.tsx          # Reusable confirmation dialog
├── button.tsx                  # Button component
├── input.tsx                   # Input component
└── badge.tsx                   # Badge component
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close dialog/modal |
| `Enter` | Submit form (when focused) |
| `Tab` | Navigate form fields |

---

## Mobile Responsiveness

The user management module is fully responsive:
- ✅ Table scrolls horizontally on small screens
- ✅ Dialogs adapt to screen size
- ✅ Touch-friendly buttons (44px min)
- ✅ Readable on all devices

---

## Accessibility

WCAG 2.1 AA Compliant:
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Proper ARIA labels
- ✅ Focus management
- ✅ Color contrast ratios met

---

## Testing Checklist

Before deploying changes:

- [ ] Can create user with all roles
- [ ] Validation errors display correctly
- [ ] Cannot create duplicate username
- [ ] Cannot create duplicate email
- [ ] Can edit user details
- [ ] Username field disabled when editing
- [ ] Can deactivate active user
- [ ] Can reactivate inactive user
- [ ] Password reset generates temp password
- [ ] Copy to clipboard works
- [ ] Toast notifications appear
- [ ] Confirmation dialogs work
- [ ] Loading states display
- [ ] Error handling works
- [ ] Permission checks enforce
- [ ] Mobile layout works

---

## Troubleshooting

### Debug Mode
Enable in browser console:
```javascript
localStorage.setItem('debug', 'true');
```

### Check Logs
1. Browser Console (F12)
2. Network Tab for API calls
3. Server logs for backend errors

### Common Error Codes
- `401` - Not authenticated (login again)
- `403` - Insufficient permissions (check role)
- `404` - User not found
- `409` - Duplicate username/email
- `500` - Server error (check logs)

---

## Support

For issues:
1. Check this guide
2. Review error messages
3. Check browser console
4. Contact system administrator

---

**Last Updated**: 2025-10-05  
**Version**: 1.0.0
