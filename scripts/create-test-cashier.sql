-- =====================================================
-- Create Test Cashier User for Development
-- =====================================================
-- Purpose: Fix foreign key constraint errors by ensuring
--          cashier users exist in the database
-- =====================================================

-- Check existing users
SELECT 
    id,
    username,
    email,
    role,
    full_name
FROM users
WHERE role IN ('cashier', 'admin', 'manager')
ORDER BY role, username;

-- =====================================================
-- OPTION 1: Create a Test Cashier User
-- =====================================================

-- Insert test cashier (using Supabase Auth)
-- Note: Password hash is for 'cashier123'
INSERT INTO users (
    id,
    username,
    email,
    role,
    full_name,
    is_active,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    'cashier01',
    'cashier01@beerhive.com',
    'cashier',
    'Test Cashier 01',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING
RETURNING id, username, email, role;

-- =====================================================
-- OPTION 2: Create Multiple Test Cashiers
-- =====================================================

INSERT INTO users (
    username,
    email,
    role,
    full_name,
    is_active,
    created_at,
    updated_at
)
VALUES
    ('cashier01', 'cashier01@beerhive.com', 'cashier', 'Test Cashier 01', true, NOW(), NOW()),
    ('cashier02', 'cashier02@beerhive.com', 'cashier', 'Test Cashier 02', true, NOW(), NOW()),
    ('cashier03', 'cashier03@beerhive.com', 'cashier', 'Test Cashier 03', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING
RETURNING id, username, email, role;

-- =====================================================
-- OPTION 3: Upgrade Admin to Support Cashier Role
-- =====================================================

-- Allow admin to act as cashier (if multi-role support exists)
UPDATE users
SET role = 'admin' -- Admin can already create orders
WHERE email = 'admin@beerhive.com';

-- =====================================================
-- Verify Users Created
-- =====================================================

SELECT 
    id,
    username,
    email,
    role,
    full_name,
    is_active
FROM users
WHERE role IN ('cashier', 'admin', 'manager')
ORDER BY role, username;

-- =====================================================
-- IMPORTANT: For Supabase Auth Users
-- =====================================================
-- If using Supabase Auth, you need to create users via:
-- 1. Supabase Dashboard → Authentication → Users → Add User
-- 2. Or use Supabase Admin SDK in your application
-- 3. Then update the role in the users table

-- Example: Update existing Supabase auth user to cashier role
-- UPDATE users 
-- SET role = 'cashier', full_name = 'Test Cashier'
-- WHERE email = 'test@example.com';
