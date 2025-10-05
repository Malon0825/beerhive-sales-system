import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/core/services/users/UserService';
import { AppError } from '@/lib/errors/AppError';

/**
 * POST /api/users/[userId]/deactivate
 * Deactivate user (Admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // TODO: Add admin authentication check
    const { userId } = params;

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
