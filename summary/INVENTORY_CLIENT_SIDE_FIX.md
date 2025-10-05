# Inventory Client-Side Error Fix

## Issue
**Error:** `Uncaught (in promise) Error: Missing Supabase server environment variables`

**Root Cause:** Client component `LowStockAlert.tsx` was importing server-side service `LowStockAlert` service, which imported `InventoryRepository`, which imported the server-side Supabase client (`server-client.ts`). Server-side Supabase client requires `SUPABASE_SERVICE_ROLE_KEY` environment variable which is not available in the browser.

**Error Chain:**
```
LowStockAlert.tsx (client) 
  → LowStockAlert service 
    → InventoryRepository 
      → server-client.ts (requires SUPABASE_SERVICE_ROLE_KEY)
```

## Solution

### 1. Created Client-Safe Utility Functions
**File:** `src/core/utils/inventory/stockAlertUtils.ts`

Created pure utility functions that can be safely used in both client and server components:
- `calculateUrgency()` - Calculate urgency score (0-100)
- `getUrgencyColor()` - Get color for UI display
- `getUrgencyLabel()` - Get human-readable urgency label
- `estimateDaysOfStock()` - Estimate remaining days of stock
- `needsReorder()` - Check if reorder is needed
- `shouldNotify()` - Determine if notification should be sent
- `getStockStatus()` - Get stock status badge variant

### 2. Updated Client Component
**File:** `src/views/inventory/LowStockAlert.tsx`

**Before:**
```typescript
import { LowStockAlert as LowStockAlertService } from '@/core/services/inventory/LowStockAlert';

// Inside AlertCard component
const urgencyColor = LowStockAlertService.getUrgencyColor(alert.urgency);
const urgencyLabel = LowStockAlertService.getUrgencyLabel(alert.urgency);
```

**After:**
```typescript
import { getUrgencyColor, getUrgencyLabel } from '@/core/utils/inventory/stockAlertUtils';

// Inside AlertCard component
const urgencyColor = getUrgencyColor(alert.urgency);
const urgencyLabel = getUrgencyLabel(alert.urgency);
```

### 3. Added Documentation
Added comprehensive JSDoc comments to all utility functions and components.

## Architecture Pattern

### Proper Separation
```
┌─────────────────────────────────────────┐
│   Client Components (Browser)           │
│   - Use utility functions only          │
│   - Fetch data via API routes          │
│   - No direct DB access                 │
└────────────┬────────────────────────────┘
             │ API Calls
             ↓
┌─────────────────────────────────────────┐
│   API Routes (Server)                   │
│   - Use services & repositories         │
│   - Access database via Supabase        │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│   Services & Repositories               │
│   - Server-side only                    │
│   - Use server Supabase client          │
└─────────────────────────────────────────┘
```

### File Types
- **Utilities** (`/core/utils/`) - Pure functions, client-safe
- **Services** (`/core/services/`) - Business logic, may use repositories (server-side)
- **Repositories** (`/data/repositories/`) - Data access, use server Supabase client (server-side)
- **Client Components** (`/views/`) - UI components, use utilities & API calls only
- **API Routes** (`/app/api/`) - Server endpoints, can use services & repositories

## Key Principles

1. **Client components should:**
   - Use utility functions for calculations/formatting
   - Fetch data via API routes
   - Never import repositories or server-side services directly

2. **Server-side code should:**
   - Use the server Supabase client
   - Be kept in API routes, services, and repositories
   - Not be imported by client components

3. **Utility functions should:**
   - Be pure functions without side effects
   - Not access database or external services
   - Be safe for both client and server usage

## Files Modified

1. ✅ Created: `src/core/utils/inventory/stockAlertUtils.ts`
2. ✅ Modified: `src/views/inventory/LowStockAlert.tsx`

## Files NOT Modified (Already Correct)

- `src/core/services/inventory/InventoryService.ts` - Already contains only pure utility functions
- `src/core/services/inventory/LowStockAlert.ts` - Server-side only, used by API routes
- `src/data/repositories/InventoryRepository.ts` - Server-side only, properly documented
- `src/app/api/inventory/low-stock/route.ts` - Server-side API route, correctly uses services

## Testing

To verify the fix:
1. Navigate to `/inventory` page
2. Check browser console for errors
3. Verify low stock alerts display correctly
4. Ensure no "Missing Supabase server environment variables" error

## Future Recommendations

1. **Naming Convention:** Consider adding suffix to distinguish server-side services:
   - Server-side: `LowStockAlertService` → `LowStockAlertServerService`
   - Utilities: Keep as simple functions in utils folder

2. **ESLint Rule:** Add custom ESLint rule to prevent client components from importing from:
   - `/data/repositories/`
   - `/data/supabase/server-client.ts`
   - Server-side services

3. **Code Review Checklist:**
   - ✅ Client component imports only from utils, not services/repositories
   - ✅ All data fetching in client components uses API routes
   - ✅ Server-side code uses server Supabase client
   - ✅ Utilities are pure functions without side effects

## Date
Fixed: 2025-10-05
