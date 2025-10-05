import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Logout current user and clear authentication cookies
 */
export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful',
    });

    // Clear authentication cookies
    response.cookies.delete('auth-token');
    response.cookies.delete('user-roles'); // New multi-role cookie
    response.cookies.delete('user-role');  // Legacy cookie (if exists)

    return response;
  } catch (error) {
    console.error('POST /api/auth/logout error:', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
