-- ============================================================================
-- Revenue Calculation Diagnostic Query
-- ============================================================================
-- Purpose: Investigate the revenue tripling issue between 8pm-3am vs 9pm-3am
-- Date: October 17, 2025
-- Issue: Revenue changes from ₱5,260 (9pm-3am) to ₱16,697 (8pm-3am)
-- Expected: ₱5,529 total sales reported by cashier
-- ============================================================================

-- STEP 1: Check if data migration was executed
-- If this returns rows, the migration was NOT run
SELECT 
    COUNT(*) as orders_with_duplicate_payments,
    COUNT(DISTINCT session_id) as affected_sessions
FROM orders
WHERE 
    session_id IS NOT NULL 
    AND amount_tendered IS NOT NULL;

-- STEP 2: Verify orders in the 8pm-3am timeframe (Oct 12-13, 2025)
-- Check for duplicate payment amounts
SELECT 
    o.id,
    o.order_number,
    o.session_id,
    o.total_amount,
    o.amount_tendered,
    o.change_amount,
    o.payment_method,
    o.completed_at,
    os.session_number,
    os.total_amount as session_total_amount,
    os.amount_tendered as session_amount_tendered
FROM orders o
LEFT JOIN order_sessions os ON o.session_id = os.id
WHERE 
    o.completed_at >= '2025-10-12T20:00:00'  -- 8pm Oct 12
    AND o.completed_at <= '2025-10-13T03:00:00'  -- 3am Oct 13
    AND o.status = 'completed'
ORDER BY o.completed_at, o.session_id;

-- STEP 3: Calculate revenue with CURRENT (buggy) data
-- This simulates what the system is showing
WITH all_sales AS (
    -- POS Orders (no session)
    SELECT 
        'POS' as order_type,
        o.id,
        o.order_number,
        o.total_amount,
        o.amount_tendered,
        o.completed_at
    FROM orders o
    WHERE 
        o.session_id IS NULL
        AND o.completed_at >= '2025-10-12T20:00:00'
        AND o.completed_at <= '2025-10-13T03:00:00'
        AND o.status = 'completed'
    
    UNION ALL
    
    -- Tab Sessions
    SELECT 
        'TAB' as order_type,
        os.id,
        os.session_number,
        os.total_amount,
        os.amount_tendered,
        os.closed_at as completed_at
    FROM order_sessions os
    WHERE 
        os.status = 'closed'
        AND os.closed_at >= '2025-10-12T20:00:00'
        AND os.closed_at <= '2025-10-13T03:00:00'
)
SELECT 
    SUM(total_amount) as total_revenue,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN order_type = 'POS' THEN total_amount ELSE 0 END) as pos_revenue,
    SUM(CASE WHEN order_type = 'TAB' THEN total_amount ELSE 0 END) as tab_revenue,
    SUM(CASE WHEN order_type = 'POS' THEN 1 ELSE 0 END) as pos_count,
    SUM(CASE WHEN order_type = 'TAB' THEN 1 ELSE 0 END) as tab_count
FROM all_sales;

-- STEP 4: Check for orders between 8pm-9pm specifically
-- This 1-hour window is causing the revenue difference
SELECT 
    o.id,
    o.order_number,
    o.session_id,
    o.total_amount,
    o.amount_tendered,
    o.completed_at,
    CASE 
        WHEN o.session_id IS NULL THEN 'POS'
        ELSE 'TAB'
    END as order_type
FROM orders o
WHERE 
    o.completed_at >= '2025-10-12T20:00:00'  -- 8pm
    AND o.completed_at < '2025-10-12T21:00:00'  -- 9pm
    AND o.status = 'completed'
ORDER BY o.completed_at;

-- STEP 5: Check session orders in the 8pm-9pm window
SELECT 
    os.id,
    os.session_number,
    os.total_amount as session_total,
    os.amount_tendered,
    os.closed_at,
    COUNT(o.id) as orders_in_session,
    SUM(o.total_amount) as sum_of_order_amounts,
    SUM(o.amount_tendered) as sum_of_order_payments  -- This should be NULL if migration ran
FROM order_sessions os
LEFT JOIN orders o ON o.session_id = os.id
WHERE 
    os.closed_at >= '2025-10-12T20:00:00'
    AND os.closed_at < '2025-10-12T21:00:00'
    AND os.status = 'closed'
GROUP BY os.id, os.session_number, os.total_amount, os.amount_tendered, os.closed_at;

-- STEP 6: Calculate CORRECT revenue (what it should be after migration)
-- This assumes all session orders have NULL amount_tendered
WITH all_sales AS (
    -- POS Orders (no session)
    SELECT 
        o.total_amount
    FROM orders o
    WHERE 
        o.session_id IS NULL
        AND o.completed_at >= '2025-10-12T20:00:00'
        AND o.completed_at <= '2025-10-13T03:00:00'
        AND o.status = 'completed'
    
    UNION ALL
    
    -- Tab Sessions (only count once at session level)
    SELECT 
        os.total_amount
    FROM order_sessions os
    WHERE 
        os.status = 'closed'
        AND os.closed_at >= '2025-10-12T20:00:00'
        AND os.closed_at <= '2025-10-13T03:00:00'
)
SELECT 
    SUM(total_amount) as correct_total_revenue,
    COUNT(*) as total_transactions
FROM all_sales;

-- ============================================================================
-- Expected Results
-- ============================================================================
-- STEP 1: Should return 0 if migration ran, >0 if not
-- STEP 3: Current calculation (likely showing ₱16,697)
-- STEP 6: Correct calculation (should be around ₱5,529)
-- 
-- If STEP 1 shows duplicate payments exist:
--   => Run the data_migration_tab_payment_cleanup.sql script
--   => This will remove amount_tendered from session-based orders
--   => Revenue will then calculate correctly
-- ============================================================================
