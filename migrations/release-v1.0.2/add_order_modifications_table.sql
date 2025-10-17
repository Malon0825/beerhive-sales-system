-- Migration: Add order modifications audit trail
-- Purpose: Track all order modifications (quantity changes, item removals) for compliance and reporting
-- Author: Order Modification System
-- Date: 2025-01-17

-- Create order_modifications table for audit trail
CREATE TABLE IF NOT EXISTS order_modifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  modification_type TEXT NOT NULL CHECK (modification_type IN ('quantity_reduced', 'item_removed', 'quantity_increased')),
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  amount_adjusted NUMERIC(10, 2) NOT NULL DEFAULT 0,
  modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  kitchen_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_order_modifications_order_id ON order_modifications(order_id);
CREATE INDEX idx_order_modifications_created_at ON order_modifications(created_at DESC);
CREATE INDEX idx_order_modifications_modified_by ON order_modifications(modified_by);
CREATE INDEX idx_order_modifications_type ON order_modifications(modification_type);

-- Add comments
COMMENT ON TABLE order_modifications IS 'Audit trail for all order modifications (quantity changes, removals)';
COMMENT ON COLUMN order_modifications.modification_type IS 'Type of modification: quantity_reduced, item_removed, or quantity_increased';
COMMENT ON COLUMN order_modifications.old_value IS 'Previous value before modification';
COMMENT ON COLUMN order_modifications.new_value IS 'New value after modification';
COMMENT ON COLUMN order_modifications.amount_adjusted IS 'Financial amount adjusted (positive for refunds)';
COMMENT ON COLUMN order_modifications.kitchen_status IS 'Status of item in kitchen at time of modification';

-- Enable RLS
ALTER TABLE order_modifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Staff can view all modifications
CREATE POLICY "Staff can view modifications"
  ON order_modifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager', 'cashier')
    )
  );

-- RLS Policy: Service role can insert modifications
CREATE POLICY "Service role can insert modifications"
  ON order_modifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON order_modifications TO authenticated;
GRANT ALL ON order_modifications TO service_role;
