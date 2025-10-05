-- Migration: Add 'waiter' role to user_role enum
-- Date: 2025-10-05
-- Purpose: Support waiter/server staff who deliver orders

-- Add 'waiter' to the user_role enum type
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'waiter';

-- Verify the change
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'waiter' 
        AND enumtypid = 'user_role'::regtype
    ) THEN
        RAISE NOTICE '✅ Successfully added "waiter" role to user_role enum';
    ELSE
        RAISE EXCEPTION '❌ Failed to add "waiter" role';
    END IF;
END $$;
