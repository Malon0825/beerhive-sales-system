import { NextRequest, NextResponse } from 'next/server';
import { TableRepository } from '@/data/repositories/TableRepository';
import { TableService } from '@/core/services/tables/TableService';
import { TableStatus } from '@/models/enums/TableStatus';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { requireRole, requireManagerOrAbove } from '@/lib/utils/api-auth';
import { UserRole } from '@/models/enums/UserRole';

/**
 * GET /api/tables/[tableId]
 * Get table by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    // Authorization: allow staff including waiter to view a table
    await requireRole(request, [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER]);

    const table = await TableRepository.getById(tableId);

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
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const body = await request.json();
    
    let table;

    // Handle specific actions
    if (body.action) {
      switch (body.action) {
        case 'occupy':
          // Authorization: occupy allowed for cashier, manager, admin, waiter (expanded)
          await requireRole(request, [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER]);
          // If no order ID provided, just mark as occupied (for walk-ins)
          if (body.orderId) {
            table = await TableService.occupyTable(tableId, body.orderId, supabaseAdmin);
          } else {
            // Just update status to occupied without linking to an order
            table = await TableRepository.updateStatus(tableId, TableStatus.OCCUPIED, supabaseAdmin);
          }
          break;

        case 'release':
          // Authorization: release allowed for cashier, manager, admin, waiter (expanded)
          await requireRole(request, [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER]);
          table = await TableService.releaseTable(tableId, supabaseAdmin);
          break;

        case 'markCleaned':
          // Authorization: waiter can mark cleaned (plus manager/admin)
          await requireRole(request, [UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER]);
          table = await TableService.markCleaned(tableId, supabaseAdmin);
          break;

        case 'reserve':
          // Authorization: reservations are manager/admin only
          await requireManagerOrAbove(request);
          table = await TableService.reserveTable(tableId, body.notes, supabaseAdmin);
          break;

        case 'cancelReservation':
          // Authorization: manager/admin only
          await requireManagerOrAbove(request);
          table = await TableService.cancelReservation(tableId, supabaseAdmin);
          break;

        case 'deactivate':
          // Authorization: manager/admin only
          await requireManagerOrAbove(request);
          table = await TableRepository.deactivate(tableId, supabaseAdmin);
          break;

        case 'reactivate':
          // Authorization: manager/admin only
          await requireManagerOrAbove(request);
          table = await TableRepository.reactivate(tableId, supabaseAdmin);
          break;

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          );
      }
    } else {
      // Regular update
      // Authorization: regular updates restricted to manager/admin
      await requireManagerOrAbove(request);
      table = await TableRepository.update(tableId, body);
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
