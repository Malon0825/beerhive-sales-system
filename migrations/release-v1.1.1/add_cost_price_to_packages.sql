-- Migration: Add cost_price to packages table
-- Version: v1.1.1
-- Description: Add cost_price column to packages table to enable net income computation for packages in reports

-- Add cost_price column to packages table
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2);

-- Add comment to document the column
COMMENT ON COLUMN packages.cost_price IS 'Cost price of the package used to compute net income in reports. Can be different from sum of individual item costs.';

-- Create index for reporting queries (optional, but helps with performance)
CREATE INDEX IF NOT EXISTS idx_packages_cost_price ON packages(cost_price) WHERE cost_price IS NOT NULL;
