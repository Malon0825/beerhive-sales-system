-- =====================================================
-- Fix Foreign Key Constraint Issues
-- =====================================================
-- Purpose: Diagnose and fix "violates foreign key constraint" errors
-- Specific Error: orders_cashier_id_fkey
-- =====================================================

-- SECTION 1: Diagnose the Problem
-- =====================================================

-- Check the constraint details
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('orders', 'current_orders')
AND kcu.column_name = 'cashier_id';

-- Check for orphaned cashier_ids in orders
SELECT 
    o.id as order_id,
    o.order_number,
    o.cashier_id,
    CASE 
        WHEN u.id IS NULL THEN '❌ Invalid (User not found)'
        ELSE '✅ Valid'
    END as cashier_status,
    u.username,
    u.role
FROM orders o
LEFT JOIN users u ON u.id = o.cashier_id
WHERE o.cashier_id IS NOT NULL
ORDER BY u.id NULLS FIRST;

-- Check for orphaned cashier_ids in current_orders
SELECT 
    co.id as current_order_id,
    co.cashier_id,
    CASE 
        WHEN u.id IS NULL THEN '❌ Invalid (User not found)'
        ELSE '✅ Valid'
    END as cashier_status,
    u.username,
    u.role
FROM current_orders co
LEFT JOIN users u ON u.id = co.cashier_id
WHERE co.cashier_id IS NOT NULL
ORDER BY u.id NULLS FIRST;

-- Check available cashier users
SELECT 
    id,
    username,
    email,
    role,
    full_name,
    is_active
FROM users
WHERE role IN ('cashier', 'admin', 'manager')
AND is_active = true
ORDER BY role, username;

-- =====================================================
-- SECTION 2: Fix Options
-- =====================================================

-- OPTION 1: Create Test Cashier Users (Recommended for Dev)
-- =====================================================

DO $$
DECLARE
    new_cashier_id uuid;
BEGIN
    -- Create a test cashier if none exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'cashier' AND is_active = true) THEN
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
            ('cashier_test', 'cashier.test@beerhive.com', 'cashier', 'Test Cashier (Dev)', true, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
        RETURNING id INTO new_cashier_id;
        
        RAISE NOTICE 'Created test cashier with ID: %', new_cashier_id;
    ELSE
        RAISE NOTICE 'Cashier users already exist';
    END IF;
END $$;

-- OPTION 2: Fix Orphaned Orders (Set to NULL)
-- =====================================================
-- This updates orders with invalid cashier_ids to NULL
-- Safe because DELETE RULE is SET NULL

UPDATE orders
SET cashier_id = NULL
WHERE cashier_id NOT IN (SELECT id FROM users)
AND cashier_id IS NOT NULL;

UPDATE current_orders
SET cashier_id = (SELECT id FROM users WHERE role IN ('cashier', 'admin') LIMIT 1)
WHERE cashier_id NOT IN (SELECT id FROM users)
AND cashier_id IS NOT NULL;

-- OPTION 3: Assign Orphaned Orders to Admin
-- =====================================================
-- Reassign orders with missing cashiers to an admin user

DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get first admin user
    SELECT id INTO admin_user_id
    FROM users
    WHERE role = 'admin' AND is_active = true
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Update orders with invalid cashier_id
        UPDATE orders
        SET cashier_id = admin_user_id
        WHERE cashier_id NOT IN (SELECT id FROM users)
        AND cashier_id IS NOT NULL;
        
        UPDATE current_orders
        SET cashier_id = admin_user_id
        WHERE cashier_id NOT IN (SELECT id FROM users)
        AND cashier_id IS NOT NULL;
        
        RAISE NOTICE 'Assigned orphaned orders to admin: %', admin_user_id;
    ELSE
        RAISE NOTICE 'No admin user found';
    END IF;
END $$;

-- =====================================================
-- SECTION 3: Prevention - Relaxed Constraint (Dev Only)
-- =====================================================

-- WARNING: Only for development environments!
-- This changes DELETE behavior to SET NULL if user is deleted

-- Check current constraint
SELECT 
    conname as constraint_name,
    confdeltype as delete_action,
    CASE confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END as delete_action_description
FROM pg_constraint
WHERE conname LIKE '%cashier_id_fkey%';

-- Already SET NULL, so we're good!

-- =====================================================
-- SECTION 4: Verification
-- =====================================================

-- Verify no orphaned records remain
SELECT 
    'Orders with invalid cashier_id' as issue,
    COUNT(*) as count
FROM orders o
WHERE o.cashier_id IS NOT NULL
AND o.cashier_id NOT IN (SELECT id FROM users)

UNION ALL

SELECT 
    'Current orders with invalid cashier_id' as issue,
    COUNT(*) as count
FROM current_orders co
WHERE co.cashier_id IS NOT NULL
AND co.cashier_id NOT IN (SELECT id FROM users)

UNION ALL

SELECT 
    'Active cashier users' as issue,
    COUNT(*) as count
FROM users
WHERE role = 'cashier' AND is_active = true;

-- =====================================================
-- SECTION 5: Future Prevention
-- =====================================================

-- Create a function to validate cashier_id before insert/update
CREATE OR REPLACE FUNCTION validate_cashier_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cashier_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.cashier_id AND is_active = true) THEN
            RAISE EXCEPTION 'Invalid cashier_id: %. User does not exist or is inactive.', NEW.cashier_id
            USING HINT = 'Ensure the cashier user exists in the users table and is active';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to orders table (optional, for strict validation)
-- Commented out by default - uncomment if needed
/*
DROP TRIGGER IF EXISTS validate_orders_cashier ON orders;
CREATE TRIGGER validate_orders_cashier
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION validate_cashier_id();
*/

-- =====================================================
-- Summary
-- =====================================================

SELECT 
    '═══════════════════════════════════════════════' as summary;
SELECT 
    '📊 FOREIGN KEY CONSTRAINT FIX - SUMMARY' as summary;
SELECT 
    '═══════════════════════════════════════════════' as summary;

SELECT 
    'Total Users' as metric,
    COUNT(*)::text as value
FROM users;

SELECT 
    'Active Cashiers' as metric,
    COUNT(*)::text as value
FROM users
WHERE role = 'cashier' AND is_active = true;

SELECT 
    'Orders' as metric,
    COUNT(*)::text as value
FROM orders;

SELECT 
    'Current Orders' as metric,
    COUNT(*)::text as value
FROM current_orders;

SELECT 
    'Orphaned Orders' as metric,
    COUNT(*)::text as value
FROM orders
WHERE cashier_id NOT IN (SELECT id FROM users)
AND cashier_id IS NOT NULL;

SELECT 
    '═══════════════════════════════════════════════' as summary;

-- =====================================================
-- END OF FIX SCRIPT
-- =====================================================
