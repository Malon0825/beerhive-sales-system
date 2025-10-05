/**
 * Audit Logs Filters API Route
 * GET /api/audit-logs/filters - Get available filter options
 */

import { NextResponse } from 'next/server';
import { AuditLogRepository } from '@/data/repositories/AuditLogRepository';
import { supabaseAdmin } from '@/data/supabase/server-client';

export async function GET() {
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch filter options
    const [actionTypes, tableNames] = await Promise.all([
      AuditLogRepository.getActionTypes(),
      AuditLogRepository.getTableNames(),
    ]);

    // Get list of users for filtering
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, full_name, username')
      .eq('is_active', true)
      .order('full_name');

    return NextResponse.json({
      success: true,
      data: {
        actions: actionTypes,
        tables: tableNames,
        users: users || [],
      },
    });
  } catch (error) {
    console.error('Error fetching audit log filters:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch filter options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
