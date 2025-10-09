-- Add product_name field to kitchen_orders table
-- This allows displaying the actual product name (e.g., "Tanduay Select")
-- instead of the package name (e.g., "Ultimate Beer Pack") for package items

-- Add the column
ALTER TABLE kitchen_orders 
ADD COLUMN product_name VARCHAR(200);

-- Add comment for documentation
COMMENT ON COLUMN kitchen_orders.product_name IS 'Name of the actual product to prepare. For packages, this is the individual product name, not the package name.';

-- Create index for filtering/searching by product name
CREATE INDEX idx_kitchen_orders_product_name ON kitchen_orders(product_name);
