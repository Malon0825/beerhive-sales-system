-- ============================================================================
-- Tab Payment Duplication Cleanup Migration
-- ============================================================================
-- Purpose: Remove duplicate payment amounts from individual orders in sessions
-- Date: October 17, 2025
-- Version: v1.0.2
-- 
-- IMPORTANT: Run this AFTER deploying the code fix to prevent re-duplication
-- ============================================================================

-- Step 1: Verify the issue exists
-- This query shows orders with session_id that have payment amounts set
SELECT 
    o.id,
    o.order_number,
    o.session_id,
    o.total_amount,
    o.amount_tendered,
    o.change_amount,
    o.payment_method,
    o.status,
    os.session_number,
    os.total_amount as session_total
FROM orders o
LEFT JOIN order_sessions os ON o.session_id = os.id
WHERE 
    o.session_id IS NOT NULL 
    AND o.amount_tendered IS NOT NULL
ORDER BY o.session_id, o.created_at;

-- Step 2: Count affected records
SELECT 
    COUNT(*) as affected_orders,
    COUNT(DISTINCT session_id) as affected_sessions
FROM orders
WHERE 
    session_id IS NOT NULL 
    AND amount_tendered IS NOT NULL;

-- Step 3: Backup affected data (optional but recommended)
-- Create a backup table before making changes
CREATE TABLE IF NOT EXISTS orders_payment_backup_20251017 AS
SELECT 
    id,
    order_number,
    session_id,
    amount_tendered,
    change_amount,
    total_amount,
    payment_method,
    status,
    updated_at
FROM orders
WHERE 
    session_id IS NOT NULL 
    AND amount_tendered IS NOT NULL;

-- Step 4: Clear duplicate payment amounts from session-based orders
-- This is the actual fix
UPDATE orders 
SET 
    amount_tendered = NULL,
    change_amount = NULL,
    updated_at = NOW()
WHERE 
    session_id IS NOT NULL 
    AND status = 'completed';

-- Step 5: Verify the fix
-- Should return 0 rows after migration
SELECT 
    o.id,
    o.order_number,
    o.session_id,
    o.amount_tendered,
    o.change_amount
FROM orders o
WHERE 
    o.session_id IS NOT NULL 
    AND o.amount_tendered IS NOT NULL;

-- Step 6: Verify sales totals are still correct
-- Compare order totals vs session totals
SELECT 
    os.id as session_id,
    os.session_number,
    os.total_amount as session_total,
    SUM(o.total_amount) as sum_of_orders,
    os.total_amount - SUM(o.total_amount) as difference
FROM order_sessions os
LEFT JOIN orders o ON o.session_id = os.id
WHERE os.status = 'closed'
GROUP BY os.id, os.session_number, os.total_amount
HAVING ABS(os.total_amount - SUM(o.total_amount)) > 0.01
ORDER BY os.closed_at DESC
LIMIT 20;

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================
-- CAUTION: Only use this if you need to restore the backup
-- This will restore the duplicate amounts (not recommended)
/*
UPDATE orders o
SET 
    amount_tendered = b.amount_tendered,
    change_amount = b.change_amount,
    updated_at = NOW()
FROM orders_payment_backup_20251017 b
WHERE o.id = b.id;
*/

-- ============================================================================
-- Cleanup (after verification)
-- ============================================================================
-- Drop the backup table after confirming migration success
-- DROP TABLE IF EXISTS orders_payment_backup_20251017;

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. This migration only affects orders that belong to sessions (tabs)
-- 2. POS orders (session_id IS NULL) are not affected
-- 3. Payment details are still available at the session level
-- 4. Sales reports use order.total_amount, so reporting is unaffected
-- 5. The backup table allows rollback if needed
