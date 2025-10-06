import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/core/services/notifications/NotificationService';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/count
 * Get unread notification count for current user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const count = await NotificationService.getUnreadCount(userId);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification count' },
      { status: 500 }
    );
  }
}
