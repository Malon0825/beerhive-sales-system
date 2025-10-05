-- ============================================
-- Database Verification Script
-- Run this in Supabase SQL Editor after migrations
-- ============================================

-- Check all tables exist
SELECT 
    'Tables Created' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 24 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Check all enums exist
SELECT 
    'Enums Created' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 7 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
AND t.typtype = 'e';

-- Check RLS is enabled
SELECT 
    'RLS Enabled' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ PASS' 
        ELSE '⚠️ WARNING' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check policies exist
SELECT 
    'RLS Policies' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ PASS' 
        ELSE '⚠️ WARNING' 
    END as status
FROM pg_policies 
WHERE schemaname = 'public';

-- Check triggers exist
SELECT 
    'Triggers Created' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 10 THEN '✅ PASS' 
        ELSE '❌ FAIL' 
    END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Check indexes exist
SELECT 
    'Indexes Created' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 40 THEN '✅ PASS' 
        ELSE '⚠️ WARNING' 
    END as status
FROM pg_indexes 
WHERE schemaname = 'public';

-- Check views exist
SELECT 
    'Views Created' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ PASS' 
        ELSE '⚠️ WARNING' 
    END as status
FROM information_schema.views 
WHERE table_schema = 'public';

-- List all tables
SELECT 
    'Table: ' || table_name as detail,
    'Created' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check system settings seeded
SELECT 
    'System Settings' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ PASS' 
        ELSE '❌ FAIL - Run seed data' 
    END as status
FROM system_settings;

-- Check admin user created
SELECT 
    'Admin User' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ PASS' 
        ELSE '❌ FAIL - Admin user not created' 
    END as status
FROM users 
WHERE role = 'admin';

-- Summary
SELECT 
    '============================================' as summary;
SELECT 
    'Database verification complete!' as summary;
SELECT 
    'If all checks show ✅ PASS, your database is ready!' as summary;
SELECT 
    '============================================' as summary;
