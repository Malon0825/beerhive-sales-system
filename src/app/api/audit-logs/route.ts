/**
 * Audit Logs API Route
 * GET /api/audit-logs - Get audit logs with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuditLogRepository } from '@/data/repositories/AuditLogRepository';
import { supabaseAdmin } from '@/data/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin (only admins can view audit logs)
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id') || undefined;
    const action = searchParams.get('action') || undefined;
    const tableName = searchParams.get('table_name') || undefined;
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch audit logs with filters
    const result = await AuditLogRepository.getAll({
      user_id: userId,
      action,
      table_name: tableName,
      start_date: startDate,
      end_date: endDate,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.logs,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch audit logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
