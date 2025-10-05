import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '@/data/repositories/UserRepository';
import { UserService } from '@/core/services/users/UserService';
import { AppError } from '@/lib/errors/AppError';
import { requireManagerOrAbove } from '@/lib/utils/api-auth';

/**
 * GET /api/users/[userId]
 * Get user by ID (Admin/Manager only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify user has manager or admin role
    await requireManagerOrAbove(request);
    
    const { userId } = params;

    const user = await UserRepository.getById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('GET /api/users/[userId] error:', error);
    
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
 * PATCH /api/users/[userId]
 * Update user (Admin/Manager only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify user has manager or admin role
    await requireManagerOrAbove(request);
    
    const { userId } = params;
    const body = await request.json();

    const user = await UserService.updateUser(userId, body);

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/users/[userId] error:', error);
    
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
 * DELETE /api/users/[userId]
 * Delete user (Admin/Manager only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify user has manager or admin role
    await requireManagerOrAbove(request);
    
    const { userId } = params;

    await UserRepository.delete(userId);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/users/[userId] error:', error);
    
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
