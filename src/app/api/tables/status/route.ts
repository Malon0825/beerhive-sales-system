import { NextRequest, NextResponse } from 'next/server';
import { TableRepository } from '@/data/repositories/TableRepository';
import { TableStatus } from '@/models/enums/TableStatus';
import { AppError } from '@/lib/errors/AppError';

/**
 * PATCH /api/tables/status
 * Bulk update table statuses
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.tableIds || !Array.isArray(body.tableIds)) {
      return NextResponse.json(
        { success: false, error: 'Table IDs array required' },
        { status: 400 }
      );
    }

    if (!body.status || !Object.values(TableStatus).includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status required' },
        { status: 400 }
      );
    }

    const updates = await Promise.all(
      body.tableIds.map((tableId: string) =>
        TableRepository.updateStatus(tableId, body.status)
      )
    );

    return NextResponse.json({
      success: true,
      data: updates,
      count: updates.length,
    });
  } catch (error) {
    console.error('PATCH /api/tables/status error:', error);
    
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
