-- Migration: Fix Circular Foreign Key Relationship
-- Date: 2025-10-07
-- Issue: Multiple relationship error between orders and restaurant_tables
-- 
-- Problem:
--   PostgREST/Supabase finds two relationships between orders and restaurant_tables:
--   1. orders.table_id → restaurant_tables.id (CORRECT - should exist)
--   2. restaurant_tables.current_order_id → orders.id (WRONG - creates circular reference)
--
-- Solution:
--   Remove the foreign key constraint on restaurant_tables.current_order_id
--   Keep the column as a simple UUID reference (no FK constraint)
--   This matches the original Database Structure.sql design which says:
--   "Reference to active order (will be added as FK later)"
--
-- ============================================================================

-- Step 1: Check if the foreign key constraint exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'restaurant_tables_current_order_id_fkey'
    AND table_name = 'restaurant_tables'
  ) THEN
    -- Step 2: Drop the foreign key constraint
    ALTER TABLE restaurant_tables 
    DROP CONSTRAINT restaurant_tables_current_order_id_fkey;
    
    RAISE NOTICE 'Foreign key constraint restaurant_tables_current_order_id_fkey dropped successfully';
  ELSE
    RAISE NOTICE 'Foreign key constraint restaurant_tables_current_order_id_fkey does not exist';
  END IF;
END $$;

-- Step 3: Verify the column still exists (it should remain as a UUID field)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'restaurant_tables' 
    AND column_name = 'current_order_id'
  ) THEN
    RAISE NOTICE 'Column current_order_id exists and is available for use';
  ELSE
    RAISE WARNING 'Column current_order_id does not exist - this is unexpected!';
  END IF;
END $$;

-- Step 4: Add a comment to clarify the design decision
COMMENT ON COLUMN restaurant_tables.current_order_id IS 
  'UUID reference to the currently active order for this table. ' ||
  'Intentionally NOT a foreign key to avoid circular relationship issues. ' ||
  'Application code should maintain referential integrity.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check remaining foreign keys between orders and restaurant_tables
-- Should only show orders.table_id → restaurant_tables.id
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
    (tc.table_name = 'orders' AND ccu.table_name = 'restaurant_tables')
    OR (tc.table_name = 'restaurant_tables' AND ccu.table_name = 'orders')
  );

-- Expected result: Only one row showing orders.table_id → restaurant_tables.id

-- ============================================================================
-- NOTES
-- ============================================================================

-- Why not use a foreign key on current_order_id?
-- 1. Creates circular dependency (orders ↔ restaurant_tables)
-- 2. PostgREST/Supabase gets confused with multiple relationship paths
-- 3. Can cause issues with embedding/joins in API queries
-- 4. Original design explicitly avoided this (see Database Structure.sql line 91)
--
-- How to maintain data integrity without FK?
-- 1. Application logic validates current_order_id references valid order
-- 2. Use triggers if strict enforcement needed (add separately if required)
-- 3. Regular data integrity checks in maintenance scripts
--
-- This is a common pattern for bidirectional relationships where one direction
-- needs to be "weak" to avoid circular constraints.

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- If you need to re-add the foreign key (not recommended):
-- ALTER TABLE restaurant_tables 
-- ADD CONSTRAINT restaurant_tables_current_order_id_fkey 
-- FOREIGN KEY (current_order_id) REFERENCES orders(id) ON DELETE SET NULL;
