import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/core/services/users/UserService';
import { AppError } from '@/lib/errors/AppError';
import { requireManagerOrAbove } from '@/lib/utils/api-auth';

/**
 * POST /api/users/[userId]/reset-password
 * Reset user password (Admin/Manager only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify user has manager or admin role
    await requireManagerOrAbove(request);
    
    const { userId } = params;

    const temporaryPassword = await UserService.resetPassword(userId);

    return NextResponse.json({
      success: true,
      temporaryPassword,
      message: 'Password reset successfully. Temporary password generated.',
    });
  } catch (error) {
    console.error('POST /api/users/[userId]/reset-password error:', error);
    
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
