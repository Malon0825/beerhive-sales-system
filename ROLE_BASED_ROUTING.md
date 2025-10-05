# Role-Based Routing

## Overview
After login, users are automatically redirected to their role-specific workspace based on their assigned role.

## Role → Route Mapping

| Role | Default Route | Page | Purpose |
|------|--------------|------|---------|
| **Admin** | `/` | Dashboard | Full system overview and access |
| **Manager** | `/reports` | Reports | Sales analytics and reports |
| **Cashier** | `/pos` | Point of Sale | Create orders, manage customers |
| **Kitchen** | `/kitchen` | Kitchen Display | View and prepare food orders |
| **Bartender** | `/bartender` | Bartender Display | View and prepare drink orders |
| **Waiter** | `/waiter` | Waiter Display | View ready orders, mark as served |

## How It Works

### 1. Login Flow
```
User enters credentials
    ↓
AuthService.login() validates
    ↓
AuthContext.login() receives user data
    ↓
getDefaultRouteForRole(user.role) determines route
    ↓
router.push(defaultRoute)
    ↓
User lands on their workspace ✅
```

### 2. Implementation

**File**: `src/lib/contexts/AuthContext.tsx`

```typescript
function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case UserRole.ADMIN:
      return '/'; // Dashboard
    case UserRole.MANAGER:
      return '/reports'; // Reports
    case UserRole.CASHIER:
      return '/pos'; // POS
    case UserRole.KITCHEN:
      return '/kitchen'; // Kitchen
    case UserRole.BARTENDER:
      return '/bartender'; // Bartender
    case UserRole.WAITER:
      return '/waiter'; // Waiter
    default:
      return '/'; // Default
  }
}
```

### 3. Authorization Helpers

**File**: `src/lib/hooks/useAuth.ts`

New helper functions added:
- `isWaiter()` - Check if user is a waiter
- `canAccessWaiter()` - Check if user can access waiter display

```typescript
const { isWaiter, canAccessWaiter } = useAuth();

// Use in components
if (isWaiter()) {
  // Waiter-specific logic
}

if (canAccessWaiter()) {
  // Show waiter menu/button
}
```

## Examples

### Example 1: Cashier Login
```
Username: cashier
Password: Cashier123!
    ↓
Redirects to: http://localhost:3000/pos
```

### Example 2: Kitchen Staff Login
```
Username: kitchen
Password: Kitchen123!
    ↓
Redirects to: http://localhost:3000/kitchen
```

### Example 3: Waiter Login
```
Username: waiter
Password: Waiter123!
    ↓
Redirects to: http://localhost:3000/waiter
```

### Example 4: Admin Login
```
Username: admin
Password: Admin123!
    ↓
Redirects to: http://localhost:3000/
(Dashboard with access to everything)
```

## Access Control

### Who Can Access What?

**POS (Point of Sale)**
- ✅ Admin
- ✅ Manager
- ✅ Cashier
- ❌ Kitchen
- ❌ Bartender
- ❌ Waiter

**Kitchen Display**
- ✅ Admin
- ✅ Manager
- ✅ Kitchen
- ❌ Cashier
- ❌ Bartender
- ❌ Waiter

**Bartender Display**
- ✅ Admin
- ✅ Manager
- ❌ Kitchen
- ❌ Cashier
- ✅ Bartender
- ❌ Waiter

**Waiter Display**
- ✅ Admin
- ✅ Manager
- ❌ Kitchen
- ❌ Cashier
- ❌ Bartender
- ✅ Waiter

**Reports/Inventory**
- ✅ Admin
- ✅ Manager
- ❌ All Staff

## Testing

### Test Each Role:

1. **Create users** (run in PowerShell):
```powershell
# Admin
$body = @{username = "admin"; email = "admin@beerhive.com"; password = "Admin123!"; full_name = "Admin User"; role = "admin"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $body -ContentType "application/json"

# Cashier
$body = @{username = "cashier"; email = "cashier@beerhive.com"; password = "Cashier123!"; full_name = "Cashier User"; role = "cashier"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $body -ContentType "application/json"

# Kitchen
$body = @{username = "kitchen"; email = "kitchen@beerhive.com"; password = "Kitchen123!"; full_name = "Kitchen User"; role = "kitchen"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $body -ContentType "application/json"

# Waiter
$body = @{username = "waiter"; email = "waiter@beerhive.com"; password = "Waiter123!"; full_name = "Waiter User"; role = "waiter"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $body -ContentType "application/json"
```

2. **Test login for each role**:
   - Login with each user
   - Verify they land on the correct page
   - Check browser console for confirmation log

### Expected Console Output:
```
✅ Login successful: waiter (waiter) → redirecting to /waiter
✅ Login successful: kitchen (kitchen) → redirecting to /kitchen
✅ Login successful: cashier (cashier) → redirecting to /pos
```

## Files Modified

```
✅ src/lib/contexts/AuthContext.tsx
   - Added getDefaultRouteForRole() function
   - Updated login() to use role-based routing

✅ src/lib/hooks/useAuth.ts
   - Added isWaiter() helper
   - Added canAccessWaiter() helper
```

## Benefits

### 1. **Better UX**
- Users land directly on their work area
- No need to navigate after login
- Reduces confusion and clicks

### 2. **Security**
- Users directed only to what they can access
- Role-based access control enforced
- Prevents unauthorized access attempts

### 3. **Efficiency**
- Kitchen staff immediately see orders
- Cashiers immediately start processing
- Waiters immediately see ready items
- No wasted time navigating

## Future Enhancements

### Possible Additions:
- [ ] Remember last visited page per role
- [ ] Allow users to set their preferred landing page
- [ ] Multi-role users (e.g., cashier + waiter)
- [ ] Role-based navigation menu filtering
- [ ] Breadcrumb navigation
- [ ] Quick-switch between allowed pages

## Troubleshooting

### Issue: Still redirecting to `/pos` for all users
**Solution**: Restart dev server
```bash
npm run dev
```

### Issue: Console shows wrong route
**Solution**: Check UserRole enum matches database
```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype;
```

### Issue: User role not recognized
**Solution**: Verify user role in database
```sql
SELECT username, role FROM users WHERE username = 'waiter';
```

## Summary

✅ **Role-based routing implemented**  
✅ **Each role has dedicated workspace**  
✅ **Automatic redirection after login**  
✅ **Helper functions for access control**  
✅ **Console logging for debugging**  

**Result**: Seamless, role-specific user experience from login to work! 🎉
