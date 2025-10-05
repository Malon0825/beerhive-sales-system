import { NextRequest, NextResponse } from 'next/server';
import { TableRepository } from '@/data/repositories/TableRepository';
import { TableService } from '@/core/services/tables/TableService';
import { TableStatus } from '@/models/enums/TableStatus';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * GET /api/tables/[tableId]
 * Get table by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const table = await TableRepository.getById(params.tableId);

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Table not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: table,
    });
  } catch (error) {
    console.error('GET /api/tables/[tableId] error:', error);
    
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
 * PATCH /api/tables/[tableId]
 * Update table or change status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const body = await request.json();
    
    let table;

    // Handle specific actions
    if (body.action) {
      switch (body.action) {
        case 'occupy':
          // If no order ID provided, just mark as occupied (for walk-ins)
          if (body.orderId) {
            table = await TableService.occupyTable(params.tableId, body.orderId, supabaseAdmin);
          } else {
            // Just update status to occupied without linking to an order
            table = await TableRepository.updateStatus(params.tableId, TableStatus.OCCUPIED, supabaseAdmin);
          }
          break;

        case 'release':
          table = await TableService.releaseTable(params.tableId, supabaseAdmin);
          break;

        case 'markCleaned':
          table = await TableService.markCleaned(params.tableId, supabaseAdmin);
          break;

        case 'reserve':
          table = await TableService.reserveTable(params.tableId, body.notes, supabaseAdmin);
          break;

        case 'cancelReservation':
          table = await TableService.cancelReservation(params.tableId, supabaseAdmin);
          break;

        case 'deactivate':
          table = await TableRepository.deactivate(params.tableId, supabaseAdmin);
          break;

        case 'reactivate':
          table = await TableRepository.reactivate(params.tableId, supabaseAdmin);
          break;

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          );
      }
    } else {
      // Regular update
      table = await TableRepository.update(params.tableId, body);
    }

    return NextResponse.json({
      success: true,
      data: table,
    });
  } catch (error) {
    console.error('PATCH /api/tables/[tableId] error:', error);
    
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
