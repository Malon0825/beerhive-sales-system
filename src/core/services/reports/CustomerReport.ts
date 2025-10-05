/**
 * Customer Report Service
 * Business logic for generating customer analytics reports
 */

import { getCustomerVisitFrequency } from '@/data/queries/reports.queries';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { subDays } from 'date-fns';

export interface CustomerReportParams {
  startDate?: string;
  endDate?: string;
}

export interface CustomerAnalytics {
  customer_id: string;
  customer_name: string;
  tier: string;
  visit_count: number;
  total_spent: number;
  average_order_value: number;
  last_visit?: string;
  loyalty_points?: number;
}

export interface CustomerSummary {
  total_customers: number;
  active_customers: number;
  new_customers: number;
  vip_customers: number;
  total_loyalty_points: number;
  average_customer_value: number;
}

export interface TierDistribution {
  tier: string;
  customer_count: number;
  percentage: number;
  total_revenue: number;
  average_spend: number;
}

export class CustomerReportService {
  /**
   * Get customer visit frequency and spending patterns
   */
  static async getCustomerAnalytics(
    params: CustomerReportParams = {}
  ): Promise<CustomerAnalytics[]> {
    const endDate = params.endDate || new Date().toISOString();
    const startDate = params.startDate || subDays(new Date(endDate), 30).toISOString();

    return await getCustomerVisitFrequency(startDate, endDate);
  }

  /**
   * Get top customers by spending
   */
  static async getTopCustomers(params: CustomerReportParams & { limit?: number } = {}) {
    const analytics = await this.getCustomerAnalytics(params);
    const limit = params.limit || 10;

    return analytics
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, limit);
  }

  /**
   * Get most frequent customers by visit count
   */
  static async getMostFrequentCustomers(params: CustomerReportParams & { limit?: number } = {}) {
    const analytics = await this.getCustomerAnalytics(params);
    const limit = params.limit || 10;

    return analytics
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, limit);
  }

  /**
   * Get customer tier distribution
   */
  static async getTierDistribution(params: CustomerReportParams = {}): Promise<TierDistribution[]> {

    const { data: customers, error } = await supabaseAdmin
      .from('customers')
      .select('id, tier, total_spent')
      .eq('is_active', true);

    if (error) throw error;

    const tierMap = new Map();
    const totalCustomers = customers.length;

    customers.forEach((customer: any) => {
      const tier = customer.tier || 'regular';
      if (!tierMap.has(tier)) {
        tierMap.set(tier, {
          tier,
          customer_count: 0,
          total_revenue: 0,
        });
      }
      const tierData = tierMap.get(tier);
      tierData.customer_count += 1;
      tierData.total_revenue += parseFloat(customer.total_spent || 0);
    });

    return Array.from(tierMap.values()).map((tier: any) => ({
      ...tier,
      percentage: (tier.customer_count / totalCustomers) * 100,
      average_spend: tier.customer_count > 0 ? tier.total_revenue / tier.customer_count : 0,
    }));
  }

  /**
   * Get new customers in period
   */
  static async getNewCustomers(params: CustomerReportParams = {}) {
    const endDate = params.endDate || new Date().toISOString();
    const startDate = params.startDate || subDays(new Date(endDate), 30).toISOString();

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('id, customer_number, full_name, tier, created_at, phone, email')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Get customer retention metrics
   */
  static async getCustomerRetention(params: CustomerReportParams = {}) {
    const endDate = params.endDate || new Date().toISOString();
    const startDate = params.startDate || subDays(new Date(endDate), 30).toISOString();

    // Get customers who made purchases in the period
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('customer_id, completed_at')
      .gte('completed_at', startDate)
      .lte('completed_at', endDate)
      .eq('status', 'completed')
      .not('customer_id', 'is', null);

    if (error) throw error;

    // Calculate return customers (more than 1 visit)
    const customerVisits = new Map();
    orders.forEach((order: any) => {
      const count = customerVisits.get(order.customer_id) || 0;
      customerVisits.set(order.customer_id, count + 1);
    });

    const totalCustomers = customerVisits.size;
    const returningCustomers = Array.from(customerVisits.values()).filter(count => count > 1).length;
    const oneTimeCustomers = totalCustomers - returningCustomers;

    return {
      total_customers: totalCustomers,
      returning_customers: returningCustomers,
      one_time_customers: oneTimeCustomers,
      retention_rate: totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0,
    };
  }

  /**
   * Get customer lifetime value analysis
   */
  static async getCustomerLifetimeValue() {

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select(`
        id,
        customer_number,
        full_name,
        tier,
        total_spent,
        visit_count,
        created_at,
        last_visit_date
      `)
      .eq('is_active', true)
      .order('total_spent', { ascending: false });

    if (error) throw error;

    return data.map((customer: any) => {
      const accountAge = customer.created_at
        ? Math.ceil(
            (new Date().getTime() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      return {
        ...customer,
        lifetime_value: parseFloat(customer.total_spent || 0),
        average_order_value:
          customer.visit_count > 0 ? parseFloat(customer.total_spent || 0) / customer.visit_count : 0,
        account_age_days: accountAge,
        value_per_day: accountAge > 0 ? parseFloat(customer.total_spent || 0) / accountAge : 0,
      };
    });
  }

  /**
   * Get customer summary statistics
   */
  static async getCustomerSummary(params: CustomerReportParams = {}): Promise<CustomerSummary> {

    const endDate = params.endDate || new Date().toISOString();
    const startDate = params.startDate || subDays(new Date(endDate), 30).toISOString();

    const [allCustomers, newCustomers, activeCustomers] = await Promise.all([
      supabaseAdmin.from('customers').select('tier, loyalty_points, total_spent').eq('is_active', true),
      this.getNewCustomers(params),
      supabaseAdmin
        .from('orders')
        .select('customer_id')
        .gte('completed_at', startDate)
        .lte('completed_at', endDate)
        .eq('status', 'completed')
        .not('customer_id', 'is', null),
    ]);

    if (allCustomers.error) throw allCustomers.error;
    if (activeCustomers.error) throw activeCustomers.error;

    const vipCount = allCustomers.data.filter(
      (c: any) => c.tier && c.tier !== 'regular'
    ).length;

    const totalLoyaltyPoints = allCustomers.data.reduce(
      (sum: number, c: any) => sum + (c.loyalty_points || 0),
      0
    );

    const totalValue = allCustomers.data.reduce(
      (sum: number, c: any) => sum + parseFloat(c.total_spent || 0),
      0
    );

    const uniqueActiveCustomers = new Set(
      activeCustomers.data.map((o: any) => o.customer_id)
    ).size;

    return {
      total_customers: allCustomers.data.length,
      active_customers: uniqueActiveCustomers,
      new_customers: newCustomers.length,
      vip_customers: vipCount,
      total_loyalty_points: totalLoyaltyPoints,
      average_customer_value:
        allCustomers.data.length > 0 ? totalValue / allCustomers.data.length : 0,
    };
  }

  /**
   * Get customers at risk (haven't visited recently)
   */
  static async getCustomersAtRisk(daysSinceLastVisit = 60) {
    const thresholdDate = subDays(new Date(), daysSinceLastVisit).toISOString();

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select(`
        id,
        customer_number,
        full_name,
        tier,
        phone,
        email,
        last_visit_date,
        total_spent,
        visit_count
      `)
      .lt('last_visit_date', thresholdDate)
      .eq('is_active', true)
      .order('last_visit_date', { ascending: true });

    if (error) throw error;

    return data.map((customer: any) => {
      const daysSinceVisit = customer.last_visit_date
        ? Math.ceil(
            (new Date().getTime() - new Date(customer.last_visit_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      return {
        ...customer,
        days_since_last_visit: daysSinceVisit,
        risk_level:
          daysSinceVisit && daysSinceVisit > 90
            ? 'high'
            : daysSinceVisit && daysSinceVisit > 60
            ? 'medium'
            : 'low',
      };
    });
  }

  /**
   * Get comprehensive customer report
   */
  static async getComprehensiveReport(params: CustomerReportParams = {}) {
    const [summary, topCustomers, frequentCustomers, tierDistribution, retention, newCustomers] =
      await Promise.all([
        this.getCustomerSummary(params),
        this.getTopCustomers({ ...params, limit: 10 }),
        this.getMostFrequentCustomers({ ...params, limit: 10 }),
        this.getTierDistribution(params),
        this.getCustomerRetention(params),
        this.getNewCustomers(params),
      ]);

    return {
      summary,
      top_customers: topCustomers,
      frequent_customers: frequentCustomers,
      tier_distribution: tierDistribution,
      retention_metrics: retention,
      new_customers: newCustomers,
    };
  }
}
