-- ==========================================================================
-- Migration: add_discount_type_to_orders
-- Release:   v1.1.0
-- Purpose:   Track how discounts are applied on finalized orders for audit
--             and reporting purposes. Adds the discount_type column to the
--             orders table and ensures the supporting enum and index exist.
-- ==========================================================================

-- Create enum for discount type if it does not yet exist
DO $$
BEGIN
    CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'complimentary');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Add discount_type column to orders table (nullable for historical rows)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS discount_type discount_type;

COMMENT ON COLUMN orders.discount_type IS
    'Type of discount applied to the order: percentage, fixed_amount, or complimentary';

-- Index to support analytics/reporting filtered by discount type
CREATE INDEX IF NOT EXISTS idx_orders_discount_type
    ON orders(discount_type)
    WHERE discount_type IS NOT NULL;

-- Confirm migration execution in logs
DO $$
BEGIN
    RAISE NOTICE '✅ Migration: discount_type column ready on orders table';
END
$$;
