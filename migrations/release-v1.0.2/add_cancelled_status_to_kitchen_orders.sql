-- Migration: Add 'cancelled' status to kitchen_orders
-- Purpose: Support order modification flow where kitchen orders can be cancelled
-- Author: Order Modification System Enhancement
-- Date: 2025-01-17

-- Add 'cancelled' status to kitchen_order_status ENUM type
-- Note: kitchen_orders.status uses PostgreSQL ENUM type, not CHECK constraint

-- Check if 'cancelled' value already exists in the enum
DO $$ 
BEGIN
    -- Add 'cancelled' to the enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'cancelled' 
        AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'kitchen_order_status'
        )
    ) THEN
        ALTER TYPE kitchen_order_status ADD VALUE 'cancelled';
        RAISE NOTICE 'Added cancelled status to kitchen_order_status enum';
    ELSE
        RAISE NOTICE 'cancelled status already exists in kitchen_order_status enum';
    END IF;
END $$;

-- Add comment explaining the new status
COMMENT ON COLUMN kitchen_orders.status IS 'Order status: pending, preparing, ready, served, or cancelled (when customer modifies order)';

-- Add index for cancelled orders (for reporting and cleanup)
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_cancelled 
ON kitchen_orders(status) 
WHERE status = 'cancelled';

COMMENT ON INDEX idx_kitchen_orders_cancelled IS 'Index for quickly finding cancelled kitchen orders for reporting';
