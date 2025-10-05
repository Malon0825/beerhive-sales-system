import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/core/services/notifications/NotificationService';

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await NotificationService.markAllAsRead(userId);

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
