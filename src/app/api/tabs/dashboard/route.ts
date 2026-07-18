import { NextRequest, NextResponse } from 'next/server';
import { TableRepository } from '@/data/repositories/TableRepository';
import { OrderSessionService } from '@/core/services/orders/OrderSessionService';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { requireRole } from '@/lib/utils/api-auth';
import { UserRole } from '@/models/enums/UserRole';
import { AppError } from '@/lib/errors/AppError';

export const dynamic = 'force-dynamic';

/**
 * Initial data for Tab Management in one function invocation. Live changes are
 * applied from Supabase Realtime by the client after this snapshot loads.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.CASHIER,
      UserRole.WAITER,
    ]);

    const [tables, sessions] = await Promise.all([
      TableRepository.getAll(supabaseAdmin),
      OrderSessionService.getAllActiveTabs(),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: { tables, sessions },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/tabs/dashboard error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to load tab dashboard' },
      { status: 500 }
    );
  }
}
