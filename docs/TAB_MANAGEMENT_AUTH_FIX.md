# Tab Management Authentication Fix

**Date**: October 8, 2025  
**Status**: ✅ Fixed  
**Issue**: Authentication required error (401) in tab management module

---

## Problem Summary

The Tab Management module was experiencing authentication errors when trying to fetch tables and order sessions:

```
GET /api/tables error: Error [AppError]: Authentication required
    at requireAuth (src\lib\utils\api-auth.ts:70:11)
    at async requireRole (src\lib\utils\api-auth.ts:87:16)
    at async GET (src\app\api\tables\route.ts:22:5)
```

### Symptoms
- ❌ 401 Authentication required error
- ❌ Tables not showing in the grid view
- ❌ Active tabs visible in upper portion but no table data

---

## Root Cause

The `TabManagementDashboard` and `ActiveTabsDashboard` components were using plain `fetch()` API calls **without including authentication headers**.

### Problem Code
```typescript
// ❌ BEFORE - No authentication header
const response = await fetch('/api/tables');
const data = await response.json();
```

The API routes require authentication via Bearer token in the `Authorization` header:

```typescript
// API route expects this
await requireRole(request, [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER]);
```

---

## Solution

Updated both components to use the **authenticated API client** (`apiClient.ts`) which automatically includes the Bearer token from the current Supabase session.

### Fixed Code
```typescript
// ✅ AFTER - Includes authentication automatically
import { apiGet, apiPost } from '@/lib/utils/apiClient';

const data = await apiGet('/api/tables');
```

---

## Changes Made

### 1. TabManagementDashboard.tsx
**File**: `src/views/tabs/TabManagementDashboard.tsx`

#### Changes:
- ✅ Added import for `apiGet` and `apiPost`
- ✅ Updated `fetchTables()` to use `apiGet`
- ✅ Updated `fetchSessions()` to use `apiGet`
- ✅ Updated `handleConfirmOpenTab()` to use `apiPost`
- ✅ Added JSDoc comments explaining authentication

```typescript
// Import authenticated API client
import { apiGet, apiPost } from '@/lib/utils/apiClient';

// Updated fetch functions
const fetchTables = useCallback(async () => {
  try {
    const data = await apiGet('/api/tables');
    if (data.success) {
      setTables(data.data || []);
    }
  } catch (error) {
    console.error('Failed to fetch tables:', error);
  }
}, []);

const fetchSessions = useCallback(async () => {
  try {
    const data = await apiGet('/api/order-sessions');
    if (data.success) {
      setSessions(data.data || []);
    }
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
  } finally {
    setLoading(false);
  }
}, []);
```

---

### 2. ActiveTabsDashboard.tsx
**File**: `src/views/orders/ActiveTabsDashboard.tsx`

#### Changes:
- ✅ Added import for `apiGet`
- ✅ Updated `fetchActiveTabs()` to use `apiGet`
- ✅ Added JSDoc comments explaining authentication

```typescript
// Import authenticated API client
import { apiGet } from '@/lib/utils/apiClient';

// Updated fetch function
const fetchActiveTabs = async () => {
  try {
    const data = await apiGet('/api/order-sessions');
    if (data.success) {
      setSessions(data.data || []);
    }
  } catch (error) {
    console.error('Failed to fetch active tabs:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## How the Fix Works

### API Client Utility (`apiClient.ts`)

The `apiClient.ts` utility provides authenticated fetch functions:

```typescript
/**
 * Get the current session access token
 */
async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make an authenticated fetch request
 * Automatically includes Authorization header with Bearer token
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  
  const headers = new Headers(options.headers);
  
  // Add Authorization header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
```

### Request Flow

1. **Client Component** calls `apiGet('/api/tables')`
2. **apiClient** gets the current Supabase session token
3. **apiClient** adds `Authorization: Bearer <token>` header
4. **API Route** receives request with auth header
5. **api-auth.ts** validates token using `requireRole()`
6. **API Route** returns data if authorized

---

## Testing

### Test Steps

1. **Login** to the system with any staff role (cashier, manager, admin, waiter)
2. **Navigate** to "Tab Management" from the sidebar
3. **Verify** tables are displayed in the grid
4. **Check** that active tabs show correctly
5. **Test** opening a new tab on an available table
6. **Test** adding orders to an active tab

### Expected Results

✅ No authentication errors in console  
✅ Tables display correctly in grid view  
✅ Active tabs show with their data  
✅ Statistics cards show correct numbers  
✅ All actions (open tab, add order, view bill, close tab) work  

---

## Prevention

### Best Practices

To prevent this issue in the future:

1. **Always use apiClient** for API calls in client components:
   ```typescript
   // ✅ Good
   import { apiGet, apiPost } from '@/lib/utils/apiClient';
   const data = await apiGet('/api/endpoint');
   
   // ❌ Bad
   const response = await fetch('/api/endpoint');
   ```

2. **Check API route requirements** before implementing client calls

3. **Test authentication** during development

4. **Review similar components** for consistency

---

## Related Files

### Modified Files
- `src/views/tabs/TabManagementDashboard.tsx`
- `src/views/orders/ActiveTabsDashboard.tsx`

### Reference Files
- `src/lib/utils/apiClient.ts` - Authenticated API client
- `src/lib/utils/api-auth.ts` - Server-side auth utilities
- `src/app/api/tables/route.ts` - Tables API route
- `src/app/api/order-sessions/route.ts` - Sessions API route

---

## Additional Notes

### API Authentication Requirements

The following API routes require authentication:

| Endpoint | Method | Required Roles |
|----------|--------|----------------|
| `/api/tables` | GET | Admin, Manager, Cashier, Waiter |
| `/api/tables` | POST | Admin, Manager |
| `/api/order-sessions` | GET | Admin, Manager, Cashier |
| `/api/order-sessions` | POST | Admin, Manager, Cashier |

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Client Component (TabManagementDashboard)                  │
│  - Calls apiGet('/api/tables')                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  apiClient.ts                                               │
│  - Gets session token from Supabase                         │
│  - Adds Authorization: Bearer <token> header                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  API Route (/api/tables/route.ts)                          │
│  - Receives request with auth header                        │
│  - Calls requireRole() to validate                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  api-auth.ts                                                │
│  - Extracts token from Authorization header                 │
│  - Validates token with Supabase                            │
│  - Gets user from database                                  │
│  - Checks user role                                         │
│  - Returns user or throws AppError                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

The authentication error in the Tab Management module has been **completely resolved** by updating the components to use the authenticated API client. This ensures all API calls include the necessary Bearer token for authentication.

**Result**: ✅ Tab Management now works correctly with proper authentication

---

**Fixed By**: Expert Software Developer  
**Date**: October 8, 2025  
**Status**: ✅ Complete
