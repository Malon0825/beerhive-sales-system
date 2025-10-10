-- ============================================
-- Tab Stock Deduction Bug - Testing Script
-- ============================================
-- Date: October 9, 2025
-- Purpose: Verify that stock deduction works correctly for all products when closing tabs
-- ============================================

-- ============================================
-- SETUP: Create Test Products
-- ============================================

-- Clean up previous test data
DELETE FROM inventory_movements WHERE notes LIKE '%Test Product%';
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE order_notes LIKE '%TAB_STOCK_TEST%'
);
DELETE FROM orders WHERE order_notes LIKE '%TAB_STOCK_TEST%';
DELETE FROM products WHERE sku LIKE 'TAB_TEST_%';

-- Create test products
INSERT INTO products (name, sku, base_price, current_stock, reorder_point, category_id, is_active)
VALUES 
  (
    'Test Product for Kitchen', 
    'TAB_TEST_KITCHEN', 
    100.00, 
    50,
    10,
    (SELECT id FROM product_categories WHERE name ILIKE '%food%' LIMIT 1),
    true
  ),
  (
    'Test Product for Bartender', 
    'TAB_TEST_BAR', 
    75.00, 
    50,
    10,
    (SELECT id FROM product_categories WHERE name ILIKE '%beer%' OR name ILIKE '%beverage%' LIMIT 1),
    true
  ),
  (
    'Test Product Extra', 
    'TAB_TEST_EXTRA', 
    50.00, 
    50,
    10,
    (SELECT id FROM product_categories WHERE name ILIKE '%snack%' LIMIT 1),
    true
  );

-- ============================================
-- VERIFICATION QUERY 1: Check Initial Stock
-- ============================================

\echo '----------------------------------------'
\echo 'INITIAL STOCK LEVELS'
\echo '----------------------------------------'

SELECT 
  name,
  sku,
  current_stock,
  category_id
FROM products 
WHERE sku LIKE 'TAB_TEST_%'
ORDER BY sku;

-- Expected Output:
-- Test Product for Kitchen:    50
-- Test Product for Bartender:  50
-- Test Product Extra:          50

-- ============================================
-- MANUAL STEP: Create Tab with Multiple Products
-- ============================================

\echo ''
\echo '----------------------------------------'
\echo 'NEXT STEPS: Manual Tab Creation'
\echo '----------------------------------------'
\echo '1. Open POS or Tab Management interface'
\echo '2. Create a new tab/session for any table'
\echo '3. Add the following items to the order:'
\echo '   - 3x Test Product for Kitchen'
\echo '   - 5x Test Product for Bartender'
\echo '   - 2x Test Product Extra'
\echo '4. Confirm the order'
\echo '5. Close the tab with payment'
\echo '6. Return here and run the verification queries below'
\echo ''
\echo 'Press Enter when ready to continue...'
\echo '----------------------------------------'

-- ============================================
-- VERIFICATION QUERY 2: Check Stock After Deduction
-- ============================================

\echo ''
\echo '----------------------------------------'
\echo 'STOCK LEVELS AFTER TAB CLOSURE'
\echo '----------------------------------------'

SELECT 
  name,
  sku,
  current_stock,
  CASE 
    WHEN sku = 'TAB_TEST_KITCHEN' THEN 50 - 3  -- Should be 47
    WHEN sku = 'TAB_TEST_BAR' THEN 50 - 5      -- Should be 45
    WHEN sku = 'TAB_TEST_EXTRA' THEN 50 - 2    -- Should be 48
  END as expected_stock,
  CASE 
    WHEN sku = 'TAB_TEST_KITCHEN' AND current_stock = 50 - 3 THEN '✅ PASS'
    WHEN sku = 'TAB_TEST_BAR' AND current_stock = 50 - 5 THEN '✅ PASS'
    WHEN sku = 'TAB_TEST_EXTRA' AND current_stock = 50 - 2 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as test_result
FROM products 
WHERE sku LIKE 'TAB_TEST_%'
ORDER BY sku;

-- ============================================
-- VERIFICATION QUERY 3: Check Inventory Movements
-- ============================================

\echo ''
\echo '----------------------------------------'
\echo 'INVENTORY MOVEMENT RECORDS'
\echo '----------------------------------------'

SELECT 
  p.name as product_name,
  p.sku,
  im.movement_type,
  im.reason,
  im.quantity_change,
  im.quantity_before,
  im.quantity_after,
  im.notes,
  im.created_at
FROM inventory_movements im
JOIN products p ON p.id = im.product_id
WHERE p.sku LIKE 'TAB_TEST_%'
  AND im.created_at > NOW() - INTERVAL '10 minutes'
ORDER BY im.created_at DESC;

-- Expected Output: 3 records
-- TAB_TEST_KITCHEN:  -3  (50 -> 47)
-- TAB_TEST_BAR:      -5  (50 -> 45)
-- TAB_TEST_EXTRA:    -2  (50 -> 48)

-- ============================================
-- VERIFICATION QUERY 4: Summary Report
-- ============================================

\echo ''
\echo '----------------------------------------'
\echo 'TEST SUMMARY REPORT'
\echo '----------------------------------------'

WITH test_products AS (
  SELECT 
    p.id,
    p.name,
    p.sku,
    p.current_stock,
    CASE 
      WHEN p.sku = 'TAB_TEST_KITCHEN' THEN 3
      WHEN p.sku = 'TAB_TEST_BAR' THEN 5
      WHEN p.sku = 'TAB_TEST_EXTRA' THEN 2
    END as expected_deduction
  FROM products p
  WHERE p.sku LIKE 'TAB_TEST_%'
),
movement_summary AS (
  SELECT 
    im.product_id,
    SUM(ABS(im.quantity_change)) as total_deducted
  FROM inventory_movements im
  WHERE im.product_id IN (SELECT id FROM test_products)
    AND im.created_at > NOW() - INTERVAL '10 minutes'
    AND im.movement_type = 'sale'
  GROUP BY im.product_id
)
SELECT 
  tp.name as product_name,
  tp.sku,
  COALESCE(ms.total_deducted, 0) as actual_deduction,
  tp.expected_deduction,
  CASE 
    WHEN COALESCE(ms.total_deducted, 0) = tp.expected_deduction THEN '✅ PASS'
    WHEN COALESCE(ms.total_deducted, 0) = 0 THEN '❌ FAIL - Not Deducted'
    WHEN COALESCE(ms.total_deducted, 0) != tp.expected_deduction THEN '❌ FAIL - Wrong Amount'
  END as test_status,
  50 - tp.current_stock as stock_change,
  tp.current_stock as current_stock
FROM test_products tp
LEFT JOIN movement_summary ms ON ms.product_id = tp.id
ORDER BY tp.sku;

-- ============================================
-- TEST CRITERIA
-- ============================================

/*
✅ TEST PASSES IF:
1. All 3 products show "✅ PASS" in test_status
2. actual_deduction = expected_deduction for all products
3. Inventory movements table has 3 records
4. Stock levels match expected values:
   - Kitchen: 47
   - Bartender: 45
   - Extra: 48

❌ TEST FAILS IF:
1. Any product shows "❌ FAIL"
2. Some products deducted, others not (the original bug)
3. Incorrect deduction amounts
4. Missing inventory movement records
*/

-- ============================================
-- CLEANUP (Run after testing)
-- ============================================

-- Uncomment to clean up test data:
/*
DELETE FROM inventory_movements 
WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'TAB_TEST_%');

DELETE FROM order_items 
WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'TAB_TEST_%');

DELETE FROM products WHERE sku LIKE 'TAB_TEST_%';

\echo 'Test data cleaned up successfully'
*/

-- ============================================
-- ADVANCED TEST: Multiple Orders in Single Tab
-- ============================================

\echo ''
\echo '----------------------------------------'
\echo 'ADVANCED TEST SETUP'
\echo '----------------------------------------'
\echo 'For thorough testing, create a tab with MULTIPLE orders:'
\echo ''
\echo 'Order 1:'
\echo '  - 2x Test Product for Kitchen'
\echo '  - 3x Test Product for Bartender'
\echo ''
\echo 'Order 2 (after 2 minutes):'
\echo '  - 1x Test Product for Kitchen'
\echo '  - 2x Test Product for Bartender'
\echo '  - 2x Test Product Extra'
\echo ''
\echo 'Order 3 (after 1 minute):'
\echo '  - 1x Test Product Extra'
\echo ''
\echo 'Then close the tab and verify:'
\echo '  Kitchen:   50 - (2+1) = 47'
\echo '  Bartender: 50 - (3+2) = 45'
\echo '  Extra:     50 - (2+1) = 47'
\echo '----------------------------------------'

-- ============================================
-- QUICK VERIFICATION FOR MULTIPLE ORDERS
-- ============================================

WITH expected_totals AS (
  SELECT 
    'TAB_TEST_KITCHEN' as sku, 
    50 as initial_stock, 
    3 as expected_total_deduction,  -- 2 + 1
    47 as expected_final_stock
  UNION ALL
  SELECT 'TAB_TEST_BAR', 50, 5, 45  -- 3 + 2
  UNION ALL
  SELECT 'TAB_TEST_EXTRA', 50, 3, 47  -- 2 + 1
)
SELECT 
  et.sku,
  p.current_stock,
  et.expected_final_stock,
  et.initial_stock - p.current_stock as actual_deduction,
  et.expected_total_deduction,
  CASE 
    WHEN p.current_stock = et.expected_final_stock THEN '✅ MULTI-ORDER TEST PASS'
    ELSE '❌ MULTI-ORDER TEST FAIL'
  END as multi_order_test_status
FROM expected_totals et
JOIN products p ON p.sku = et.sku
ORDER BY et.sku;

-- ============================================
-- END OF TEST SCRIPT
-- ============================================

\echo ''
\echo '============================================'
\echo 'TEST SCRIPT COMPLETE'
\echo '============================================'
\echo ''
\echo 'If all tests show ✅ PASS, the bug fix is working correctly!'
\echo ''
