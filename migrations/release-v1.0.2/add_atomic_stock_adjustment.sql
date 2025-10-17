-- Migration: Add atomic stock adjustment function
-- Purpose: Prevent race conditions in concurrent stock updates
-- Author: Inventory Integrity Fix
-- Date: 2025-01-17

-- Create function for atomic stock adjustment
-- This prevents race conditions by performing the read, validate, and update
-- operations atomically within a single transaction
CREATE OR REPLACE FUNCTION adjust_product_stock_atomic(
  p_product_id UUID,
  p_quantity_change NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_stock NUMERIC;
  v_new_stock NUMERIC;
  v_product_name TEXT;
BEGIN
  -- Lock the product row for update to prevent race conditions
  -- This ensures only one transaction can modify the stock at a time
  SELECT current_stock, name
  INTO v_current_stock, v_product_name
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  -- Check if product exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Product not found'
    );
  END IF;

  -- Calculate new stock
  v_new_stock := COALESCE(v_current_stock, 0) + p_quantity_change;

  -- Validate stock won't go negative
  IF v_new_stock < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Insufficient stock for %s. Current: %s, Requested change: %s, Would result in: %s',
                      v_product_name, v_current_stock, p_quantity_change, v_new_stock)
    );
  END IF;

  -- Update stock atomically
  UPDATE products
  SET 
    current_stock = v_new_stock,
    updated_at = NOW()
  WHERE id = p_product_id;

  -- Return success with before/after values
  RETURN json_build_object(
    'success', true,
    'quantity_before', v_current_stock,
    'quantity_after', v_new_stock,
    'product_name', v_product_name
  );
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION adjust_product_stock_atomic(UUID, NUMERIC) IS 
'Atomically adjusts product stock preventing race conditions. Uses row-level locking to ensure concurrent updates are serialized.';

-- Grant execute permission to authenticated users (adjust based on your RLS policies)
GRANT EXECUTE ON FUNCTION adjust_product_stock_atomic(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_product_stock_atomic(UUID, NUMERIC) TO service_role;
