-- ============================================
-- TAB MODULE DATABASE VERIFICATION SCRIPT
-- Use this to verify production database has all required structures
-- ============================================
-- Date: 2025-10-09
-- Purpose: Quick verification of tab system database deployment
-- ============================================

-- ============================================
-- SECTION 1: VERIFY TABLES EXIST
-- ============================================

\echo '======================================'
\echo 'CHECKING TABLES...'
\echo '======================================'

SELECT 
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ ALL TAB TABLES EXIST'
        ELSE '❌ MISSING ' || (4 - COUNT(*))::text || ' TAB TABLES'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('order_sessions', 'current_orders', 'current_order_items', 'current_order_item_addons');

-- List actual tables found
SELECT 
    table_name,
    '✅ EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('order_sessions', 'current_orders', 'current_order_items', 'current_order_item_addons')
ORDER BY table_name;

-- ============================================
-- SECTION 2: VERIFY ENUMS
-- ============================================

\echo ''
\echo '======================================'
\echo 'CHECKING ENUMS...'
\echo '======================================'

-- Check session_status enum
SELECT 
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ session_status ENUM OK (3 values)'
        ELSE '❌ session_status ENUM MISSING OR INCOMPLETE'
    END as status
FROM (
    SELECT unnest(enum_range(NULL::session_status))
) e;

-- Show session_status values
\echo 'session_status values:'
SELECT unnest(enum_range(NULL::session_status)) AS value;

-- Check order_status enum has new values
\echo ''
\echo 'order_status values:'
SELECT unnest(enum_range(NULL::order_status)) AS value;

SELECT 
    CASE 
        WHEN 'draft' IN (SELECT unnest(enum_range(NULL::order_status))::text) THEN '✅ draft status exists'
        ELSE '❌ draft status MISSING'
    END as draft_status,
    CASE 
        WHEN 'confirmed' IN (SELECT unnest(enum_range(NULL::order_status))::text) THEN '✅ confirmed status exists'
        ELSE '❌ confirmed status MISSING'
    END as confirmed_status,
    CASE 
        WHEN 'preparing' IN (SELECT unnest(enum_range(NULL::order_status))::text) THEN '✅ preparing status exists'
        ELSE '❌ preparing status MISSING'
    END as preparing_status,
    CASE 
        WHEN 'ready' IN (SELECT unnest(enum_range(NULL::order_status))::text) THEN '✅ ready status exists'
        ELSE '❌ ready status MISSING'
    END as ready_status,
    CASE 
        WHEN 'served' IN (SELECT unnest(enum_range(NULL::order_status))::text) THEN '✅ served status exists'
        ELSE '❌ served status MISSING'
    END as served_status;

-- ============================================
-- SECTION 3: VERIFY NEW COLUMNS
-- ============================================

\echo ''
\echo '======================================'
\echo 'CHECKING NEW COLUMNS...'
\echo '======================================'

-- Check orders.session_id
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'session_id'
        ) THEN '✅ orders.session_id EXISTS'
        ELSE '❌ orders.session_id MISSING'
    END as orders_session_id;

-- Check restaurant_tables.current_session_id
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'restaurant_tables' AND column_name = 'current_session_id'
        ) THEN '✅ restaurant_tables.current_session_id EXISTS'
        ELSE '❌ restaurant_tables.current_session_id MISSING'
    END as tables_session_id;

-- ============================================
-- SECTION 4: VERIFY FUNCTIONS
-- ============================================

\echo ''
\echo '======================================'
\echo 'CHECKING FUNCTIONS...'
\echo '======================================'

SELECT 
    CASE 
        WHEN COUNT(*) = 6 THEN '✅ ALL 6 FUNCTIONS EXIST'
        ELSE '❌ MISSING ' || (6 - COUNT(*))::text || ' FUNCTIONS'
    END as status
FROM pg_proc 
WHERE proname IN (
    'generate_session_number',
    'set_session_number',
    'update_session_totals',
    'calculate_current_order_totals',
    'trigger_calculate_current_order_totals',
    'get_active_session_for_table'
);

-- List actual functions found
SELECT 
    proname as function_name,
    '✅ EXISTS' as status
FROM pg_proc 
WHERE proname IN (
    'generate_session_number',
    'set_session_number',
    'update_session_totals',
    'calculate_current_order_totals',
    'trigger_calculate_current_order_totals',
    'get_active_session_for_table'
)
ORDER BY proname;

-- ============================================
-- SECTION 5: VERIFY TRIGGERS
-- ============================================

\echo ''
\echo '======================================'
\echo 'CHECKING TRIGGERS...'
\echo '======================================'

SELECT 
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ ALL 4 TRIGGERS EXIST'
        ELSE '❌ MISSING ' || (4 - COUNT(*))::text || ' TRIGGERS'
    END as status
FROM pg_trigger 
WHERE tgname IN (
    'trigger_set_session_number',
    'trigger_update_session_totals',
    'trigger_current_order_items_totals',
    'update_current_orders_updated_at'
)
AND tgisinternal = false;

-- List actual triggers found
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as on_table,
    '✅ EXISTS' as status
FROM pg_trigger 
WHERE tgname IN (
    'trigger_set_session_number',
    'trigger_update_session_totals',
    'trigger_current_order_items_totals',
    'update_current_orders_updated_at'
)
AND tgisinternal = false
ORDER BY tgname;

-- ============================================
-- SECTION 6: VERIFY INDEXES
-- ============================================

\echo ''
\echo '======================================'
\echo 'CHECKING INDEXES...'
\echo '======================================'

-- Count tab-related indexes
SELECT 
    CASE 
        WHEN COUNT(*) >= 16 THEN '✅ ALL TAB INDEXES EXIST (' || COUNT(*)::text || ' found)'
        ELSE '⚠️  FOUND ' || COUNT(*) || ' INDEXES (expected 16+)'
    END as status
FROM pg_indexes 
WHERE tablename IN ('order_sessions', 'orders', 'restaurant_tables', 'current_orders', 'current_order_items', 'current_order_item_addons')
  AND indexname LIKE 'idx_%';

-- List indexes by table
\echo ''
\echo 'Indexes by table:'
SELECT 
    tablename,
    COUNT(*) as index_count
FROM pg_indexes 
WHERE tablename IN ('order_sessions', 'orders', 'restaurant_tables', 'current_orders', 'current_order_items', 'current_order_item_addons')
  AND indexname LIKE 'idx_%'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- SECTION 7: VERIFY RLS POLICIES
-- ============================================

\echo ''
\echo '======================================'
\echo 'CHECKING RLS POLICIES...'
\echo '======================================'

-- Check if RLS is enabled
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS NOT ENABLED'
    END as rls_status
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE schemaname = 'public'
  AND tablename IN ('order_sessions', 'current_orders', 'current_order_items', 'current_order_item_addons')
ORDER BY tablename;

-- Count policies per table
\echo ''
\echo 'RLS Policies count per table:'
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('order_sessions', 'current_orders', 'current_order_items', 'current_order_item_addons')
GROUP BY tablename
ORDER BY tablename;

-- Expected counts:
-- order_sessions: 3 policies
-- current_orders: 5 policies
-- current_order_items: 4 policies
-- current_order_item_addons: 2 policies
-- Total: 14 policies

SELECT 
    CASE 
        WHEN COUNT(*) = 14 THEN '✅ ALL 14 RLS POLICIES EXIST'
        ELSE '❌ FOUND ' || COUNT(*)::text || ' POLICIES (expected 14)'
    END as policy_status
FROM pg_policies 
WHERE tablename IN ('order_sessions', 'current_orders', 'current_order_items', 'current_order_item_addons');

-- ============================================
-- SECTION 8: VERIFY VIEWS
-- ============================================

\echo ''
\echo '======================================'
\echo 'CHECKING VIEWS...'
\echo '======================================'

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_schema = 'public' AND table_name = 'active_sessions_view'
        ) THEN '✅ active_sessions_view EXISTS'
        ELSE '❌ active_sessions_view MISSING'
    END as view_status;

-- ============================================
-- SECTION 9: VERIFY FOREIGN KEYS
-- ============================================

\echo ''
\echo '======================================'
\echo 'CHECKING FOREIGN KEYS...'
\echo '======================================'

-- Check key foreign keys exist
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    '✅ EXISTS' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('order_sessions', 'orders', 'restaurant_tables', 'current_orders', 'current_order_items', 'current_order_item_addons')
  AND (
    (tc.table_name = 'orders' AND kcu.column_name = 'session_id')
    OR (tc.table_name = 'restaurant_tables' AND kcu.column_name = 'current_session_id')
    OR tc.table_name IN ('order_sessions', 'current_orders', 'current_order_items', 'current_order_item_addons')
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- SECTION 10: VERIFY REALTIME PUBLICATION
-- ============================================

\echo ''
\echo '======================================'
\echo 'CHECKING REALTIME PUBLICATION...'
\echo '======================================'

-- Check if tables are in supabase_realtime publication
SELECT 
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ REALTIME ENABLED (' || COUNT(*)::text || ' tables)'
        ELSE '⚠️  FOUND ' || COUNT(*) || ' TABLES IN REALTIME (expected 3+)'
    END as realtime_status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('order_sessions', 'current_orders', 'current_order_items');

\echo ''
\echo 'Tables in realtime publication:'
SELECT 
    tablename,
    '✅ ENABLED' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('order_sessions', 'current_orders', 'current_order_items')
ORDER BY tablename;

-- ============================================
-- SECTION 11: FUNCTIONAL TESTS
-- ============================================

\echo ''
\echo '======================================'
\echo 'RUNNING FUNCTIONAL TESTS...'
\echo '======================================'

-- Test 1: Can generate session number
\echo 'Test 1: Generate session number'
SELECT 
    generate_session_number() as generated_number,
    '✅ FUNCTION WORKS' as status;

-- Test 2: Count existing sessions
\echo ''
\echo 'Test 2: Check existing sessions'
SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'open') as open_sessions,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_sessions
FROM order_sessions;

-- Test 3: Count current orders
\echo ''
\echo 'Test 3: Check current orders'
SELECT 
    COUNT(*) as total_current_orders,
    COUNT(DISTINCT cashier_id) as unique_cashiers
FROM current_orders;

-- Test 4: Check view works
\echo ''
\echo 'Test 4: Check active_sessions_view'
SELECT 
    COUNT(*) as active_sessions_in_view
FROM active_sessions_view;

-- ============================================
-- SECTION 12: SUMMARY REPORT
-- ============================================

\echo ''
\echo '======================================'
\echo 'DEPLOYMENT VERIFICATION SUMMARY'
\echo '======================================'

SELECT 
    'Tables' as component,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
       AND table_name IN ('order_sessions', 'current_orders', 'current_order_items', 'current_order_item_addons'))::text || '/4' as deployed
UNION ALL
SELECT 
    'Enums' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') 
        THEN '✅ session_status OK'
        ELSE '❌ session_status MISSING'
    END as deployed
UNION ALL
SELECT 
    'Functions' as component,
    (SELECT COUNT(*) FROM pg_proc WHERE proname IN (
        'generate_session_number', 'set_session_number', 'update_session_totals',
        'calculate_current_order_totals', 'trigger_calculate_current_order_totals', 'get_active_session_for_table'
    ))::text || '/6' as deployed
UNION ALL
SELECT 
    'Triggers' as component,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname IN (
        'trigger_set_session_number', 'trigger_update_session_totals',
        'trigger_current_order_items_totals', 'update_current_orders_updated_at'
    ) AND tgisinternal = false)::text || '/4' as deployed
UNION ALL
SELECT 
    'Indexes' as component,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename IN (
        'order_sessions', 'orders', 'restaurant_tables', 'current_orders', 'current_order_items', 'current_order_item_addons'
    ) AND indexname LIKE 'idx_%')::text || ' created' as deployed
UNION ALL
SELECT 
    'RLS Policies' as component,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename IN (
        'order_sessions', 'current_orders', 'current_order_items', 'current_order_item_addons'
    ))::text || '/14' as deployed
UNION ALL
SELECT 
    'Views' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.views 
                     WHERE table_schema = 'public' AND table_name = 'active_sessions_view')
        THEN '✅ active_sessions_view OK'
        ELSE '❌ active_sessions_view MISSING'
    END as deployed;

\echo ''
\echo '======================================'
\echo 'VERIFICATION COMPLETE'
\echo '======================================'
\echo 'Review the output above for any ❌ marks'
\echo 'All components should show ✅ for successful deployment'
\echo '======================================'
