# RLS Infinite Recursion Fix

**Date**: 2025-10-05  
**Issue**: Payment error with "infinite recursion detected in policy for relation 'users'"  
**Status**: ✅ Fixed

---

## Problem Analysis

### Root Cause
The `users` table had an RLS policy that created a **circular dependency**:

```sql
CREATE POLICY "Admins can manage all users" ON users
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users  -- ❌ Querying the same table with RLS enabled
        WHERE id = auth.uid()::uuid AND role = 'admin'
    )
);
```

When PostgreSQL tried to check if a user could access the `users` table:
1. It evaluated the RLS policy
2. The policy queried the `users` table again
3. This triggered the same RLS policy evaluation
4. **Infinite loop** → Stack overflow error

### Where the Error Occurred
- **Component**: `PaymentPanel.tsx` line 193
- **API Call**: `POST /api/orders`
- **Repository**: `OrderRepository.create()`
- **Database Query**: When fetching order data with user joins

---

## Solution Implemented

### 1. Security Definer Functions
Created helper functions that **bypass RLS** to safely check user roles:

```sql
-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER  -- Runs with owner privileges, bypassing RLS
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::uuid 
    AND role = 'admin'
    AND is_active = true
  );
$$;
```

**Key Functions Created:**
- ✅ `public.current_user_role()` - Get current user's role
- ✅ `public.is_admin()` - Check if user is admin
- ✅ `public.is_manager_or_admin()` - Check if user is manager or admin
- ✅ `public.is_active_staff()` - Check if user is active staff

### 2. Updated RLS Policies

#### Users Table (Fixed)
```sql
-- ✅ Users can view their own data
CREATE POLICY "users_select_own" 
ON users FOR SELECT 
USING (auth.uid()::uuid = id);

-- ✅ Managers can view all users (using helper function)
CREATE POLICY "users_select_managers" 
ON users FOR SELECT 
USING (public.is_manager_or_admin());

-- ✅ Admins can manage users (using helper function)
CREATE POLICY "users_insert_admin" 
ON users FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "users_update_admin" 
ON users FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "users_delete_admin" 
ON users FOR DELETE 
USING (public.is_admin());
```

#### Orders Table (Updated)
```sql
CREATE POLICY "orders_select_staff" 
ON orders FOR SELECT 
USING (public.is_active_staff());

CREATE POLICY "orders_insert_staff" 
ON orders FOR INSERT 
WITH CHECK (public.is_active_staff());

CREATE POLICY "orders_update_own" 
ON orders FOR UPDATE 
USING (cashier_id = auth.uid()::uuid OR public.is_manager_or_admin());
```

#### Other Tables Updated
- ✅ `customers` - Using `is_active_staff()` and `is_admin()`
- ✅ `products` - Using `is_manager_or_admin()`
- ✅ `orders` - Using helper functions

---

## Technical Details

### Why SECURITY DEFINER?
- **SECURITY DEFINER** functions execute with the privileges of the function owner
- They bypass RLS policies when accessing tables
- This breaks the circular dependency

### Why STABLE?
- The `STABLE` keyword indicates the function won't modify data
- Allows PostgreSQL to optimize by caching results within a query
- Improves performance for repeated role checks

### Comparison: Before vs After

| Aspect | Before (Broken) | After (Fixed) |
|--------|----------------|---------------|
| **Policy Check** | Direct `SELECT FROM users` | Call `public.is_admin()` |
| **RLS Triggered** | ✅ Yes (causes recursion) | ❌ No (bypassed by SECURITY DEFINER) |
| **Query Pattern** | Nested subquery in policy | Simple function call |
| **Performance** | Poor (recursive checks) | Good (cached function result) |

---

## Migrations Applied

### Migration 1: Fix Users RLS
**Name**: `fix_users_rls_infinite_recursion_v2`
- Created 4 security definer helper functions
- Dropped old problematic policies
- Created new policies using helper functions

### Migration 2: Update All Tables
**Name**: `update_all_rls_policies_to_use_helper_functions`
- Updated `orders` table policies
- Updated `customers` table policies
- Updated `products` table policies
- Ensured consistent pattern across all tables

---

## Testing Checklist

### ✅ Verified Scenarios
- [x] Users can view their own profile
- [x] Managers can view all users
- [x] Cashiers can create orders
- [x] Orders are created with cashier_id correctly set
- [x] No infinite recursion errors on payment processing
- [x] Proper access control maintained (security not compromised)

### Test Commands
```sql
-- Test 1: Check if functions work
SELECT public.is_admin();
SELECT public.is_manager_or_admin();
SELECT public.is_active_staff();

-- Test 2: Check policies are applied
SELECT * FROM pg_policies WHERE tablename = 'users';
SELECT * FROM pg_policies WHERE tablename = 'orders';

-- Test 3: Verify no recursion (run as authenticated user)
SELECT * FROM users WHERE id = auth.uid()::uuid;
```

---

## Related Files Modified

### Database Migrations
- ✅ Applied via Supabase MCP

### Code Files (No changes needed)
- `src/views/pos/PaymentPanel.tsx` - No changes (error fixed at DB level)
- `src/app/api/orders/route.ts` - No changes
- `src/data/repositories/OrderRepository.ts` - No changes

---

## Best Practices Established

### ✅ DO's
1. **Use SECURITY DEFINER functions** for role checks in RLS policies
2. **Keep functions STABLE** for performance optimization
3. **Test RLS policies** with different user roles
4. **Document all helper functions** in code

### ❌ DON'Ts
1. **Never query the same table** directly in its own RLS policy
2. **Avoid complex subqueries** in policy USING/WITH CHECK clauses
3. **Don't bypass RLS** without proper security review
4. **Never hardcode role checks** in application code when RLS exists

---

## Security Considerations

### ✅ Security Maintained
- Helper functions only check current user's role (no privilege escalation)
- RLS policies still enforce proper access control
- Admin/manager privileges properly gated
- Users can only see/modify what they should

### Audit Trail
- All policy changes logged in Supabase migrations
- Function definitions are version controlled
- Can be rolled back if needed

---

## Performance Impact

### Before Fix
- ❌ Stack overflow on user queries
- ❌ Slow recursive policy evaluation
- ❌ System crashes on certain operations

### After Fix
- ✅ No recursion errors
- ✅ Fast function-based role checks
- ✅ Cached results within query scope
- ✅ Stable system performance

---

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- Internal: `docs/RLS_QUICK_REFERENCE.md`

---

**Last Updated**: 2025-10-05  
**Fixed By**: Development Team  
**Tested**: ✅ Verified working
