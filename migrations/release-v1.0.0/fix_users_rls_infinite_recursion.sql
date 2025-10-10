-- Migration: Fix Infinite Recursion in Users RLS Policies
-- Date: 2025-10-07
-- Issue: RLS policy on users table causes infinite recursion
-- Error: "infinite recursion detected in policy for relation 'users'"
--
-- Problem:
--   The policy "Admins can manage all users" checks if a user is an admin by
--   querying the users table: SELECT FROM users WHERE id = auth.uid()
--   This creates infinite recursion because checking the policy requires
--   querying the same table that has the policy.
--
-- Solution:
--   1. Drop the problematic policies
--   2. Create a SECURITY DEFINER function to check user role (bypasses RLS)
--   3. Recreate policies using the helper function
--
-- ============================================================================

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;

-- Step 2: Create helper function to get current user's role (bypasses RLS)
-- Note: Using public schema instead of auth schema due to permissions
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Get role directly from users table bypassing RLS
  SELECT role INTO user_role_value
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_role_value;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.get_current_user_role() IS 
  'Returns the role of the currently authenticated user. ' ||
  'Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';

-- Step 3: Recreate RLS policies using the helper function

-- Policy 1: Users can view their own data
CREATE POLICY "Users can view their own data"
ON users
FOR SELECT
TO public
USING (auth.uid() = id);

-- Policy 2: Admins and Managers can view all users
CREATE POLICY "Admins and Managers can view all users"
ON users
FOR SELECT
TO public
USING (
  public.get_current_user_role() IN ('admin', 'manager')
);

-- Policy 3: Admins can manage all users (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage all users"
ON users
FOR ALL
TO public
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

-- Step 4: Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check all policies on users table
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'users';

-- 2. Test the helper function
-- SELECT public.get_current_user_role();

-- 3. Test querying users table (should not cause infinite recursion)
-- SELECT id, username, role FROM users WHERE id = auth.uid();

-- ============================================================================
-- NOTES
-- ============================================================================

-- Why SECURITY DEFINER?
-- - SECURITY DEFINER runs the function with the privileges of the function owner
-- - This bypasses RLS policies on the users table
-- - Prevents infinite recursion when checking user role
-- - Safe because it only returns the role, doesn't expose sensitive data

-- Policy Design:
-- 1. Regular users: Can only view their own record (id = auth.uid())
-- 2. Managers: Can view all users (for assignments, reports)
-- 3. Admins: Can view and modify all users (full management)

-- Important:
-- - The helper function is in the 'public' schema (auth schema requires special permissions)
-- - SET search_path prevents SQL injection attacks
-- - SECURITY DEFINER is safe here because the function is simple and controlled

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration:
-- DROP POLICY IF EXISTS "Users can view their own data" ON users;
-- DROP POLICY IF EXISTS "Admins and Managers can view all users" ON users;
-- DROP POLICY IF EXISTS "Admins can manage all users" ON users;
-- DROP FUNCTION IF EXISTS public.get_current_user_role();
-- 
-- Then restore original policies (but they will still have infinite recursion)
