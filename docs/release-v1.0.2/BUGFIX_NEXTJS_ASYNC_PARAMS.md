# Bugfix: Next.js 15+ Async Params Error

## Issue
Routes with dynamic parameters were throwing errors:
```
Error: Route "/api/inventory/package-impact/[productId]" used `params.productId`. 
`params` should be awaited before using its properties.
```

## Root Cause
Next.js 15 changed the behavior of route parameters in dynamic routes. The `params` object is now a Promise and must be awaited before accessing its properties.

## Solution
Updated all dynamic API routes to await params before accessing properties:

**Before:**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id; // ❌ Error in Next.js 15+
}
```

**After:**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅ Correct
}
```

## Files Modified

### 1. `/api/inventory/package-impact/[productId]/route.ts`
- Fixed GET handler

### 2. `/api/categories/[id]/route.ts`
- Fixed GET handler
- Fixed PUT handler
- Fixed DELETE handler

### 3. `/api/kitchen/orders/[orderId]/delete/route.ts`
- Fixed DELETE handler

### 4. `/api/order-sessions/[sessionId]/change-table/route.ts`
- Fixed PATCH handler

### 5. `/api/packages/[packageId]/availability/route.ts`
- Fixed GET handler

## Impact
- **Breaking Change**: None (backward compatible fix)
- **Performance**: No impact (minimal async overhead)
- **User Experience**: Eliminates console errors and ensures route handlers work correctly

## Testing
1. Monitor console for async params warnings
2. Test all affected API endpoints
3. Verify dynamic routes respond correctly

## Related
- Next.js Documentation: https://nextjs.org/docs/messages/sync-dynamic-apis
- Next.js 15 Migration Guide
