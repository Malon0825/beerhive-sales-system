-- =====================================================
-- Current Orders System - Comprehensive Test Script
-- =====================================================
-- Purpose: Verify database tables, triggers, and RLS
-- Usage: Run in Supabase SQL Editor
-- =====================================================

-- SECTION 1: Verify Tables Exist
-- =====================================================
SELECT 
    '✅ Tables Created' as test_name,
    COUNT(*) as result,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('current_orders', 'current_order_items', 'current_order_item_addons');

-- SECTION 2: Verify RLS is Enabled
-- =====================================================
SELECT 
    '✅ RLS Enabled' as test_name,
    COUNT(*) as result,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('current_orders', 'current_order_items', 'current_order_item_addons')
AND rowsecurity = true;

-- SECTION 3: Verify RLS Policies
-- =====================================================
SELECT 
    '✅ RLS Policies' as test_name,
    COUNT(*) as result,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('current_orders', 'current_order_items', 'current_order_item_addons');

-- SECTION 4: Verify Indexes
-- =====================================================
SELECT 
    '✅ Indexes Created' as test_name,
    COUNT(*) as result,
    CASE 
        WHEN COUNT(*) >= 6 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('current_orders', 'current_order_items', 'current_order_item_addons')
AND indexname LIKE 'idx_%';

-- SECTION 5: Verify Triggers
-- =====================================================
SELECT 
    '✅ Triggers Created' as test_name,
    COUNT(*) as result,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname IN ('current_orders', 'current_order_items')
AND t.tgname LIKE 'trigger_%';

-- SECTION 6: Verify Realtime
-- =====================================================
SELECT 
    '✅ Realtime Enabled' as test_name,
    COUNT(*) as result,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('current_orders', 'current_order_items', 'current_order_item_addons');

-- =====================================================
-- SECTION 7: Detailed Policy List
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('current_orders', 'current_order_items', 'current_order_item_addons')
ORDER BY tablename, policyname;

-- =====================================================
-- SECTION 8: Detailed Index List
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('current_orders', 'current_order_items', 'current_order_item_addons')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- SECTION 9: Detailed Trigger Information
-- =====================================================
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    CASE t.tgtype & 2
        WHEN 2 THEN 'BEFORE'
        ELSE 'AFTER'
    END as timing,
    CASE t.tgtype & 28
        WHEN 4 THEN 'INSERT'
        WHEN 8 THEN 'DELETE'
        WHEN 16 THEN 'UPDATE'
        WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
        ELSE 'OTHER'
    END as events
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
AND c.relname IN ('current_orders', 'current_order_items')
AND t.tgname LIKE 'trigger_%'
ORDER BY c.relname, t.tgname;

-- =====================================================
-- SECTION 10: Test Auto-Calculation Trigger
-- =====================================================
-- NOTE: Replace 'test-cashier-id' with actual cashier UUID
-- Uncomment to run functional test:

/*
-- Step 1: Create test order
INSERT INTO current_orders (cashier_id)
VALUES ('test-cashier-id')
RETURNING id, subtotal, total_amount;

-- Step 2: Add test item (replace ORDER_ID)
INSERT INTO current_order_items (
    current_order_id,
    item_name,
    quantity,
    unit_price,
    subtotal,
    total
)
VALUES (
    'ORDER_ID',
    'Test Beer',
    2,
    75.00,
    150.00,
    150.00
)
RETURNING id;

-- Step 3: Verify totals auto-calculated
SELECT 
    id,
    subtotal,
    total_amount,
    CASE 
        WHEN subtotal = 150.00 AND total_amount = 150.00 
        THEN '✅ PASS - Auto-calculation works!'
        ELSE '❌ FAIL - Totals not updated'
    END as test_result
FROM current_orders
WHERE id = 'ORDER_ID';

-- Step 4: Clean up test data
DELETE FROM current_orders WHERE cashier_id = 'test-cashier-id';
*/

-- =====================================================
-- SECTION 11: Summary Report
-- =====================================================
SELECT 
    '═══════════════════════════════════════════════' as summary,
    '' as detail
UNION ALL
SELECT 
    '📊 DATABASE SETUP VERIFICATION SUMMARY' as summary,
    '' as detail
UNION ALL
SELECT 
    '═══════════════════════════════════════════════' as summary,
    '' as detail
UNION ALL
SELECT 
    '✅ Tables' as summary,
    (SELECT COUNT(*)::text FROM pg_tables 
     WHERE schemaname = 'public' 
     AND tablename LIKE 'current_order%') || ' / 3' as detail
UNION ALL
SELECT 
    '✅ RLS Enabled' as summary,
    (SELECT COUNT(*)::text FROM pg_tables 
     WHERE schemaname = 'public' 
     AND tablename LIKE 'current_order%' 
     AND rowsecurity = true) || ' / 3' as detail
UNION ALL
SELECT 
    '✅ RLS Policies' as summary,
    (SELECT COUNT(*)::text FROM pg_policies 
     WHERE schemaname = 'public' 
     AND tablename LIKE 'current_order%') || ' / 15' as detail
UNION ALL
SELECT 
    '✅ Indexes' as summary,
    (SELECT COUNT(*)::text FROM pg_indexes 
     WHERE schemaname = 'public' 
     AND tablename LIKE 'current_order%' 
     AND indexname LIKE 'idx_%') || ' / 6+' as detail
UNION ALL
SELECT 
    '✅ Triggers' as summary,
    (SELECT COUNT(*)::text FROM pg_trigger t
     JOIN pg_class c ON t.tgrelid = c.oid
     WHERE c.relname LIKE 'current_order%'
     AND t.tgname LIKE 'trigger_%') || ' / 2' as detail
UNION ALL
SELECT 
    '✅ Realtime' as summary,
    (SELECT COUNT(*)::text FROM pg_publication_tables 
     WHERE pubname = 'supabase_realtime' 
     AND tablename LIKE 'current_order%') || ' / 3' as detail
UNION ALL
SELECT 
    '═══════════════════════════════════════════════' as summary,
    '' as detail;

-- =====================================================
-- END OF TEST SCRIPT
-- =====================================================
-- If all tests show ✅ PASS, your database is ready!
-- Next: Test API endpoints and frontend integration
-- =====================================================
