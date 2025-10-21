-- Migration: Add Package Inventory Indexes
-- Version: v1.1.0
-- Date: 2025-10-20
-- Purpose: Optimize package availability calculations and inventory queries
-- Author: AI Implementation following SOLID principles

-- ============================================================================
-- Index 1: Package Items by Product ID
-- Purpose: Speed up queries to find which packages contain a specific product
-- Used by: PackageAvailabilityService.getPackagesUsingProduct()
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_package_items_product_id 
ON package_items(product_id)
WHERE product_id IS NOT NULL;

COMMENT ON INDEX idx_package_items_product_id IS 
'Speeds up reverse lookup: find all packages containing a specific product';

-- ============================================================================
-- Index 2: Package Items Composite (Package + Product)
-- Purpose: Optimize availability calculations for package components
-- Used by: PackageAvailabilityService.calculatePackageAvailability()
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_package_items_package_product 
ON package_items(package_id, product_id)
WHERE package_id IS NOT NULL AND product_id IS NOT NULL;

COMMENT ON INDEX idx_package_items_package_product IS 
'Composite index for fast package component lookups during availability calculations';

-- ============================================================================
-- Index 3: Order Items by Created Date
-- Purpose: Speed up sales analysis queries for reorder recommendations
-- Used by: InventoryReportService.getSmartReorderRecommendations()
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_order_items_created_at 
ON order_items(created_at DESC)
WHERE created_at IS NOT NULL;

COMMENT ON INDEX idx_order_items_created_at IS 
'Optimizes time-based sales queries for inventory consumption analysis';

-- ============================================================================
-- Index 4: Order Items by Package ID (for package sales tracking)
-- Purpose: Speed up queries analyzing package sales history
-- Used by: InventoryReportService.getPackageSalesWithComponents()
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_order_items_package_id 
ON order_items(package_id)
WHERE package_id IS NOT NULL;

COMMENT ON INDEX idx_order_items_package_id IS 
'Enables fast filtering of package sales for consumption analysis';

-- ============================================================================
-- Index 5: Products by Active Status and Stock Level
-- Purpose: Optimize low stock and availability queries
-- Used by: LowStockAlert and Inventory Dashboard queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_active_stock 
ON products(is_active, current_stock)
WHERE is_active = true;

COMMENT ON INDEX idx_products_active_stock IS 
'Speeds up active product queries filtered by stock levels';

-- ============================================================================
-- Verify Indexes Created
-- ============================================================================
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE indexname IN (
        'idx_package_items_product_id',
        'idx_package_items_package_product',
        'idx_order_items_created_at',
        'idx_order_items_package_id',
        'idx_products_active_stock'
    );
    
    RAISE NOTICE 'Package Inventory Indexes: % of 5 indexes created successfully', index_count;
    
    IF index_count = 5 THEN
        RAISE NOTICE '✅ All package inventory indexes created successfully';
    ELSE
        RAISE WARNING '⚠️  Only % indexes created. Expected 5.', index_count;
    END IF;
END $$;

-- ============================================================================
-- Performance Testing Queries (Run these to verify improvement)
-- ============================================================================

-- Test 1: Find packages using a product (should use idx_package_items_product_id)
-- EXPLAIN ANALYZE
-- SELECT p.name, pi.quantity
-- FROM package_items pi
-- JOIN packages p ON p.id = pi.package_id
-- WHERE pi.product_id = 'YOUR_PRODUCT_ID';

-- Test 2: Get package components (should use idx_package_items_package_product)
-- EXPLAIN ANALYZE
-- SELECT pi.product_id, pi.quantity, pr.current_stock
-- FROM package_items pi
-- JOIN products pr ON pr.id = pi.product_id
-- WHERE pi.package_id = 'YOUR_PACKAGE_ID';

-- Test 3: Sales analysis by date (should use idx_order_items_created_at)
-- EXPLAIN ANALYZE
-- SELECT product_id, SUM(quantity) as total_sold
-- FROM order_items
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY product_id;

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================

-- DROP INDEX IF EXISTS idx_package_items_product_id;
-- DROP INDEX IF EXISTS idx_package_items_package_product;
-- DROP INDEX IF EXISTS idx_order_items_created_at;
-- DROP INDEX IF EXISTS idx_order_items_package_id;
-- DROP INDEX IF EXISTS idx_products_active_stock;

-- ============================================================================
-- Migration Complete
-- ============================================================================
