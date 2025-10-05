-- Add Items to Existing Package
-- Run this in Supabase SQL Editor

-- First, let's see what products you have available
SELECT id, name, sku, base_price 
FROM products 
WHERE is_active = true
LIMIT 20;

-- Check your VIP Party Package
SELECT * FROM packages WHERE package_code = 'PKG-002';

-- Check if it already has items
SELECT pi.*, p.name as product_name
FROM package_items pi
JOIN products p ON pi.product_id = p.id
WHERE pi.package_id = 'a50e8400-e29b-41d4-a716-446655440002';

-- If no items returned above, ADD ITEMS NOW:
-- (Replace 'PRODUCT-ID-1' and 'PRODUCT-ID-2' with actual product IDs from the first query)

-- Example: Add 10 beers to the package
INSERT INTO package_items (
  id,
  package_id,
  product_id,
  quantity,
  is_choice_item,
  choice_group,
  display_order
) VALUES
  -- Replace with your actual beer product ID
  (gen_random_uuid(), 'a50e8400-e29b-41d4-a716-446655440002', 'YOUR-BEER-PRODUCT-ID', 10, false, null, 0),
  -- Replace with your actual appetizer product ID
  (gen_random_uuid(), 'a50e8400-e29b-41d4-a716-446655440002', 'YOUR-APPETIZER-ID-1', 1, false, null, 1),
  -- Replace with your second appetizer product ID
  (gen_random_uuid(), 'a50e8400-e29b-41d4-a716-446655440002', 'YOUR-APPETIZER-ID-2', 1, false, null, 2);

-- Verify items were added
SELECT 
  p.name as package_name,
  pi.quantity,
  prod.name as product_name,
  prod.base_price
FROM packages p
JOIN package_items pi ON p.id = pi.package_id
JOIN products prod ON pi.product_id = prod.id
WHERE p.id = 'a50e8400-e29b-41d4-a716-446655440002';

-- Expected result: Should show 3 rows (10 beers + 2 appetizers)
