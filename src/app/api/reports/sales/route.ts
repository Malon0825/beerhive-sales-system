/**
 * Sales Reports API Route
 * GET /api/reports/sales - Get sales reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { SalesReportService } from '@/core/services/reports/SalesReport';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'summary';
    const period = searchParams.get('period') as any;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const params = {
      period,
      startDate,
      endDate,
      limit,
    };

    let data;

    switch (reportType) {
      case 'summary':
        data = await SalesReportService.getSalesSummary(params);
        break;

      case 'daily':
        data = await SalesReportService.getDailySales(params);
        break;

      case 'detailed':
        data = await SalesReportService.getSalesByDateRange(params);
        break;

      case 'top-products':
        data = await SalesReportService.getTopProducts(params);
        break;

      case 'payment-methods':
        data = await SalesReportService.getSalesByPaymentMethod(params);
        break;

      case 'categories':
        data = await SalesReportService.getSalesByCategory(params);
        break;

      case 'cashiers':
        data = await SalesReportService.getSalesByCashier(params);
        break;

      case 'hourly':
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        data = await SalesReportService.getHourlySales(date);
        break;

      case 'comprehensive':
        data = await SalesReportService.getComprehensiveReport(params);
        break;

      case 'comparison':
        const currentStartDate = searchParams.get('currentStartDate');
        const currentEndDate = searchParams.get('currentEndDate');
        const previousStartDate = searchParams.get('previousStartDate');
        const previousEndDate = searchParams.get('previousEndDate');

        if (!currentStartDate || !currentEndDate || !previousStartDate || !previousEndDate) {
          return NextResponse.json(
            { error: 'Comparison requires currentStartDate, currentEndDate, previousStartDate, and previousEndDate' },
            { status: 400 }
          );
        }

        data = await SalesReportService.getSalesComparison(
          { startDate: currentStartDate, endDate: currentEndDate },
          { startDate: previousStartDate, endDate: previousEndDate }
        );
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
        period,
        startDate,
        endDate,
      },
    });
  } catch (error: any) {
    console.error('Sales report error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate sales report',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
