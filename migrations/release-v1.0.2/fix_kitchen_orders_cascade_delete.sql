-- Migration: Fix kitchen_orders foreign key constraint
-- Purpose: Allow cancelled kitchen orders to remain visible even after order_item is deleted
-- Author: Bug Fix - Cancelled Order Visibility
-- Date: 2025-10-20

-- Drop the existing foreign key constraint
ALTER TABLE kitchen_orders 
DROP CONSTRAINT IF EXISTS kitchen_orders_order_item_id_fkey;

-- Add the new constraint with ON DELETE SET NULL
-- This allows cancelled kitchen orders to stay visible in kitchen/bartender displays
-- even after the order item has been removed
ALTER TABLE kitchen_orders
ADD CONSTRAINT kitchen_orders_order_item_id_fkey 
FOREIGN KEY (order_item_id) 
REFERENCES order_items(id) 
ON DELETE SET NULL;

-- Update the column to allow NULL values (if not already)
ALTER TABLE kitchen_orders
ALTER COLUMN order_item_id DROP NOT NULL;

COMMENT ON CONSTRAINT kitchen_orders_order_item_id_fkey ON kitchen_orders IS 
'Foreign key with ON DELETE SET NULL to preserve cancelled kitchen orders for staff visibility';
