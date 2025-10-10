# Admin & Manager Order Access - Complete Guide

**Issue Resolved:** Admins and managers can now create and manage orders  
**Date:** October 7, 2025  
**Status:** ✅ Fixed

---

## 🎯 Problem Statement

**Original Issue:**
```
insert or update on table "orders" violates foreign key constraint "orders_cashier_id_fkey"
```

**Root Cause:**
- Development database only had admin users, no cashier users
- API logic wasn't explicitly validating user roles
- Admins/managers couldn't create orders despite having full privileges

---

## ✅ Solution Implemented

### 1. API Layer Updates

Updated all `/api/current-orders/*` endpoints to accept **cashier**, **admin**, and **manager** roles.

#### Changed Files:
- `src/app/api/current-orders/route.ts`
- `src/app/api/current-orders/[orderId]/items/route.ts`

#### Key Changes:

**Before:**
```typescript
// Only implied cashier support
if (!cashierId) {
  return NextResponse.json({
    success: false,
    error: 'Cashier ID is required'
  }, { status: 400 });
}
```

**After:**
```typescript
// Explicit role validation
const allowedRoles = ['cashier', 'admin', 'manager'];

// Validate user exists
const { data: user } = await supabaseAdmin
  .from('users')
  .select('id, role, is_active, username')
  .eq('id', cashierId)
  .single();

// Validate role
if (!allowedRoles.includes(user.role)) {
  return NextResponse.json({
    success: false,
    error: `User role '${user.role}' is not authorized to create orders.`
  }, { status: 403 });
}

// Validate active status
if (!user.is_active) {
  return NextResponse.json({
    success: false,
    error: 'User account is inactive.'
  }, { status: 403 });
}
```

---

## 🔐 RLS Policies (Already Correct)

The database RLS policies were already configured correctly to support admins and managers:

```sql
-- Admins and managers can manage all current orders
CREATE POLICY "admins_manage_all_current_orders" ON current_orders
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()::uuid
            AND role IN ('admin', 'manager')
        )
    );
```

**This means:**
- ✅ Admins can create, read, update, delete any order
- ✅ Managers can create, read, update, delete any order
- ✅ Cashiers can only manage their own orders

---

## 📝 Updated API Documentation

### Supported User Roles

| Role | Create Orders | View Own Orders | View All Orders | Manage Orders |
|------|---------------|-----------------|-----------------|---------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ✅ |
| **Cashier** | ✅ | ✅ | ❌ | ❌ (own only) |
| **Waiter** | ❌ | ❌ | ❌ | ❌ |
| **Kitchen** | ❌ | ❌ | ❌ | ❌ |

---

## 🧪 Testing

### Test 1: Admin Creates Order

```bash
# Get admin user ID
curl "http://localhost:3000/api/auth/me" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Create order as admin
curl -X POST http://localhost:3000/api/current-orders \
  -H "Content-Type: application/json" \
  -d '{
    "cashierId": "ADMIN_USER_ID",
    "customerId": null,
    "tableId": null
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "cashier_id": "ADMIN_USER_ID",
    "subtotal": 0,
    "total_amount": 0,
    ...
  },
  "message": "Current order created successfully by admin (admin)"
}
```

### Test 2: Manager Creates Order

```bash
# Same as above, but with manager credentials
curl -X POST http://localhost:3000/api/current-orders \
  -H "Content-Type: application/json" \
  -d '{
    "cashierId": "MANAGER_USER_ID",
    ...
  }'
```

**Expected:** Success with manager info in message

### Test 3: Invalid Role Rejected

```bash
# Try with waiter role
curl -X POST http://localhost:3000/api/current-orders \
  -H "Content-Type: application/json" \
  -d '{
    "cashierId": "WAITER_USER_ID",
    ...
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "User role 'waiter' is not authorized to create orders. Required roles: cashier, admin, manager"
}
```

### Test 4: Inactive User Rejected

```sql
-- Deactivate a user
UPDATE users SET is_active = false WHERE id = 'USER_ID';
```

```bash
# Try to create order
curl -X POST http://localhost:3000/api/current-orders \
  -H "Content-Type: application/json" \
  -d '{"cashierId": "USER_ID", ...}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "User account is inactive. Please contact administrator."
}
```

---

## 🔧 Frontend Updates

The frontend **CartContext** already supports this correctly:

```typescript
// CartContext.tsx
const ensureCurrentOrder = useCallback(async (): Promise<string> => {
  if (currentOrderId) return currentOrderId;
  
  if (!cashierId) {
    throw new Error('User must be logged in to create orders');
  }

  // Works for admin, manager, cashier
  const response = await fetch('/api/current-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cashierId, // Can be admin/manager/cashier ID
      customerId: customer?.id,
      tableId: table?.id,
    }),
  });
  
  // ... handle response
}, [currentOrderId, cashierId, customer, table]);
```

**No frontend changes needed** - the CartContext uses the logged-in user's ID, which now works for all staff roles.

---

## 📊 Validation Flow

```
┌────────────────────────────────────────────────────────┐
│  1. User attempts to create order                      │
│     POST /api/current-orders                           │
│     { cashierId: "user-uuid" }                         │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  2. API validates cashierId provided                   │
│     ❌ If missing → 400 Bad Request                    │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  3. API looks up user in database                      │
│     SELECT * FROM users WHERE id = cashierId           │
│     ❌ If not found → 404 Not Found                    │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  4. API validates user role                            │
│     Allowed: cashier, admin, manager                   │
│     ❌ If invalid → 403 Forbidden                      │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  5. API validates user is active                       │
│     is_active = true                                   │
│     ❌ If inactive → 403 Forbidden                     │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  6. Create order in database                           │
│     INSERT INTO current_orders (cashier_id, ...)       │
│     ✅ Success → 201 Created                           │
└────────────────────────────────────────────────────────┘
```

---

## 🎯 Benefits

### 1. **Proper Error Messages**
```typescript
// Before
"insert or update on table 'orders' violates foreign key constraint"

// After
"Invalid user ID. User not found in database."
"User role 'waiter' is not authorized to create orders."
"User account is inactive. Please contact administrator."
```

### 2. **Role-Based Access Control**
- Clear definition of who can create orders
- Explicit validation at API layer
- Better security posture

### 3. **Development Experience**
- Admins can test POS without creating fake cashier accounts
- Managers have full access in production
- Clear error messages for debugging

### 4. **Production Ready**
- No database changes required
- Backward compatible with existing cashier users
- RLS policies enforce multi-layered security

---

## 📋 Checklist for Verification

- [x] API validates user exists
- [x] API validates user role (cashier/admin/manager)
- [x] API validates user is active
- [x] Error messages are clear and actionable
- [x] RLS policies support all roles
- [x] Frontend works without modification
- [x] Backward compatible with cashiers
- [x] Documentation updated
- [x] Test cases created

---

## 🚀 Deployment Notes

### No Migration Required

This is a **code-only** change. No database migrations needed.

### Deploy Steps

1. Deploy updated API routes
2. No frontend changes needed
3. Test with admin/manager accounts
4. Verify existing cashier accounts still work

### Rollback Plan

If issues arise:
1. Revert `src/app/api/current-orders/route.ts`
2. Revert `src/app/api/current-orders/[orderId]/items/route.ts`
3. No data will be affected

---

## 💡 Usage Examples

### Example 1: Admin POS Session

```typescript
// Admin logs in to POS
const { data: { user } } = await supabase.auth.signInWithPassword({
  email: 'admin@beerhive.com',
  password: 'admin_password'
});

// Admin can now use POS normally
// Orders will be created with admin's user ID
// Everything works as expected
```

### Example 2: Manager Floor Management

```typescript
// Manager helping during rush hour
const managerId = currentUser.id; // Manager's ID

// Manager can create orders on any POS terminal
await fetch('/api/current-orders', {
  method: 'POST',
  body: JSON.stringify({
    cashierId: managerId, // Manager ID works!
    tableId: table.id
  })
});
```

### Example 3: Cashier Normal Operation

```typescript
// Cashier workflow unchanged
const cashierId = currentUser.id;

// Still works exactly as before
await fetch('/api/current-orders', {
  method: 'POST',
  body: JSON.stringify({
    cashierId: cashierId,
    customerId: customer.id
  })
});
```

---

## 🎉 Summary

**What Changed:**
- ✅ API now validates user roles explicitly
- ✅ Accepts admin, manager, and cashier roles
- ✅ Better error messages for debugging
- ✅ Validates user exists and is active

**What Didn't Change:**
- ✅ Database schema (no migrations)
- ✅ RLS policies (already correct)
- ✅ Frontend code (works as-is)
- ✅ Existing cashier workflows

**Result:**
- ✅ Admins can create orders
- ✅ Managers can create orders
- ✅ Cashiers still work normally
- ✅ Clear, actionable error messages
- ✅ Production ready

---

**Questions?**
- Check `TROUBLESHOOT_FOREIGN_KEY_ERROR.md` for related issues
- See `DATABASE_SETUP_COMPLETE.md` for schema details
- Review `INTEGRATION_VERIFICATION.md` for testing

**Status:** ✅ Complete and Tested  
**Deploy:** Ready for production
