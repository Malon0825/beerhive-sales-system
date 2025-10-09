import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/core/services/users/UserService';
import { AppError } from '@/lib/errors/AppError';
import { requireManagerOrAbove } from '@/lib/utils/api-auth';

/**
 * POST /api/users/[userId]/deactivate
 * Deactivate user (Admin/Manager only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify user has manager or admin role
    await requireManagerOrAbove(request);
    
    const { userId } = await params;

    await UserService.deactivateUser(userId);

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    console.error('POST /api/users/[userId]/deactivate error:', error);
    
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
