import { NextRequest, NextResponse } from 'next/server';
import { TableRepository } from '@/data/repositories/TableRepository';
import { TableService } from '@/core/services/tables/TableService';
import { TableStatus } from '@/models/enums/TableStatus';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * GET /api/tables
 * Get all tables or filter by query params
 * Uses server-side Supabase client for API route context
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as TableStatus | null;
    const area = searchParams.get('area');
    const groupByArea = searchParams.get('groupByArea') === 'true';
    const summary = searchParams.get('summary') === 'true';

    if (summary) {
      const availabilitySummary = await TableService.getAvailabilitySummary(supabaseAdmin);
      return NextResponse.json({
        success: true,
        data: availabilitySummary,
      });
    }

    if (groupByArea) {
      const groupedTables = await TableService.getTablesByArea(supabaseAdmin);
      return NextResponse.json({
        success: true,
        data: groupedTables,
      });
    }

    let tables;

    if (status) {
      tables = await TableRepository.getByStatus(status, supabaseAdmin);
    } else if (area) {
      tables = await TableRepository.getByArea(area, supabaseAdmin);
    } else {
      tables = await TableRepository.getAll(supabaseAdmin);
    }

    return NextResponse.json({
      success: true,
      data: tables,
    });
  } catch (error) {
    console.error('GET /api/tables error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tables
 * Create new table (admin/manager only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Add authentication check for admin/manager role

    const table = await TableRepository.create(body);

    return NextResponse.json({
      success: true,
      data: table,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/tables error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
