-- Migration: Add Multiple Roles Support
-- Date: 2025-10-05
-- Description: Convert single role to multiple roles array to support users with multiple job functions
-- Example: A bartender who also works in kitchen can have roles ['bartender', 'kitchen']

-- ============================================================================
-- STEP 1: Add new roles column (array type)
-- ============================================================================

-- Add new column for role array (temporarily nullable)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS roles text[];

-- ============================================================================
-- STEP 2: Migrate existing single role to array
-- ============================================================================

-- Copy existing role to roles array (convert single value to array)
UPDATE users 
SET roles = ARRAY[role::text]
WHERE roles IS NULL;

-- ============================================================================
-- STEP 3: Add constraints and indexes
-- ============================================================================

-- Ensure roles array is not empty
ALTER TABLE users 
ADD CONSTRAINT users_roles_not_empty 
CHECK (array_length(roles, 1) > 0);

-- Ensure all roles in array are valid
ALTER TABLE users
ADD CONSTRAINT users_roles_valid
CHECK (
  roles <@ ARRAY['admin', 'manager', 'cashier', 'kitchen', 'bartender', 'waiter']::text[]
);

-- Ensure no duplicate roles in array
ALTER TABLE users
ADD CONSTRAINT users_roles_unique
CHECK (
  array_length(roles, 1) = (SELECT COUNT(DISTINCT r) FROM unnest(roles) AS r)
);

-- Create GIN index for efficient role array queries
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);

-- ============================================================================
-- STEP 4: Keep old role column for backward compatibility (optional)
-- ============================================================================

-- Keep the old 'role' column but make it a computed column showing primary role
-- Primary role = first role in the array
UPDATE users 
SET role = roles[1]::user_role;

-- Add comment explaining the relationship
COMMENT ON COLUMN users.role IS 'Primary role (first role in roles array) - kept for backward compatibility';
COMMENT ON COLUMN users.roles IS 'Array of all roles assigned to user. First role is primary/default role.';

-- ============================================================================
-- STEP 5: Create helper function to check if user has role
-- ============================================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(user_roles text[], check_role text)
RETURNS boolean AS $$
BEGIN
  RETURN check_role = ANY(user_roles);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Example usage: SELECT * FROM users WHERE user_has_role(roles, 'bartender');

-- ============================================================================
-- STEP 6: Create helper function to get users by role
-- ============================================================================

-- Function to get all users with a specific role
CREATE OR REPLACE FUNCTION get_users_with_role(role_name text)
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  full_name text,
  roles text[],
  is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.roles,
    u.is_active
  FROM users u
  WHERE role_name = ANY(u.roles);
END;
$$ LANGUAGE plpgsql STABLE;

-- Example usage: SELECT * FROM get_users_with_role('kitchen');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify migration success
-- Run these queries after migration to ensure everything worked correctly

-- 1. Check all users have roles array
-- SELECT username, role, roles FROM users;

-- 2. Check for any invalid roles
-- SELECT username, roles FROM users 
-- WHERE NOT (roles <@ ARRAY['admin', 'manager', 'cashier', 'kitchen', 'bartender', 'waiter']::text[]);

-- 3. Check for duplicate roles in any user
-- SELECT username, roles, array_length(roles, 1) as role_count 
-- FROM users 
-- WHERE array_length(roles, 1) != (SELECT COUNT(DISTINCT r) FROM unnest(roles) AS r);

-- 4. Test helper functions
-- SELECT user_has_role(ARRAY['bartender', 'kitchen']::text[], 'kitchen'); -- should return true
-- SELECT * FROM get_users_with_role('bartender');

-- ============================================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================================

-- If you need to rollback this migration, run:
-- DROP INDEX IF EXISTS idx_users_roles;
-- DROP FUNCTION IF EXISTS user_has_role(text[], text);
-- DROP FUNCTION IF EXISTS get_users_with_role(text);
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_roles_not_empty;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_roles_valid;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_roles_unique;
-- ALTER TABLE users DROP COLUMN IF EXISTS roles;

-- ============================================================================
-- EXAMPLE: Adding multiple roles to a user
-- ============================================================================

-- Example 1: Bartender who also works in kitchen
-- UPDATE users 
-- SET roles = ARRAY['bartender', 'kitchen']::text[]
-- WHERE username = 'john_bartender';

-- Example 2: Cashier who is also a waiter
-- UPDATE users
-- SET roles = ARRAY['cashier', 'waiter']::text[]
-- WHERE username = 'sarah_cashier';

-- Example 3: Keep single role (kitchen only)
-- UPDATE users
-- SET roles = ARRAY['kitchen']::text[]
-- WHERE username = 'kitchen_staff';

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. First role in array is considered PRIMARY role (used for default routing)
-- 2. Users can have multiple roles except Admin and Manager (business rule in application)
-- 3. The old 'role' column is kept and synced with first role in 'roles' array
-- 4. Access control checks if ANY of user's roles matches required role
-- 5. GIN index enables fast queries like: WHERE 'kitchen' = ANY(roles)
