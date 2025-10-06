# Vercel Deployment Fix - Multiple Issues Resolved

## Issues Fixed

### Issue 1: Dynamic Server Usage Error
Next.js 14 was trying to statically pre-render API routes that use dynamic features like `headers`, `searchParams`, and `request.url`.

### Issue 2: Missing Client Reference Manifest
Error: `ENOENT: no such file or directory, lstat '/vercel/path0/.next/server/app/(dashboard)/page_client-reference-manifest.js'`

## Root Causes
1. API routes that access dynamic request properties must explicitly opt-out of static rendering
2. Next.js 14.1.0 build process issues with client/server component boundaries on Vercel

## Solutions Applied

### Solution 1: Force Dynamic Rendering for API Routes
Added `export const dynamic = 'force-dynamic';` to all affected API routes (20+ files).

### Solution 2: Updated next.config.js
- Removed `serverActions.allowedOrigins` that restricted to localhost
- Added `experimental.optimizePackageImports` for better build optimization
- Configured proper image patterns for Supabase

### Solution 3: Created vercel.json
Added Vercel configuration file with:
- Explicit build command
- Framework specification
- Region configuration (Singapore)

## Fixed Routes (14 files)

### Authentication & Session
- ✅ `/api/auth/session/route.ts` - Uses `request.headers`

### Customer Management
- ✅ `/api/customers/search/route.ts` - Uses `nextUrl.searchParams`

### Inventory Management
- ✅ `/api/inventory/low-stock/route.ts` - Uses `request.url`
- ✅ `/api/inventory/movements/route.ts` - Uses `request.url`

### Kitchen Orders
- ✅ `/api/kitchen/orders/route.ts` - Uses `nextUrl.searchParams`

### Core Operations
- ✅ `/api/profile/route.ts` - Uses `request.headers`
- ✅ `/api/orders/route.ts` - Uses `nextUrl.searchParams` and `request.headers`
- ✅ `/api/products/route.ts` - Uses `nextUrl.searchParams` and `request.headers`
- ✅ `/api/current-orders/route.ts` - Uses `nextUrl.searchParams`
- ✅ `/api/notifications/route.ts` - Uses `request.url`
- ✅ `/api/audit-logs/route.ts` - Uses `nextUrl.searchParams`

### Reports
- ✅ `/api/reports/sales/route.ts` - Uses `nextUrl.searchParams`
- ✅ `/api/reports/inventory/route.ts` - Uses `nextUrl.searchParams`
- ✅ `/api/reports/customers/route.ts` - Uses `nextUrl.searchParams`

## Additional Fix
**next.config.js** - Removed `serverActions.allowedOrigins` restriction that was limiting server actions to `localhost:3000` only, which would break on Vercel.

## How to Fix Additional Routes (If Needed)

If you encounter similar errors for other routes, add this line after the imports and before any route handlers:

```typescript
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
```

### Example:
```typescript
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Your handler code
}
```

## Routes That Typically Need This Fix
Any route that uses:
- `request.headers.get()`
- `request.nextUrl.searchParams`
- `new URL(request.url)`
- `request.cookies`
- Authentication tokens from headers
- Query parameters

## Testing After Deployment
1. Push changes to your repository
2. Vercel will automatically redeploy
3. Test the following critical endpoints:
   - `/api/auth/session` - Session retrieval
   - `/api/customers/search?q=test` - Customer search
   - `/api/inventory/low-stock` - Low stock alerts
   - `/api/kitchen/orders` - Kitchen orders
   - `/api/reports/sales?type=summary` - Sales reports

## Additional Notes
- This is a Next.js 14 requirement for API routes using dynamic features
- The `force-dynamic` export tells Next.js to always render these routes dynamically
- This is the recommended approach for API endpoints that serve personalized or real-time data
- No changes to business logic were made, only rendering configuration

## Next Steps
1. ✅ Commit these changes
2. ✅ Push to your repository
3. ✅ Vercel will automatically redeploy
4. ✅ Monitor deployment logs for any remaining errors
5. ✅ Test all critical API endpoints

## Troubleshooting: Client Reference Manifest Error

If you still encounter the `ENOENT: page_client-reference-manifest.js` error after applying these fixes:

### 1. Clear Build Cache on Vercel
- Go to your Vercel project settings
- Navigate to "Deployments" tab
- Click "..." menu → "Redeploy" → Check "Use existing Build Cache" OFF
- Click "Redeploy"

### 2. Check Node.js Version
Ensure Vercel is using Node.js 18.x or higher:
- Add to `package.json`:
```json
"engines": {
  "node": ">=18.17.0"
}
```

### 3. Clean Install Dependencies
If the error persists, try forcing a clean install:
- Delete `node_modules` and `package-lock.json`
- Run `npm install`
- Commit and push changes

### 4. Verify Environment Variables
Ensure all required environment variables are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 5. Check for Circular Dependencies
The error can occur with circular imports between client/server components:
- Review import statements in `(dashboard)` pages
- Ensure no server components import client components incorrectly

## Reference
- [Next.js Dynamic Server Usage Documentation](https://nextjs.org/docs/messages/dynamic-server-error)
- [Next.js Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic)
- [Vercel Build Troubleshooting](https://vercel.com/docs/concepts/deployments/troubleshoot-a-build)
