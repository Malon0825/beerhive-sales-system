-- Migration: Fix Circular Foreign Key Relationship for Order Sessions
-- Date: 2024-11-17
-- Issue: Multiple relationship error between order_sessions and restaurant_tables
-- 
-- Problem:
--   PostgREST/Supabase finds two relationships between order_sessions and restaurant_tables:
--   1. order_sessions.table_id → restaurant_tables.id (CORRECT - should exist)
--   2. restaurant_tables.current_session_id → order_sessions.id (creates circular reference)
--
-- Solution:
--   Remove the foreign key constraint on restaurant_tables.current_session_id
--   Keep the column as a simple UUID reference (no FK constraint)
--   This matches the pattern used for restaurant_tables.current_order_id
--   (see fix_circular_fk_orders_tables.sql from v1.0.0)
--
-- ============================================================================

-- Step 1: Check if the foreign key constraint exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'restaurant_tables_current_session_id_fkey'
    AND table_name = 'restaurant_tables'
  ) THEN
    -- Step 2: Drop the foreign key constraint
    ALTER TABLE restaurant_tables 
    DROP CONSTRAINT restaurant_tables_current_session_id_fkey;
    
    RAISE NOTICE 'Foreign key constraint restaurant_tables_current_session_id_fkey dropped successfully';
  ELSE
    RAISE NOTICE 'Foreign key constraint restaurant_tables_current_session_id_fkey does not exist';
  END IF;
END $$;

-- Step 3: Verify the column still exists (it should remain as a UUID field)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'restaurant_tables' 
    AND column_name = 'current_session_id'
  ) THEN
    RAISE NOTICE 'Column current_session_id exists and is available for use';
  ELSE
    RAISE WARNING 'Column current_session_id does not exist - this is unexpected!';
  END IF;
END $$;

-- Step 4: Add a comment to clarify the design decision
COMMENT ON COLUMN restaurant_tables.current_session_id IS 
  'UUID reference to the currently active session for this table. ' ||
  'Intentionally NOT a foreign key to avoid circular relationship issues with order_sessions.table_id. ' ||
  'Application code maintains referential integrity.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check remaining foreign keys between order_sessions and restaurant_tables
-- Should only show order_sessions.table_id → restaurant_tables.id
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (
    (tc.table_name = 'order_sessions' AND ccu.table_name = 'restaurant_tables')
    OR (tc.table_name = 'restaurant_tables' AND ccu.table_name = 'order_sessions')
  );

-- Expected result: Only one row showing order_sessions.table_id → restaurant_tables.id

-- ============================================================================
-- NOTES
-- ============================================================================

-- Why not use a foreign key on current_session_id?
-- 1. Creates circular dependency (order_sessions ↔ restaurant_tables)
-- 2. PostgREST/Supabase gets confused with multiple relationship paths (PGRST201 error)
-- 3. Causes issues with embedding/joins in API queries
-- 4. Follows the same pattern as current_order_id (see fix_circular_fk_orders_tables.sql)
--
-- How to maintain data integrity without FK?
-- 1. Application logic validates current_session_id references valid session
-- 2. Use triggers if strict enforcement needed (add separately if required)
-- 3. Regular data integrity checks in maintenance scripts
--
-- This is a common pattern for bidirectional relationships where one direction
-- needs to be "weak" to avoid circular constraints.
--
-- Impact:
-- - Removes ambiguity in PostgREST queries
-- - Allows implicit relationship syntax: table:restaurant_tables(...)
-- - Matches existing pattern for orders/tables relationship
-- - No data loss (column remains, only constraint removed)

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- If you need to re-add the foreign key (not recommended):
-- ALTER TABLE restaurant_tables 
-- ADD CONSTRAINT restaurant_tables_current_session_id_fkey 
-- FOREIGN KEY (current_session_id) REFERENCES order_sessions(id) ON DELETE SET NULL;

-- ============================================================================
-- RELATED MIGRATIONS
-- ============================================================================

-- migrations/release-v1.0.0/fix_circular_fk_orders_tables.sql
--   - Fixed the same issue for orders and restaurant_tables
--   - This migration follows the same pattern
--
-- migrations/release-v1.0.0/add_tab_system.sql
--   - Original migration that added current_session_id with FK constraint
--   - This migration removes that FK constraint to prevent circular reference
