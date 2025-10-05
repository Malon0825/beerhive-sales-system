/**
 * Customer Reports API Route
 * GET /api/reports/customers - Get customer analytics reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { CustomerReportService } from '@/core/services/reports/CustomerReport';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const params = {
      startDate,
      endDate,
      limit,
    };

    let data;

    switch (reportType) {
      case 'summary':
        data = await CustomerReportService.getCustomerSummary(params);
        break;

      case 'analytics':
        data = await CustomerReportService.getCustomerAnalytics(params);
        break;

      case 'top-customers':
        data = await CustomerReportService.getTopCustomers(params);
        break;

      case 'frequent-customers':
        data = await CustomerReportService.getMostFrequentCustomers(params);
        break;

      case 'tier-distribution':
        data = await CustomerReportService.getTierDistribution(params);
        break;

      case 'new-customers':
        data = await CustomerReportService.getNewCustomers(params);
        break;

      case 'retention':
        data = await CustomerReportService.getCustomerRetention(params);
        break;

      case 'lifetime-value':
        data = await CustomerReportService.getCustomerLifetimeValue();
        break;

      case 'at-risk':
        const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 60;
        data = await CustomerReportService.getCustomersAtRisk(days);
        break;

      case 'comprehensive':
        data = await CustomerReportService.getComprehensiveReport(params);
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
      },
    });
  } catch (error: any) {
    console.error('Customer report error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate customer report',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
