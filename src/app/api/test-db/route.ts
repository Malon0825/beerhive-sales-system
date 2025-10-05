import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * Database Connection Test Endpoint
 * GET /api/test-db
 * 
 * Tests the Supabase database connection and verifies schema
 */
export async function GET() {
  try {
    // Test 1: Check system settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .limit(5);

    if (settingsError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: settingsError.message,
        step: 'Please run the database migration script in Supabase SQL Editor'
      }, { status: 500 });
    }

    // Test 2: Check tables exist
    const tablesToCheck = [
      'users',
      'customers',
      'products',
      'orders',
      'restaurant_tables',
      'kitchen_orders'
    ];

    const tableChecks = await Promise.all(
      tablesToCheck.map(async (table) => {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        return {
          table,
          exists: !error,
          count: count || 0,
          error: error?.message
        };
      })
    );

    const allTablesExist = tableChecks.every(check => check.exists);

    // Test 3: Check admin user exists
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('username, role')
      .eq('role', 'admin')
      .single();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      checks: {
        connection: '✅ Connected to Supabase',
        settings: `✅ System settings table accessible (${settings?.length || 0} settings)`,
        tables: allTablesExist 
          ? '✅ All core tables exist' 
          : '⚠️ Some tables missing',
        adminUser: adminUser 
          ? `✅ Admin user exists: ${adminUser.username}` 
          : '⚠️ Admin user not found',
      },
      tableDetails: tableChecks,
      settings: settings,
      recommendations: allTablesExist 
        ? ['Database is ready!', 'You can proceed to Phase 3']
        : [
          'Some tables are missing',
          'Run the database migration script: docs/Database Structure.sql',
          'Execute in Supabase SQL Editor'
        ]
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message,
      recommendations: [
        'Check your .env.local file has correct Supabase credentials',
        'Verify NEXT_PUBLIC_SUPABASE_URL is set',
        'Verify SUPABASE_SERVICE_ROLE_KEY is set',
        'Restart the development server after changing .env.local'
      ]
    }, { status: 500 });
  }
}
