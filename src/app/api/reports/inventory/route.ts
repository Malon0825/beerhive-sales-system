/**
 * Inventory Reports API Route
 * GET /api/reports/inventory - Get inventory reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { InventoryReportService } from '@/core/services/reports/InventoryReport';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const productId = searchParams.get('productId') || undefined;

    const params = {
      startDate,
      endDate,
      productId,
    };

    let data;

    switch (reportType) {
      case 'summary':
        data = await InventoryReportService.getInventorySummary(params);
        break;

      case 'low-stock':
        data = await InventoryReportService.getLowStockReport();
        break;

      case 'turnover':
        data = await InventoryReportService.getInventoryTurnoverReport(params);
        break;

      case 'slow-moving':
        data = await InventoryReportService.getSlowMovingItems(params);
        break;

      case 'fast-moving':
        data = await InventoryReportService.getFastMovingItems(params);
        break;

      case 'value-by-category':
        data = await InventoryReportService.getInventoryValueByCategory();
        break;

      case 'movements':
        data = await InventoryReportService.getInventoryMovements(params);
        break;

      case 'alerts':
        data = await InventoryReportService.getStockAlerts();
        break;

      case 'comprehensive':
        data = await InventoryReportService.getComprehensiveReport(params);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data,
      reportType,
      params: {
        startDate,
        endDate,
        productId,
      },
    });
  } catch (error: any) {
    console.error('Inventory report error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate inventory report',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
