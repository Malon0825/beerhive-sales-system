-- ============================================
-- Complete Pending Orders Script
-- Fixes orders that were created but never marked as completed
-- Run this ONCE after deploying the POSInterface.tsx fix
-- ============================================

-- Step 1: Check pending orders that should be completed
-- (orders with payment method but status still pending)
SELECT 
    id,
    order_number,
    total_amount,
    payment_method,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_ago
FROM orders
WHERE status = 'pending'
AND payment_method IS NOT NULL
ORDER BY created_at DESC;

-- Step 2: Review the results above, then run this to complete them
-- This will mark all pending paid orders as completed
-- and set completed_at to the created_at timestamp (approximate)
UPDATE orders
SET 
    status = 'completed',
    completed_at = created_at,  -- Use creation time as approximate completion
    updated_at = NOW()
WHERE status = 'pending'
AND payment_method IS NOT NULL;

-- Step 3: Verify the update
SELECT 
    status,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue
FROM orders
WHERE payment_method IS NOT NULL
GROUP BY status
ORDER BY status;

-- Step 4: Check if reports will now show data
SELECT 
    DATE(completed_at) as date,
    COUNT(*) as orders,
    SUM(total_amount) as revenue
FROM orders
WHERE status = 'completed'
AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(completed_at)
ORDER BY date DESC;

-- ============================================
-- Notes:
-- - This script is safe to run multiple times
-- - Only affects pending orders with payment_method
-- - Uses created_at as completed_at (best approximation)
-- - Future orders will be auto-completed by the fixed code
-- ============================================
