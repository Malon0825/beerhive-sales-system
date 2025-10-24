-- Migration: Drop max_quantity_per_transaction from packages
-- Version: v1.0.2
-- Date: 2025-10-21
-- Purpose: Remove deprecated field that was never enforced; replaced by dynamic stock availability
-- Author: Software Engineer following cleanup requirements
-- Related: Unified Inventory System (UNIFIED_INVENTORY_STRATEGY.md)

-- ============================================================================
-- CONTEXT & RATIONALE
-- ============================================================================

/*
REASON FOR REMOVAL:
  The max_quantity_per_transaction field was designed to limit package quantities
  per order, but it was never enforced in the application logic.
  
  With the unified inventory system, package availability is now calculated
  dynamically based on component product stock levels using:
    max_sellable = floor(component_stock / quantity_per_package)
  
  This provides:
    ✅ Real-time accuracy based on actual inventory
    ✅ Automatic updates as stock changes
    ✅ No manual configuration needed
    ✅ Single source of truth (inventory, not arbitrary limits)
  
  The static limit field is:
    ❌ Never validated in CartContext
    ❌ Never checked during checkout
    ❌ Redundant with dynamic calculation
    ❌ Creates confusion with two different limits
    ❌ Violates Single Responsibility Principle

BUSINESS IMPACT:
  - No breaking changes (field was never enforced)
  - Simplifies package management
  - Reduces configuration complexity
  - Aligns with unified inventory strategy
*/

-- ============================================================================
-- STEP 1: Verify Current Usage (Safety Check)
-- ============================================================================

DO $$
DECLARE
    packages_count INTEGER;
    non_default_count INTEGER;
BEGIN
    -- Count total packages
    SELECT COUNT(*) INTO packages_count FROM packages;
    
    -- Count packages with non-default values (not 1)
    SELECT COUNT(*) INTO non_default_count 
    FROM packages 
    WHERE max_quantity_per_transaction IS NOT NULL 
      AND max_quantity_per_transaction != 1;
    
    RAISE NOTICE '📊 Pre-migration analysis:';
    RAISE NOTICE '  Total packages: %', packages_count;
    RAISE NOTICE '  Packages with custom limits: %', non_default_count;
    
    IF non_default_count > 0 THEN
        RAISE NOTICE '⚠️  Some packages have custom quantity limits set';
        RAISE NOTICE '   These limits were never enforced in the application';
        RAISE NOTICE '   Dynamic stock availability will now control limits';
    ELSE
        RAISE NOTICE '✅ All packages use default value (1) - safe to remove';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop the Column
-- ============================================================================

-- Remove the column from packages table
ALTER TABLE packages 
DROP COLUMN IF EXISTS max_quantity_per_transaction;

COMMENT ON TABLE packages IS 
'Package definitions with dynamic availability calculated from component stock levels';

RAISE NOTICE '✅ Column max_quantity_per_transaction dropped successfully';

-- ============================================================================
-- STEP 3: Verify Removal
-- ============================================================================

DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if column still exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'packages' 
          AND column_name = 'max_quantity_per_transaction'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE EXCEPTION '❌ Migration failed: Column still exists';
    ELSE
        RAISE NOTICE '✅ Verified: Column successfully removed from packages table';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Document New Approach
-- ============================================================================

COMMENT ON TABLE packages IS 
'Package definitions. Quantity limits are now dynamic based on component stock availability. 
See PackageAvailabilityService for real-time calculation: max_sellable = MIN(component_stock / quantity_per_package)';

-- ============================================================================
-- Migration Notes
-- ============================================================================

/*
POST-MIGRATION CHECKLIST:
  [x] Database column dropped
  [ ] TypeScript types updated (Package entity)
  [ ] UI forms updated (PackageForm.tsx)
  [ ] Display components updated (PackageList.tsx)
  [ ] Repository code cleaned (PackageRepository.ts)
  [ ] Documentation updated
  
ROLLBACK INSTRUCTIONS (if needed):
  If you need to restore this field:
  
  ALTER TABLE packages 
  ADD COLUMN max_quantity_per_transaction INTEGER DEFAULT 1 NOT NULL;
  
  COMMENT ON COLUMN packages.max_quantity_per_transaction IS 
  '(DEPRECATED) Static quantity limit - replaced by dynamic stock availability';
  
  Note: Rollback should only be done if business requirements change.
  The unified inventory system is the recommended approach.

TESTING RECOMMENDATIONS:
  1. Verify packages can still be created/edited
  2. Test package sales through POS
  3. Verify inventory deduction works correctly
  4. Check package availability calculations
  5. Ensure no UI errors from missing field
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================

RAISE NOTICE '🎉 Migration completed successfully';
RAISE NOTICE '📝 Next steps: Update application code to remove field references';
