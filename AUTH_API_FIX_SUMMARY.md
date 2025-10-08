# Authentication API Fix Summary

## Problem
API endpoints were returning **401 Authentication required** errors even after successful login. The issue occurred because frontend code was making API calls without including the required `Authorization: Bearer <token>` header.

## Root Cause
- API routes use `requireAuth()` and `requireRole()` functions that expect an `Authorization: Bearer <token>` header
- Frontend components were using plain `fetch()` calls without authentication headers
- Only the `AuthService.getCurrentUser()` method was correctly including the auth header

## Solution

### 1. Created API Client Utility (`src/lib/utils/apiClient.ts`)
A centralized utility that automatically adds authentication headers to all API requests:

```typescript
// Helper functions that automatically include Bearer token
- fetchWithAuth(url, options) - Base authenticated fetch
- apiGet(url, options) - Authenticated GET request
- apiPost(url, data, options) - Authenticated POST request
- apiPatch(url, data, options) - Authenticated PATCH request
- apiPut(url, data, options) - Authenticated PUT request
- apiDelete(url, options) - Authenticated DELETE request
```

**Key Features:**
- Automatically retrieves the access token from Supabase session
- Includes `Authorization: Bearer <token>` header in all requests
- Auto-sets `Content-Type: application/json` for requests with body
- Throws errors with meaningful messages on failure
- Simplifies error handling with parsed JSON responses

### 2. Updated Component Files
Refactored components to use the new `apiClient` instead of plain `fetch()`:

#### Files Updated:
1. **src/views/tables/TableGrid.tsx**
   - Replaced `fetch()` calls with `apiPatch()` and `apiPost()`
   - Actions: reserve, occupy, release, mark cleaned, deactivate, reactivate, create table

2. **src/views/pos/TableSelector.tsx**
   - Replaced `fetch()` call with `apiGet()`
   - Fetching tables for POS table selection

### 3. Fixed Missing UI Components
- Created `src/views/shared/ui/radio-group.tsx` component (required by CloseTabModal)
- Installed missing package: `@radix-ui/react-radio-group`
- Updated all imports from `@/components/ui/*` to `@/views/shared/ui/*`
- Created `src/lib/utils/index.ts` and `src/lib/utils/formatters/index.ts` for proper module exports

### 4. Files Fixed
- `src/views/orders/ActiveTabsDashboard.tsx` - Fixed UI component imports
- `src/views/orders/BillPreviewModal.tsx` - Fixed UI component imports
- `src/views/orders/CloseTabModal.tsx` - Fixed UI component imports + added RadioGroup
- `src/views/pos/SessionOrderFlow.tsx` - Fixed UI component imports
- `src/views/pos/SessionSelector.tsx` - Fixed UI component imports
- `src/views/pos/OpenTabButton.tsx` - Fixed UI component imports
- `src/app/(dashboard)/order-sessions/[sessionId]/page.tsx` - Fixed UI component imports

## Usage Example

### Before (❌ No Authentication):
```typescript
const response = await fetch('/api/tables', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(tableData),
});
const data = await response.json();
```

### After (✅ Authenticated):
```typescript
import { apiPost } from '@/lib/utils/apiClient';

const data = await apiPost('/api/tables', tableData);
```

## Benefits
1. **Automatic Authentication** - All API calls are automatically authenticated
2. **Simplified Code** - Less boilerplate for API requests
3. **Consistent Error Handling** - Standardized error responses
4. **Type Safety** - Generic TypeScript support for responses
5. **Maintainability** - Single source of truth for API authentication logic

## Testing Checklist
- [x] Login functionality works
- [ ] Tables API (GET) returns 200 instead of 401
- [ ] Tables API (POST) creates new table successfully
- [ ] Table status updates (PATCH) work correctly
- [ ] Order sessions API calls are authenticated
- [ ] All other API endpoints work with authentication

## Notes
- The apiClient automatically retrieves the session token from Supabase
- If no session exists, requests will still be made but may return 401
- Frontend should handle 401 errors by redirecting to login
- Session is managed by `AuthContext` and `SessionService`

## Next Steps
Any remaining components that make API calls should be updated to use `apiClient`:
- Search for: `fetch('/api/` in the codebase
- Replace with appropriate `apiGet/apiPost/apiPatch/apiDelete` function
- Import from `@/lib/utils/apiClient`
