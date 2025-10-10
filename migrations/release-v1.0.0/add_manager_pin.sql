-- Migration: Add manager PIN field for quick authorization
-- Used for order returns and other quick auth scenarios

-- Add PIN column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_pin VARCHAR(6);

-- Create index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_users_manager_pin ON users(manager_pin) WHERE manager_pin IS NOT NULL;

-- Set default PINs for existing manager/admin users (CHANGE THESE IN PRODUCTION!)
UPDATE users 
SET manager_pin = '123456' 
WHERE role IN ('manager', 'admin') AND manager_pin IS NULL;

-- Add comment
COMMENT ON COLUMN users.manager_pin IS 'Quick 6-digit PIN for manager authorization (order returns, voids, etc.)';

-- Note: In production, implement PIN hashing and rotation policy
