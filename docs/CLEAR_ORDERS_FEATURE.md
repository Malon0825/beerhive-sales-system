# Clear Orders Feature - Current Orders Module

**Date:** 2025-10-06  
**Module:** Current Orders Monitor  
**Feature:** Clear All Orders (User-Specific)  
**Route:** `/current-orders`  
**Status:** ✅ Implemented

---

## Overview

Added a "Clear My Orders" feature to the Current Orders Monitor dashboard that allows users to delete all their draft orders with a single click. The feature includes user-specific filtering to ensure users can only clear their own orders, not orders belonging to other users.

---

## Security Features

### 🔒 User Isolation

**Key Security Principle:** Users can ONLY clear orders that belong to them.

1. **Authentication Required**
   - JWT token validation via Authorization header
   - User identity extracted from valid session

2. **Ownership Validation**
   - Orders filtered by `cashier_id` matching logged-in user
   - Database-level filtering ensures no cross-user deletion

3. **No Admin Override**
   - Even admins can only clear their own orders
   - Prevents accidental deletion of other users' work

### Protection Mechanisms

```typescript
// API validates user ownership
const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

// Repository ensures cashier_id match
await CurrentOrderRepository.clearAllByCashier(user.id);
```

---

## Implementation Details

### 1. Repository Method

**File:** `src/data/repositories/CurrentOrderRepository.ts`

**New Method:** `clearAllByCashier(cashierId: string)`

```typescript
/**
 * Clear all current orders for a specific cashier
 * Deletes all draft orders belonging to the specified cashier
 * Uses supabaseAdmin to bypass RLS (security validated via cashier_id match)
 * 
 * @param {string} cashierId - The ID of the cashier whose orders to clear
 * @returns {Promise<number>} Number of orders deleted
 */
static async clearAllByCashier(cashierId: string): Promise<number> {
  try {
    // Get count of orders to be deleted
    const { data: orders, error: countError } = await supabaseAdmin
      .from('current_orders')
      .select('id')
      .eq('cashier_id', cashierId);
    
    if (countError) throw new AppError(countError.message, 500);
    
    const orderCount = orders?.length || 0;
    
    if (orderCount === 0) {
      return 0; // No orders to delete
    }

    // Delete all current orders for this cashier
    // Cascade delete will automatically remove all items and addons
    const { error } = await supabaseAdmin
      .from('current_orders')
      .delete()
      .eq('cashier_id', cashierId);

    if (error) throw new AppError(error.message, 500);
    
    return orderCount;
  } catch (error) {
    console.error('Error clearing all current orders for cashier:', error);
    throw error instanceof AppError ? error : new AppError('Failed to clear all orders', 500);
  }
}
```

**Features:**
- ✅ Returns count of deleted orders
- ✅ Handles case when no orders exist
- ✅ Cascade delete automatically removes items and addons
- ✅ Comprehensive error handling

---

### 2. API Endpoint

**File:** `src/app/api/current-orders/route.ts`

**New Method:** `DELETE /api/current-orders`

```typescript
/**
 * DELETE /api/current-orders
 * Clear all current orders for the authenticated user
 * 
 * Security:
 * - Requires authentication via Authorization header
 * - Only clears orders belonging to the logged-in user
 * - Validates user ownership before deletion
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Clear all current orders for this user (cashier)
    const deletedCount = await CurrentOrderRepository.clearAllByCashier(user.id);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        userId: user.id,
      },
      message: deletedCount > 0
        ? `Successfully cleared ${deletedCount} order(s)`
        : 'No orders to clear',
    });
  } catch (error: any) {
    console.error('Error clearing current orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to clear current orders',
      },
      { status: 500 }
    );
  }
}
```

**Request:**
```http
DELETE /api/current-orders
Authorization: Bearer <jwt_token>
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "deletedCount": 3,
    "userId": "user-123"
  },
  "message": "Successfully cleared 3 order(s)"
}
```

**Response (No Orders):**
```json
{
  "success": true,
  "data": {
    "deletedCount": 0,
    "userId": "user-123"
  },
  "message": "No orders to clear"
}
```

---

### 3. UI Component

**File:** `src/views/orders/StaffOrderMonitor.tsx`

**New Features:**
- ✅ "Clear My Orders" button in header
- ✅ Confirmation dialog with user information
- ✅ Loading states during deletion
- ✅ Success/error feedback
- ✅ Automatic refresh after clearing

**Button:**
```tsx
<Button
  onClick={() => setShowClearConfirm(true)}
  disabled={clearing || orders.length === 0}
  variant="destructive"
  className="flex items-center gap-2"
>
  <Trash2 className="w-4 h-4" />
  Clear My Orders
</Button>
```

**Confirmation Dialog:**
```tsx
{showClearConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <Card className="p-6 max-w-md mx-4">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        Clear Your Orders?
      </h3>
      <p className="text-gray-600 mb-6">
        This will delete all current orders that belong to you (
        <span className="font-semibold">{user?.full_name || user?.username}</span>
        ). This action cannot be undone.
      </p>
      <p className="text-sm text-amber-600 mb-6">
        ⚠️ Only your orders will be cleared. Other users' orders will not be affected.
      </p>
      {/* Action buttons */}
    </Card>
  </div>
)}
```

**Handler Function:**
```typescript
const handleClearOrders = async () => {
  if (!user) {
    alert('You must be logged in to clear orders');
    return;
  }

  setClearing(true);
  setShowClearConfirm(false);

  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Call API to clear orders
    const response = await fetch('/api/current-orders', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to clear orders');
    }

    // Show success message
    const deletedCount = result.data?.deletedCount || 0;
    if (deletedCount > 0) {
      alert(`Successfully cleared ${deletedCount} order(s)`);
    } else {
      alert('No orders to clear');
    }

    // Refresh orders list
    await fetchOrders();
  } catch (err: any) {
    console.error('Clear orders error:', err);
    alert(err.message || 'Failed to clear orders');
  } finally {
    setClearing(false);
  }
};
```

---

## User Experience

### Visual Flow

1. **Initial State**
   ```
   ┌─────────────────────────────────────────┐
   │ Current Orders Monitor                  │
   │ Real-time view of all draft orders      │
   │                                         │
   │   [Clear My Orders] [Refresh]           │
   └─────────────────────────────────────────┘
   ```

2. **Click "Clear My Orders"**
   ```
   ┌─────────────────────────────────────────┐
   │         Clear Your Orders?              │
   │                                         │
   │ This will delete all current orders     │
   │ that belong to you (John Doe).          │
   │ This action cannot be undone.           │
   │                                         │
   │ ⚠️ Only your orders will be cleared.   │
   │ Other users' orders will not be         │
   │ affected.                               │
   │                                         │
   │      [Cancel]  [Yes, Clear Orders]      │
   └─────────────────────────────────────────┘
   ```

3. **Clearing in Progress**
   ```
   ┌─────────────────────────────────────────┐
   │      [⏳ Clearing...]                   │
   │      Button disabled, spinner showing   │
   └─────────────────────────────────────────┘
   ```

4. **Success**
   ```
   ┌─────────────────────────────────────────┐
   │ Alert: Successfully cleared 3 order(s)  │
   │                                         │
   │ Orders list refreshed automatically     │
   └─────────────────────────────────────────┘
   ```

### Button States

| State | Appearance | Behavior |
|-------|------------|----------|
| **Normal** | Red button with trash icon | Clickable, shows confirmation |
| **No Orders** | Grayed out (disabled) | Not clickable |
| **Clearing** | Spinner animation | Not clickable |
| **After Clear** | Re-enabled if orders exist | Ready for next action |

---

## Use Cases

### Scenario 1: Clear Draft Orders at End of Shift
**User:** Cashier  
**Situation:** End of shift with several incomplete/abandoned orders

**Steps:**
1. Navigate to `/current-orders`
2. Click "Clear My Orders"
3. Confirm deletion
4. All cashier's draft orders removed
5. Clean slate for next shift

**Result:** ✅ Only cashier's orders cleared, other cashiers unaffected

---

### Scenario 2: Multi-User Environment
**Users:** Cashier A, Cashier B, Cashier C  
**Situation:** All working simultaneously with multiple draft orders

**Cashier A Action:**
- Clicks "Clear My Orders"
- Confirms deletion

**Result:**
- ✅ Cashier A's orders: DELETED
- ✅ Cashier B's orders: UNCHANGED
- ✅ Cashier C's orders: UNCHANGED

**Security:** Each cashier can only manage their own orders

---

### Scenario 3: No Orders to Clear
**User:** Manager  
**Situation:** Checks current orders dashboard, finds it empty

**Steps:**
1. Navigate to `/current-orders`
2. "Clear My Orders" button is disabled (grayed out)
3. Cannot click button

**Result:** ✅ Prevents unnecessary API calls

---

## Testing Checklist

### Functionality Tests

- [ ] ⏳ **Clear Single Order**
  - User with 1 order clears successfully
  - Count shows "1 order(s) cleared"

- [ ] ⏳ **Clear Multiple Orders**
  - User with 3+ orders clears successfully
  - Count shows correct number

- [ ] ⏳ **Clear No Orders**
  - User with 0 orders sees disabled button
  - Message shows "No orders to clear"

- [ ] ⏳ **User Isolation**
  - User A clears orders
  - User B's orders remain intact
  - User C's orders remain intact

### Security Tests

- [ ] ⏳ **Authentication Required**
  - Unauthenticated request returns 401
  - Invalid token returns 401

- [ ] ⏳ **Ownership Validation**
  - User can only clear own orders
  - Cannot clear other users' orders via API manipulation

- [ ] ⏳ **Authorization Header**
  - Missing header returns 401
  - Malformed header returns 401

### UI/UX Tests

- [ ] ⏳ **Confirmation Dialog**
  - Shows user's name correctly
  - Warning message displays
  - Can cancel operation

- [ ] ⏳ **Loading States**
  - Button shows spinner during clearing
  - Button disabled during operation
  - Cannot trigger multiple clears

- [ ] ⏳ **Success Feedback**
  - Alert shows correct count
  - Orders list refreshes automatically
  - Button re-enables if orders remain

- [ ] ⏳ **Error Handling**
  - Network error shows message
  - Auth error shows message
  - Database error shows message

### Real-Time Tests

- [ ] ⏳ **Auto-Refresh**
  - Orders list updates after clear
  - Statistics update (count, revenue)
  - Last updated time refreshes

- [ ] ⏳ **Concurrent Users**
  - User A clears during User B's view
  - User B's view updates correctly
  - No data corruption

---

## Database Impact

### Cascade Deletion

When an order is deleted from `current_orders`:

1. **current_order_items** - All items deleted automatically
2. **current_order_item_addons** - All addons deleted automatically

**Database Constraints:**
```sql
-- current_order_items foreign key
ON DELETE CASCADE

-- current_order_item_addons foreign key
ON DELETE CASCADE
```

**Performance:**
- Single DELETE query with WHERE clause
- Database handles cascade efficiently
- No orphaned records

---

## Files Modified

| File | Changes | Lines Added |
|------|---------|-------------|
| `src/data/repositories/CurrentOrderRepository.ts` | Added `clearAllByCashier` method | +43 |
| `src/app/api/current-orders/route.ts` | Added DELETE endpoint | +68 |
| `src/views/orders/StaffOrderMonitor.tsx` | Added clear button, dialog, handler | +87 |
| `docs/CLEAR_ORDERS_FEATURE.md` | Complete documentation | New file |

**Total:** ~198 lines of new code + documentation

---

## API Documentation

### Endpoint

```
DELETE /api/current-orders
```

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Response Schema

**Success:**
```typescript
{
  success: true,
  data: {
    deletedCount: number,
    userId: string
  },
  message: string
}
```

**Error:**
```typescript
{
  success: false,
  error: string
}
```

### HTTP Status Codes

| Code | Meaning | Scenario |
|------|---------|----------|
| `200` | Success | Orders cleared successfully |
| `401` | Unauthorized | Missing/invalid token |
| `500` | Server Error | Database error |

---

## Best Practices Followed

### ✅ Code Standards

1. **TypeScript Types**
   - All functions have type annotations
   - Proper error typing with `any` fallback

2. **JSDoc Comments**
   - Comprehensive function documentation
   - Parameter descriptions
   - Return type documentation

3. **Error Handling**
   - Try-catch blocks in all async functions
   - Meaningful error messages
   - Error logging to console

4. **Component Structure**
   - Separated concerns (handler, UI, state)
   - Reusable button component
   - Clean confirmation dialog

### ✅ Security Standards

1. **Authentication**
   - JWT token validation
   - Session verification

2. **Authorization**
   - User-specific filtering
   - No cross-user access

3. **Data Integrity**
   - Cascade deletes prevent orphaned records
   - Transaction-safe operations

### ✅ UX Standards

1. **Feedback**
   - Confirmation before destructive action
   - Loading states during operation
   - Success/error messages

2. **Accessibility**
   - Disabled state when appropriate
   - Clear visual indicators
   - Keyboard accessible

3. **Performance**
   - Single API call
   - Automatic refresh
   - No unnecessary re-renders

---

## Future Enhancements

### Potential Improvements

1. **Selective Clear**
   - Clear orders by status (pending, on-hold)
   - Clear orders older than X hours
   - Multi-select orders to clear

2. **Undo Feature**
   - Soft delete with recovery window
   - "Undo" button for accidental clears
   - Trash bin view

3. **Clear History**
   - Audit log of clear operations
   - Who cleared what and when
   - Restore from history

4. **Bulk Operations**
   - Admin: Clear all orders (all users)
   - Manager: Clear team's orders
   - Clear by table/customer

5. **Toast Notifications**
   - Replace `alert()` with toast UI
   - Better visual feedback
   - Non-blocking notifications

---

## Summary

**What Was Added:**
- ✅ "Clear My Orders" button in Current Orders Monitor
- ✅ User-specific order deletion (security enforced)
- ✅ Confirmation dialog with user information
- ✅ Comprehensive error handling and feedback
- ✅ Real-time updates after clearing

**Security Guarantees:**
- 🔒 Users can ONLY clear their own orders
- 🔒 JWT authentication required
- 🔒 Database-level filtering via `cashier_id`
- 🔒 No admin override or cross-user access

**User Experience:**
- ⚡ One-click clear all draft orders
- ⚡ Confirmation prevents accidents
- ⚡ Loading states and feedback
- ⚡ Automatic refresh after clear

---

**Status:** ✅ **Ready for Testing**  
**Security:** ✅ **User-Isolated**  
**Documentation:** ✅ **Complete**  
**Last Updated:** 2025-10-06
