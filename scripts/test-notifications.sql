-- ============================================
-- Test Notification System
-- Run these queries to test notifications manually
-- ============================================

-- SETUP: Get your user ID first
-- Replace 'YOUR_USER_ID' with actual UUID from users table
SELECT id, username, role, full_name FROM users LIMIT 5;

-- ============================================
-- TEST 1: Order Created Notification
-- ============================================
-- Create a test order (triggers automatic notification)
INSERT INTO orders (
    order_number,
    cashier_id,
    subtotal,
    total_amount,
    status,
    payment_method
) VALUES (
    'TEST-' || FLOOR(RANDOM() * 10000)::TEXT,
    (SELECT id FROM users WHERE role = 'cashier' LIMIT 1),
    500.00,
    500.00,
    'pending',
    'cash'
);

-- Verify notification was created
SELECT * FROM notifications 
WHERE type = 'order_created' 
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- TEST 2: Order Completed Notification
-- ============================================
-- Complete an order (triggers notification)
UPDATE orders 
SET status = 'completed',
    completed_at = NOW()
WHERE status = 'pending'
AND order_number LIKE 'TEST-%'
LIMIT 1;

-- Verify notification
SELECT * FROM notifications 
WHERE type = 'order_completed' 
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- TEST 3: Low Stock Notification
-- ============================================
-- Trigger low stock alert
UPDATE products 
SET current_stock = 3
WHERE current_stock > 0 
AND reorder_point >= 5
LIMIT 1
RETURNING id, name, current_stock, reorder_point;

-- Verify low stock notification
SELECT * FROM notifications 
WHERE type = 'low_stock' 
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- TEST 4: Out of Stock Notification (URGENT)
-- ============================================
-- Trigger out of stock alert
UPDATE products 
SET current_stock = 0
WHERE current_stock > 0
LIMIT 1
RETURNING id, name, current_stock;

-- Verify urgent notification
SELECT * FROM notifications 
WHERE type = 'out_of_stock' 
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- TEST 5: Kitchen Order Ready Notification
-- ============================================
-- First, create an order with kitchen items
DO $$
DECLARE
    v_order_id UUID;
    v_order_item_id UUID;
BEGIN
    -- Create order
    INSERT INTO orders (
        order_number,
        cashier_id,
        subtotal,
        total_amount,
        status
    ) VALUES (
        'KITCHEN-TEST-' || FLOOR(RANDOM() * 10000)::TEXT,
        (SELECT id FROM users WHERE role = 'cashier' LIMIT 1),
        200.00,
        200.00,
        'pending'
    ) RETURNING id INTO v_order_id;
    
    -- Create order item
    INSERT INTO order_items (
        order_id,
        product_id,
        item_name,
        quantity,
        unit_price,
        subtotal,
        total
    ) VALUES (
        v_order_id,
        (SELECT id FROM products WHERE is_active = true LIMIT 1),
        'Test Food Item',
        1,
        200.00,
        200.00,
        200.00
    ) RETURNING id INTO v_order_item_id;
    
    -- Create kitchen order
    INSERT INTO kitchen_orders (
        order_id,
        order_item_id,
        destination,
        status
    ) VALUES (
        v_order_id,
        v_order_item_id,
        'kitchen',
        'pending'
    );
    
    RAISE NOTICE 'Created test order: %', v_order_id;
END $$;

-- Mark kitchen order as ready (triggers notification)
UPDATE kitchen_orders 
SET status = 'ready',
    ready_at = NOW()
WHERE status = 'pending'
AND destination = 'kitchen'
ORDER BY created_at DESC
LIMIT 1
RETURNING id, order_id, status;

-- Verify food ready notification
SELECT * FROM notifications 
WHERE type = 'food_ready' 
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- TEST 6: Manual System Alert
-- ============================================
-- Create a custom system alert
INSERT INTO notifications (
    type,
    title,
    message,
    priority,
    role
) VALUES (
    'system_alert',
    'Test System Alert',
    'This is a test notification to verify the system is working correctly.',
    'normal',
    'cashier'
);

-- Verify system alert
SELECT * FROM notifications 
WHERE type = 'system_alert' 
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- TEST 7: User-Specific Notification
-- ============================================
-- Create notification for specific user (replace UUID)
INSERT INTO notifications (
    type,
    title,
    message,
    priority,
    user_id
) VALUES (
    'system_alert',
    'Personal Test Notification',
    'This notification is sent to a specific user only.',
    'high',
    'YOUR_USER_ID' -- Replace with actual user ID
);

-- ============================================
-- VIEW ALL TEST NOTIFICATIONS
-- ============================================
-- See all recent notifications
SELECT 
    id,
    type,
    title,
    priority,
    is_read,
    role,
    created_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 20;

-- ============================================
-- TEST MARK AS READ
-- ============================================
-- Mark specific notification as read
UPDATE notifications 
SET is_read = true,
    read_at = NOW()
WHERE id = 'NOTIFICATION_ID'; -- Replace with actual ID

-- ============================================
-- TEST MARK ALL AS READ (using function)
-- ============================================
-- Mark all notifications as read for a user
SELECT mark_all_notifications_read('YOUR_USER_ID'); -- Replace with actual user ID

-- ============================================
-- TEST CLEANUP FUNCTIONS
-- ============================================
-- Manually trigger cleanup of expired notifications
SELECT delete_expired_notifications();

-- Manually trigger cleanup of old read notifications
SELECT cleanup_old_notifications();

-- ============================================
-- VERIFY REALTIME SETUP
-- ============================================
-- Check if realtime is enabled for notifications table
SELECT 
    schemaname,
    tablename,
    has_table_privilege(current_user, schemaname || '.' || tablename, 'SELECT') as can_read
FROM pg_tables 
WHERE tablename = 'notifications';

-- ============================================
-- CHECK TRIGGERS STATUS
-- ============================================
-- Verify all notification triggers are enabled
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgrelid::regclass as table_name,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger 
WHERE tgname LIKE 'trigger_notify%'
ORDER BY tgname;

-- ============================================
-- COUNT NOTIFICATIONS BY TYPE
-- ============================================
-- See notification distribution
SELECT 
    type,
    priority,
    COUNT(*) as count,
    SUM(CASE WHEN is_read THEN 0 ELSE 1 END) as unread_count
FROM notifications 
GROUP BY type, priority
ORDER BY count DESC;

-- ============================================
-- CLEANUP TEST DATA
-- ============================================
-- Delete all test notifications (be careful!)
-- DELETE FROM notifications WHERE message LIKE '%test%' OR title LIKE '%Test%';

-- Delete test orders
-- DELETE FROM orders WHERE order_number LIKE 'TEST-%' OR order_number LIKE 'KITCHEN-TEST-%';

-- Reset product stock (if you modified it)
-- UPDATE products SET current_stock = 100 WHERE current_stock < 10;

-- ============================================
-- PERFORMANCE CHECK
-- ============================================
-- Check notification query performance
EXPLAIN ANALYZE
SELECT * FROM notifications 
WHERE user_id = 'YOUR_USER_ID' 
AND is_read = false
ORDER BY created_at DESC 
LIMIT 50;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE tablename = 'notifications'
ORDER BY idx_scan DESC;

-- ============================================
-- USEFUL QUERIES FOR DEBUGGING
-- ============================================

-- Get notification count per user
SELECT 
    COALESCE(u.full_name, 'Role: ' || n.role) as target,
    COUNT(*) as total_notifications,
    SUM(CASE WHEN is_read THEN 0 ELSE 1 END) as unread
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
GROUP BY u.full_name, n.role
ORDER BY total_notifications DESC;

-- Get notification timeline (last 24 hours)
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    type,
    COUNT(*) as count
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), type
ORDER BY hour DESC, count DESC;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'notifications';

-- ============================================
-- NOTES
-- ============================================
-- 1. Always replace 'YOUR_USER_ID' with actual user UUID
-- 2. Run tests in order for best results
-- 3. Check browser console for realtime updates
-- 4. Monitor notification bell icon for changes
-- 5. Verify unread count updates correctly
-- 6. Test mute toggle in UI
-- 7. Test mark as read functionality
-- 8. Check that old notifications get cleaned up
-- ============================================
