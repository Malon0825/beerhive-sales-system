/**
 * Reorder Recommendations API Endpoint
 * 
 * Returns smart reorder recommendations considering both direct sales
 * and package component consumption for accurate demand forecasting
 * 
 * @route GET /api/inventory/reorder-recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { InventoryReportService } from '@/core/services/reports/InventoryReport';
import { subDays } from 'date-fns';

/**
 * GET /api/inventory/reorder-recommendations
 * 
 * Query Parameters:
 * - days: Number of days to analyze (default: 30)
 * - buffer: Buffer days for reorder calculation (default: 14)
 * - startDate: Custom start date (ISO format)
 * - endDate: Custom end date (ISO format)
 * - priority: Filter by priority (urgent|high|normal)
 * 
 * Response Format:
 * {
 *   "success": true,
 *   "data": {
 *     "recommendations": [...],
 *     "summary": {
 *       "total_products": number,
 *       "urgent_count": number,
 *       "high_priority_count": number,
 *       "normal_count": number
 *     },
 *     "metadata": {
 *       "start_date": string,
 *       "end_date": string,
 *       "days_analyzed": number,
 *       "buffer_days": number
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const days = parseInt(searchParams.get('days') || '30', 10);
    const bufferDays = parseInt(searchParams.get('buffer') || '14', 10);
    const priorityFilter = searchParams.get('priority') as 'urgent' | 'high' | 'normal' | null;
    
    // Calculate date range
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const startDate = searchParams.get('startDate') || subDays(new Date(endDate), days).toISOString();
    
    // Validate parameters
    if (days < 1 || days > 365) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Days parameter must be between 1 and 365',
          },
        },
        { status: 400 }
      );
    }
    
    if (bufferDays < 1 || bufferDays > 90) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Buffer days must be between 1 and 90',
          },
        },
        { status: 400 }
      );
    }
    
    // Fetch recommendations
    const recommendations = await InventoryReportService.getSmartReorderRecommendations({
      startDate,
      endDate,
      bufferDays,
    });
    
    // Apply priority filter if specified
    let filteredRecommendations = recommendations;
    if (priorityFilter) {
      filteredRecommendations = recommendations.filter(
        (rec) => rec.priority === priorityFilter
      );
    }
    
    // Calculate summary statistics
    const summary = {
      total_products: recommendations.length,
      urgent_count: recommendations.filter((r) => r.priority === 'urgent').length,
      high_priority_count: recommendations.filter((r) => r.priority === 'high').length,
      normal_count: recommendations.filter((r) => r.priority === 'normal').length,
    };
    
    // Calculate days analyzed
    const daysDiff = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return NextResponse.json({
      success: true,
      data: {
        recommendations: filteredRecommendations,
        summary,
        metadata: {
          start_date: startDate,
          end_date: endDate,
          days_analyzed: daysDiff,
          buffer_days: bufferDays,
          priority_filter: priorityFilter,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching reorder recommendations:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch reorder recommendations',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
