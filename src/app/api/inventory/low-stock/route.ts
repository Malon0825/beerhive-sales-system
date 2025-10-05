import { NextRequest, NextResponse } from 'next/server';
import { LowStockAlert } from '@/core/services/inventory/LowStockAlert';
import { AppError } from '@/lib/errors/AppError';

/**
 * GET /api/inventory/low-stock
 * Get low stock alerts and recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    let data;

    switch (type) {
      case 'critical':
        data = await LowStockAlert.getCriticalAlerts();
        break;
      case 'summary':
        data = await LowStockAlert.getAlertSummary();
        break;
      case 'recommendations':
        data = await LowStockAlert.getReorderRecommendations();
        break;
      default:
        data = await LowStockAlert.getLowStockAlerts();
    }

    return NextResponse.json({
      success: true,
      data,
      count: Array.isArray(data) ? data.length : undefined,
    });
  } catch (error) {
    console.error('Get low stock error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch low stock data' },
      { status: 500 }
    );
  }
}
