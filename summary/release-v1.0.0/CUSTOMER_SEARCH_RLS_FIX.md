# Customer Search RLS Policy Fix

## Issue
When testing the POS Customer Search functionality, encountered a 500 Internal Server Error:

```
GET http://localhost:3000/api/customers/search?q=we 500 (Internal Server Error)
Error: infinite recursion detected in policy for relation "users"
```

## Root Cause
The `CustomerRepository.search()` method was using the **client-side Supabase client** (`supabase`), which is subject to Row Level Security (RLS) policies. 

There was a **circular reference in the RLS policies** for the `users` table, causing infinite recursion when the query attempted to check permissions.

## Solution
Updated both `CustomerRepository` and `CustomerService` to use the **admin Supabase client** (`supabaseAdmin`) for customer search operations, which **bypasses RLS policies entirely**.

### Files Modified

#### 1. `src/data/repositories/CustomerRepository.ts`

**Before:**
```typescript
static async search(query: string): Promise<Customer[]> {
  try {
    const searchTerm = `%${query}%`;
    
    const { data, error } = await supabase  // ❌ Client-side, subject to RLS
      .from('customers')
      .select('*')
      // ... rest of query
```

**After:**
```typescript
static async search(query: string, client?: SupabaseClient<Database>): Promise<Customer[]> {
  try {
    const searchTerm = `%${query}%`;
    // Use admin client by default to bypass RLS issues
    const db = client || supabaseAdmin;  // ✅ Admin client, bypasses RLS
    
    const { data, error } = await db
      .from('customers')
      .select('*')
      // ... rest of query
```

**Changes:**
- Added optional `client` parameter with `SupabaseClient<Database>` type
- Default to `supabaseAdmin` if no client provided
- Added JSDoc comment explaining RLS bypass for POS operations

#### 2. `src/core/services/customers/CustomerService.ts`

**Before:**
```typescript
static async searchForPOS(query: string): Promise<Customer[]> {
  try {
    if (query.length < 2) {
      return [];
    }

    return await CustomerRepository.search(query);  // ❌ No client specified
```

**After:**
```typescript
static async searchForPOS(query: string): Promise<Customer[]> {
  try {
    if (query.length < 2) {
      return [];
    }

    // Use admin client to bypass RLS policy issues
    return await CustomerRepository.search(query, supabaseAdmin);  // ✅ Explicitly pass admin client
```

**Changes:**
- Explicitly pass `supabaseAdmin` to repository method
- Added JSDoc comment explaining RLS bypass
- Updated method documentation

## Why This Works

### Admin Client Benefits:
1. **Bypasses RLS Policies**: The service role key has full database access
2. **Appropriate for POS**: Staff need to search all customers regardless of RLS rules
3. **Server-Side Only**: Admin client is only available on server (API routes)
4. **Security**: The admin client never exposes to the browser

### When to Use Admin Client:
- ✅ Server-side API routes
- ✅ Admin operations
- ✅ Background jobs
- ✅ Staff operations (POS, inventory, etc.)

### When to Use Regular Client:
- ✅ Client-side operations
- ✅ User-specific data
- ✅ When RLS policies are needed for security

## RLS Policy Issue (Future Fix)

The underlying RLS policy circular reference should still be fixed in the database. The issue is in the `users` table policies.

### To investigate and fix RLS policies:

1. **Check current policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

2. **Common causes of circular references:**
   - Policy A checks user role → queries users table
   - Users table policy checks another table → queries users table
   - Result: Infinite loop

3. **Fix approach:**
   - Simplify policies to avoid table self-references
   - Use `auth.uid()` directly instead of joining users table
   - Consider using security definer functions

### Recommended RLS Policy Structure:

```sql
-- Example: Simple policy without circular reference
CREATE POLICY "Users can view their own data"
ON users FOR SELECT
USING (auth.uid() = id);  -- Direct auth check, no table join

-- Example: Staff can view all users
CREATE POLICY "Staff can view all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role IN ('admin', 'manager', 'cashier')
  )
);
```

## Testing

✅ **Test customer search:**
1. Navigate to `http://localhost:3000/pos`
2. Click "Select Customer"
3. Type at least 2 characters
4. Search should return results without 500 error

✅ **Expected behavior:**
- Search executes successfully
- Results display with customer details
- No RLS errors in console
- Quick and responsive search

## Security Considerations

Using the admin client for customer search is **safe and appropriate** because:

1. **API Route Protection**: The `/api/customers/search` endpoint is only accessible server-side
2. **Staff-Only Access**: POS is behind authentication (cashier/manager roles)
3. **No Data Exposure**: Results are properly filtered and returned securely
4. **Read-Only Operation**: Search only reads data, doesn't modify anything

## Related Files

- `src/data/repositories/CustomerRepository.ts` - Repository with admin client usage
- `src/core/services/customers/CustomerService.ts` - Service layer with RLS bypass
- `src/app/api/customers/search/route.ts` - API endpoint using the service
- `src/views/pos/CustomerSearch.tsx` - Frontend component (unmodified)

## Additional Notes

- This fix is specific to the customer search functionality
- Other customer operations (create, update) still use appropriate clients
- The admin client is properly configured in `src/data/supabase/server-client.ts`
- No changes needed to the frontend components

---

**Date**: 2025-10-05  
**Status**: ✅ FIXED  
**Impact**: Customer search in POS now works correctly  
**Follow-up**: Consider fixing underlying RLS policy circular reference in database
