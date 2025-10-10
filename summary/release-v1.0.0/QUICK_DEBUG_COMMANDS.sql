-- Quick Debug Commands for Cart Persistence
-- Run these in Supabase SQL Editor

-- ========================================
-- 1. CHECK CURRENT ORDERS
-- ========================================
-- Shows all current orders with item counts
SELECT 
  co.id,
  co.cashier_id,
  co.created_at,
  u.full_name as cashier_name,
  u.username as cashier_username,
  COUNT(coi.id) as item_count
FROM current_orders co
LEFT JOIN users u ON u.id = co.cashier_id
LEFT JOIN current_order_items coi ON coi.current_order_id = co.id
GROUP BY co.id, co.cashier_id, co.created_at, u.full_name, u.username
ORDER BY co.created_at DESC
LIMIT 20;

-- ========================================
-- 2. CHECK SPECIFIC CASHIER'S ORDERS
-- ========================================
-- Replace 'CASHIER_UUID' with actual cashier ID from console logs
SELECT 
  co.*,
  json_agg(
    json_build_object(
      'id', coi.id,
      'item_name', coi.item_name,
      'quantity', coi.quantity,
      'unit_price', coi.unit_price,
      'subtotal', coi.subtotal
    )
  ) as items
FROM current_orders co
LEFT JOIN current_order_items coi ON coi.current_order_id = co.id
WHERE co.cashier_id = 'CASHIER_UUID'
GROUP BY co.id
ORDER BY co.created_at DESC;

-- ========================================
-- 3. CHECK ALL USERS (Find your cashier ID)
-- ========================================
SELECT 
  id,
  username,
  full_name,
  role,
  is_active,
  created_at
FROM users
WHERE is_active = true
ORDER BY created_at DESC;

-- ========================================
-- 4. CHECK RLS POLICIES
-- ========================================
-- Verify Row Level Security policies exist
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('current_orders', 'current_order_items')
ORDER BY tablename, policyname;

-- ========================================
-- 5. VIEW ALL CURRENT ORDER ITEMS
-- ========================================
-- Shows all items in all current orders
SELECT 
  coi.*,
  co.cashier_id,
  u.full_name as cashier_name,
  p.name as product_name,
  p.current_stock
FROM current_order_items coi
JOIN current_orders co ON co.id = coi.current_order_id
LEFT JOIN users u ON u.id = co.cashier_id
LEFT JOIN products p ON p.id = coi.product_id
ORDER BY coi.created_at DESC
LIMIT 50;

-- ========================================
-- 6. CREATE TEST ORDER (MANUAL)
-- ========================================
-- Step 1: Create order (replace CASHIER_UUID)
/*
INSERT INTO current_orders (cashier_id, subtotal, total_amount)
VALUES ('CASHIER_UUID', 150.00, 150.00)
RETURNING *;
*/

-- Step 2: Add items (replace ORDER_UUID from step 1)
/*
INSERT INTO current_order_items (
  current_order_id,
  item_name,
  quantity,
  unit_price,
  subtotal,
  discount_amount,
  total
)
VALUES 
  ('ORDER_UUID', 'San Miguel Beer', 2, 75.00, 150.00, 0, 150.00),
  ('ORDER_UUID', 'Sisig', 1, 150.00, 150.00, 0, 150.00)
RETURNING *;
*/

-- ========================================
-- 7. CLEAR ALL CURRENT ORDERS (RESET)
-- ========================================
-- ⚠️ WARNING: This deletes ALL current orders!
-- Only use for testing/debugging
/*
DELETE FROM current_orders;
SELECT 'All current orders deleted' as result;
*/

-- ========================================
-- 8. CLEAR SPECIFIC CASHIER'S ORDERS
-- ========================================
-- Replace CASHIER_UUID
/*
DELETE FROM current_orders 
WHERE cashier_id = 'CASHIER_UUID';
SELECT 'Orders deleted for cashier' as result;
*/

-- ========================================
-- 9. CHECK LATEST ORDER WITH DETAILS
-- ========================================
-- Shows the most recent order with full details
SELECT 
  co.id as order_id,
  co.created_at,
  u.full_name as cashier,
  c.full_name as customer,
  rt.table_number,
  co.subtotal,
  co.total_amount,
  json_agg(
    json_build_object(
      'id', coi.id,
      'item_name', coi.item_name,
      'quantity', coi.quantity,
      'unit_price', coi.unit_price,
      'total', coi.total
    ) ORDER BY coi.created_at
  ) as items
FROM current_orders co
LEFT JOIN users u ON u.id = co.cashier_id
LEFT JOIN customers c ON c.id = co.customer_id
LEFT JOIN restaurant_tables rt ON rt.id = co.table_id
LEFT JOIN current_order_items coi ON coi.current_order_id = co.id
GROUP BY co.id, u.full_name, c.full_name, rt.table_number
ORDER BY co.created_at DESC
LIMIT 1;

-- ========================================
-- 10. CHECK IF TABLE EXISTS
-- ========================================
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('current_orders', 'current_order_items', 'current_order_item_addons')
ORDER BY table_name;

-- ========================================
-- 11. COUNT RECORDS
-- ========================================
SELECT 
  'current_orders' as table_name,
  COUNT(*) as record_count
FROM current_orders
UNION ALL
SELECT 
  'current_order_items' as table_name,
  COUNT(*) as record_count
FROM current_order_items
ORDER BY table_name;

-- ========================================
-- 12. CHECK RECENT ACTIVITY
-- ========================================
-- Shows last 10 cart actions
SELECT 
  co.id,
  co.cashier_id,
  u.full_name,
  co.created_at,
  co.updated_at,
  CASE 
    WHEN co.updated_at > co.created_at + interval '5 seconds' 
    THEN 'Modified'
    ELSE 'New'
  END as status
FROM current_orders co
LEFT JOIN users u ON u.id = co.cashier_id
ORDER BY co.updated_at DESC
LIMIT 10;

-- ========================================
-- EXAMPLE: Full Debug for Specific User
-- ========================================
-- Replace 'your.email@example.com' with actual email
/*
WITH user_info AS (
  SELECT id, username, full_name, email
  FROM users
  WHERE email = 'your.email@example.com'
  LIMIT 1
)
SELECT 
  'User Info' as section,
  json_build_object(
    'id', ui.id,
    'username', ui.username,
    'full_name', ui.full_name,
    'email', ui.email
  ) as data
FROM user_info ui
UNION ALL
SELECT 
  'Current Orders' as section,
  json_agg(
    json_build_object(
      'order_id', co.id,
      'created_at', co.created_at,
      'item_count', (SELECT COUNT(*) FROM current_order_items WHERE current_order_id = co.id)
    )
  ) as data
FROM user_info ui
LEFT JOIN current_orders co ON co.cashier_id = ui.id;
*/
