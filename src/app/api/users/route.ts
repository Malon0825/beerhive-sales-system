import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '@/data/repositories/UserRepository';
import { UserService } from '@/core/services/users/UserService';
import { AppError } from '@/lib/errors/AppError';
import { requireManagerOrAbove } from '@/lib/utils/api-auth';

/**
 * GET /api/users
 * Get all users (Admin/Manager only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user has manager or admin role
    await requireManagerOrAbove(request);
    
    const users = await UserRepository.getAll();

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    
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
 * POST /api/users
 * Create new user (Admin/Manager only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user has manager or admin role
    await requireManagerOrAbove(request);
    
    const body = await request.json();
    const { username, email, password, full_name, role, roles } = body;

    if (!username || !email || !password || !full_name) {
      return NextResponse.json(
        { success: false, error: 'Username, email, password, and full name are required' },
        { status: 400 }
      );
    }
    
    // Require at least one role
    if (!roles && !role) {
      return NextResponse.json(
        { success: false, error: 'At least one role is required' },
        { status: 400 }
      );
    }

    const user = await UserService.createUser({
      username,
      email,
      password,
      full_name,
      role,    // Backward compatibility
      roles,   // Preferred
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/users error:', error);
    
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
