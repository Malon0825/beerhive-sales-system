/**
 * Sales Report Service
 * Business logic for generating sales reports
 */

import {
  getSalesByDateRange,
  getDailySalesSummary,
  getSalesByHour,
  getTopProducts,
  getSalesByPaymentMethod,
  getSalesByCategory,
  getSalesByCashier,
  getAllProductsSold as queryGetAllProductsSold,
  getAllProductsAndPackagesSold,
  getAllProductsSoldCombined,
} from '@/data/queries/reports.queries';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface SalesReportParams {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
}

export interface DailySalesData {
  date: string;
  total_revenue: number;
  transaction_count: number;
  total_discounts: number;
  unique_customers: number;
  average_transaction: number;
}

export interface SalesSummary {
  total_revenue: number;
  total_transactions: number;
  average_transaction_value: number;
  total_discounts: number;
  net_revenue: number;
}

export class SalesReportService {
  /**
   * Get date range based on period
   * 
   * For custom periods, timestamp strings are passed through directly to preserve
   * explicit timezone information (e.g., +08:00). This prevents timezone conversion
   * bugs and maintains precision for custom date range queries.
   */
  private static getDateRange(params: SalesReportParams): { startDate: string; endDate: string } {
    // If startDate and endDate are provided as strings (with explicit timezone),
    // pass them through directly without parsing/converting, regardless of period.
    if (params.startDate && params.endDate) {
      return {
        startDate: params.startDate,
        endDate: params.endDate,
      };
    }

    // For period-based ranges, calculate dates and convert to ISO
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (params.period) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        break;
      case 'week':
        startDate = startOfDay(subDays(now, 7));
        endDate = endOfDay(now);
        break;
      case 'month':
        startDate = startOfDay(subDays(now, 30));
        endDate = endOfDay(now);
        break;
      default:
        startDate = startOfDay(subDays(now, 30));
        endDate = endOfDay(now);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  /**
   * Get daily sales report
   */
  static async getDailySales(params: SalesReportParams = {}): Promise<DailySalesData[]> {
    const { startDate, endDate } = this.getDateRange(params);
    return await getDailySalesSummary(startDate, endDate);
  }

  /**
   * Get sales by date range with detailed transactions
   */
  static async getSalesByDateRange(params: SalesReportParams) {
    const { startDate, endDate } = this.getDateRange(params);
    return await getSalesByDateRange(startDate, endDate);
  }

  /**
   * Get sales summary totals
   */
  static async getSalesSummary(params: SalesReportParams = {}): Promise<SalesSummary> {
    const { startDate, endDate } = this.getDateRange(params);
    const orders = await getSalesByDateRange(startDate, endDate);

    const totals = orders.reduce(
      (acc, order) => {
        acc.total_revenue += parseFloat(order.total_amount as any);
        acc.total_discounts += parseFloat((order.discount_amount as any) || 0);
        acc.total_transactions += 1;
        return acc;
      },
      { total_revenue: 0, total_discounts: 0, total_transactions: 0 }
    );

    return {
      total_revenue: totals.total_revenue,
      total_transactions: totals.total_transactions,
      average_transaction_value:
        totals.total_transactions > 0 ? totals.total_revenue / totals.total_transactions : 0,
      total_discounts: totals.total_discounts,
      net_revenue: totals.total_revenue - totals.total_discounts,
    };
  }

  /**
   * Get top selling products
   */
  static async getTopProducts(params: SalesReportParams & { limit?: number } = {}) {
    const { startDate, endDate } = this.getDateRange(params);
    const limit = params.limit || 10;
    return await getTopProducts(startDate, endDate, limit);
  }

  /**
   * Get sales breakdown by payment method
   */
  static async getSalesByPaymentMethod(params: SalesReportParams = {}) {
    const { startDate, endDate } = this.getDateRange(params);
    return await getSalesByPaymentMethod(startDate, endDate);
  }

  /**
   * Get sales breakdown by category
   */
  static async getSalesByCategory(params: SalesReportParams = {}) {
    const { startDate, endDate } = this.getDateRange(params);
    return await getSalesByCategory(startDate, endDate);
  }

  /**
   * Get sales breakdown by cashier
   */
  static async getSalesByCashier(params: SalesReportParams = {}) {
    const { startDate, endDate } = this.getDateRange(params);
    return await getSalesByCashier(startDate, endDate);
  }

  /**
   * Get all products sold within the range (no limit)
   */
  static async getAllProductsSold(params: SalesReportParams = {}) {
    const { startDate, endDate } = this.getDateRange(params);
    return await queryGetAllProductsSold(startDate, endDate);
  }

  /**
   * Get hourly sales for a specific date
   */
  static async getHourlySales(date: string) {
    const formattedDate = format(new Date(date), 'yyyy-MM-dd');
    return await getSalesByHour(formattedDate);
  }

  /**
   * Get sales comparison between two periods
   */
  static async getSalesComparison(
    currentPeriod: SalesReportParams,
    previousPeriod: SalesReportParams
  ) {
    const [currentSummary, previousSummary] = await Promise.all([
      this.getSalesSummary(currentPeriod),
      this.getSalesSummary(previousPeriod),
    ]);

    const revenueChange = currentSummary.total_revenue - previousSummary.total_revenue;
    const revenueChangePercent =
      previousSummary.total_revenue > 0
        ? (revenueChange / previousSummary.total_revenue) * 100
        : 0;

    const transactionChange =
      currentSummary.total_transactions - previousSummary.total_transactions;
    const transactionChangePercent =
      previousSummary.total_transactions > 0
        ? (transactionChange / previousSummary.total_transactions) * 100
        : 0;

    return {
      current: currentSummary,
      previous: previousSummary,
      changes: {
        revenue: revenueChange,
        revenuePercent: revenueChangePercent,
        transactions: transactionChange,
        transactionsPercent: transactionChangePercent,
      },
    };
  }

  /**
   * Get comprehensive sales report
   */
  static async getComprehensiveReport(params: SalesReportParams = {}) {
    const [summary, dailySales, topProducts, paymentMethods, categories, cashiers, allProductsSold, allProductsAndPackagesSold, allProductsSoldCombined] =
      await Promise.all([
        this.getSalesSummary(params),
        this.getDailySales(params),
        this.getTopProducts({ ...params, limit: 10 }),
        this.getSalesByPaymentMethod(params),
        this.getSalesByCategory(params),
        this.getSalesByCashier(params),
        this.getAllProductsSold(params),
        (async () => {
          const { startDate, endDate } = this.getDateRange(params);
          return await getAllProductsAndPackagesSold(startDate, endDate);
        })(),
        (async () => {
          const { startDate, endDate } = this.getDateRange(params);
          return await getAllProductsSoldCombined(startDate, endDate);
        })(),
      ]);

    return {
      summary,
      daily_sales: dailySales,
      top_products: topProducts,
      payment_methods: paymentMethods,
      categories,
      cashiers,
      // Keep package-inclusive dataset exposed for backwards compatibility
      all_products_sold: allProductsAndPackagesSold,
      // Standalone view should list actual individual products only
      all_products_sold_standalone: allProductsSold,
      // Combined view expands packages into their component products for consumption tracking
      all_products_sold_combined: allProductsSoldCombined,
    };
  }
}
