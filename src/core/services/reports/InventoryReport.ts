/**
 * Inventory Report Service
 * Business logic for generating inventory reports
 * Includes package-aware consumption analysis for smart reorder recommendations
 */

import { getLowStockItems, getInventoryTurnover } from '@/data/queries/reports.queries';
import { supabaseAdmin } from '@/data/supabase/server-client';
import { subDays, format } from 'date-fns';

export interface InventoryReportParams {
  startDate?: string;
  endDate?: string;
}

export interface LowStockItem {
  id: string;
  sku: string;
  name: string;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  unit_of_measure: string;
  category?: { name: string };
  stock_status: 'out_of_stock' | 'critical' | 'low';
  days_until_stockout?: number;
}

export interface InventoryTurnoverItem {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  quantity_sold: number;
  turnover_rate: number;
  days_to_sell: number | null;
  movement_status: 'fast' | 'medium' | 'slow' | 'stagnant';
}

export interface InventorySummary {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_inventory_value: number;
  average_turnover_rate: number;
}

/**
 * Package component consumption tracking
 */
export interface PackageComponentConsumption {
  product_id: string;
  product_name: string;
  quantity_consumed: number;
  package_id: string;
  package_name: string;
  package_sales: number;
}

/**
 * Product consumption aggregated from all sources
 */
export interface ProductConsumption {
  product_id: string;
  product_name: string;
  current_stock: number;
  direct_sales: number;
  package_consumption: number;
  total_consumed: number;
  package_breakdown: Array<{
    package_id: string;
    package_name: string;
    quantity_consumed: number;
    package_sales: number;
  }>;
}

/**
 * Smart reorder recommendation with package awareness
 */
export interface SmartReorderRecommendation {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  direct_sales: number;
  package_consumption: number;
  total_consumed: number;
  daily_velocity: number;
  days_until_stockout: number;
  recommended_reorder: number;
  priority: 'urgent' | 'high' | 'normal';
  usage_breakdown: Array<{
    package_id: string;
    package_name: string;
    quantity_consumed: number;
    percentage: number;
  }>;
}

export class InventoryReportService {
  /**
   * Get low stock items with enhanced details
   */
  static async getLowStockReport(): Promise<LowStockItem[]> {
    const items = await getLowStockItems();

    return items.map((item: any) => {
      let stock_status: 'out_of_stock' | 'critical' | 'low' = 'low';
      if (item.current_stock <= 0) {
        stock_status = 'out_of_stock';
      } else if (item.current_stock <= item.reorder_point * 0.5) {
        stock_status = 'critical';
      }

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        current_stock: parseFloat(item.current_stock),
        reorder_point: parseFloat(item.reorder_point),
        reorder_quantity: parseFloat(item.reorder_quantity),
        unit_of_measure: item.unit_of_measure,
        category: item.category,
        stock_status,
      };
    });
  }

  /**
   * Get inventory turnover report
   * 
   * If dates are provided, they are passed through directly to preserve timezone info.
   */
  static async getInventoryTurnoverReport(
    params: InventoryReportParams = {}
  ): Promise<InventoryTurnoverItem[]> {
    // If dates are provided, use them directly (preserves timezone offset like +08:00)
    let endDate: string;
    let startDate: string;
    
    if (params.startDate && params.endDate) {
      startDate = params.startDate;
      endDate = params.endDate;
    } else {
      // Fallback: generate default dates (last 30 days)
      endDate = new Date().toISOString();
      startDate = subDays(new Date(endDate), 30).toISOString();
    }

    const turnoverData = await getInventoryTurnover(startDate, endDate);

    return turnoverData.map((item: any) => {
      let movement_status: 'fast' | 'medium' | 'slow' | 'stagnant' = 'stagnant';
      
      if (item.turnover_rate >= 2) {
        movement_status = 'fast';
      } else if (item.turnover_rate >= 1) {
        movement_status = 'medium';
      } else if (item.turnover_rate > 0) {
        movement_status = 'slow';
      }

      return {
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        current_stock: parseFloat(item.current_stock),
        quantity_sold: parseFloat(item.quantity_sold),
        turnover_rate: parseFloat(item.turnover_rate),
        days_to_sell: item.days_to_sell ? parseFloat(item.days_to_sell) : null,
        movement_status,
      };
    });
  }

  /**
   * Get slow-moving items (low turnover)
   */
  static async getSlowMovingItems(params: InventoryReportParams = {}) {
    const turnoverReport = await this.getInventoryTurnoverReport(params);
    
    return turnoverReport
      .filter(item => item.movement_status === 'slow' || item.movement_status === 'stagnant')
      .filter(item => item.current_stock > 0)
      .sort((a, b) => a.turnover_rate - b.turnover_rate);
  }

  /**
   * Get fast-moving items (high turnover)
   */
  static async getFastMovingItems(params: InventoryReportParams = {}) {
    const turnoverReport = await this.getInventoryTurnoverReport(params);
    
    return turnoverReport
      .filter(item => item.movement_status === 'fast')
      .sort((a, b) => b.turnover_rate - a.turnover_rate);
  }

  /**
   * Get inventory value by category
   */
  static async getInventoryValueByCategory() {

    const { data, error } = await supabaseAdmin
      .from('products')
      .select(`
        current_stock,
        cost_price,
        category:category_id(id, name)
      `)
      .eq('is_active', true);

    if (error) throw error;

    // Aggregate by category
    const categoryMap = new Map();
    data.forEach((product: any) => {
      const categoryName = product.category?.name || 'Uncategorized';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          category_name: categoryName,
          total_items: 0,
          total_value: 0,
        });
      }
      const cat = categoryMap.get(categoryName);
      cat.total_items += 1;
      cat.total_value += parseFloat(product.current_stock || 0) * parseFloat(product.cost_price || 0);
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.total_value - a.total_value);
  }

  /**
   * Get inventory movements history
   */
  static async getInventoryMovements(
    params: InventoryReportParams & { productId?: string } = {}
  ) {

    let query = supabaseAdmin
      .from('inventory_movements')
      .select(`
        id,
        movement_type,
        reason,
        quantity_change,
        quantity_before,
        quantity_after,
        unit_cost,
        total_cost,
        reference_number,
        notes,
        created_at,
        product:product_id(id, sku, name),
        performed_by_user:performed_by(full_name)
      `)
      .order('created_at', { ascending: false });

    if (params.productId) {
      query = query.eq('product_id', params.productId);
    }

    if (params.startDate) {
      query = query.gte('created_at', params.startDate);
    }

    if (params.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;
    return data;
  }

  /**
   * Get inventory summary statistics
   */
  static async getInventorySummary(params: InventoryReportParams = {}): Promise<InventorySummary> {

    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, current_stock, reorder_point, cost_price')
      .eq('is_active', true);

    if (error) throw error;

    const lowStockItems = await this.getLowStockReport();
    const turnoverReport = await this.getInventoryTurnoverReport(params);

    const total_inventory_value = products.reduce((sum: number, p: any) => {
      return sum + (parseFloat(p.current_stock || 0) * parseFloat(p.cost_price || 0));
    }, 0);

    const average_turnover_rate =
      turnoverReport.length > 0
        ? turnoverReport.reduce((sum, item) => sum + item.turnover_rate, 0) / turnoverReport.length
        : 0;

    return {
      total_products: products.length,
      low_stock_count: lowStockItems.filter(i => i.stock_status === 'low' || i.stock_status === 'critical').length,
      out_of_stock_count: lowStockItems.filter(i => i.stock_status === 'out_of_stock').length,
      total_inventory_value,
      average_turnover_rate,
    };
  }

  /**
   * Get comprehensive inventory report
   */
  static async getComprehensiveReport(params: InventoryReportParams = {}) {
    const [summary, lowStock, turnover, slowMoving, fastMoving, valueByCategory] =
      await Promise.all([
        this.getInventorySummary(params),
        this.getLowStockReport(),
        this.getInventoryTurnoverReport(params),
        this.getSlowMovingItems(params),
        this.getFastMovingItems(params),
        this.getInventoryValueByCategory(),
      ]);

    return {
      summary,
      low_stock: lowStock,
      turnover_analysis: {
        all_items: turnover,
        slow_moving: slowMoving,
        fast_moving: fastMoving,
      },
      value_by_category: valueByCategory,
    };
  }

  /**
   * Get stock alert recommendations
   */
  static async getStockAlerts() {
    const lowStock = await this.getLowStockReport();
    
    return lowStock.map(item => {
      let alert_level: 'critical' | 'warning' | 'info' = 'info';
      let recommendation = '';

      if (item.stock_status === 'out_of_stock') {
        alert_level = 'critical';
        recommendation = `Urgent: Order ${item.reorder_quantity} ${item.unit_of_measure} immediately`;
      } else if (item.stock_status === 'critical') {
        alert_level = 'critical';
        recommendation = `Critical: Order ${item.reorder_quantity} ${item.unit_of_measure} within 24 hours`;
      } else {
        alert_level = 'warning';
        recommendation = `Warning: Consider ordering ${item.reorder_quantity} ${item.unit_of_measure} soon`;
      }

      return {
        ...item,
        alert_level,
        recommendation,
      };
    });
  }

  /**
   * Get package sales with component product breakdown (Task 3.1.1)
   * 
   * Queries order items sold as packages and expands them to show
   * which component products were consumed
   * 
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Array of package component consumption
   */
  static async getPackageSalesWithComponents(
    startDate: string,
    endDate: string
  ): Promise<PackageComponentConsumption[]> {
    // Query: Get all package sales and join with package_items to get components
    const { data, error } = await supabaseAdmin.rpc('get_package_component_consumption', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      // Fallback to manual query if RPC doesn't exist
      console.warn('RPC not available, using fallback query:', error.message);
      return await this.getPackageSalesWithComponentsFallback(startDate, endDate);
    }

    return data || [];
  }

  /**
   * Fallback method for package component consumption (manual query)
   */
  private static async getPackageSalesWithComponentsFallback(
    startDate: string,
    endDate: string
  ): Promise<PackageComponentConsumption[]> {
    // Get all order items that are packages within date range
    const { data: packageOrders, error: orderError } = await supabaseAdmin
      .from('order_items')
      .select(`
        package_id,
        quantity,
        order:orders!inner(
          completed_at,
          status
        ),
        package:packages!inner(
          id,
          name,
          items:package_items(
            product_id,
            quantity,
            product:products(
              id,
              name,
              sku
            )
          )
        )
      `)
      .not('package_id', 'is', null)
      .gte('order.completed_at', startDate)
      .lte('order.completed_at', endDate)
      .eq('order.status', 'completed');

    if (orderError) throw orderError;

    // Aggregate consumption by product
    const consumptionMap = new Map<string, PackageComponentConsumption[]>();

    packageOrders?.forEach((orderItem: any) => {
      const package_sales = parseFloat(orderItem.quantity || 0);
      const packageData = orderItem.package;

      if (!packageData || !packageData.items) return;

      packageData.items.forEach((item: any) => {
        if (!item.product) return;

        const key = `${item.product.id}-${packageData.id}`;
        const quantity_consumed = package_sales * parseFloat(item.quantity || 0);

        if (!consumptionMap.has(key)) {
          consumptionMap.set(key, []);
        }

        const existing = consumptionMap.get(key)!;
        const found = existing.find(
          (c) => c.product_id === item.product.id && c.package_id === packageData.id
        );

        if (found) {
          found.quantity_consumed += quantity_consumed;
          found.package_sales += package_sales;
        } else {
          existing.push({
            product_id: item.product.id,
            product_name: item.product.name,
            quantity_consumed,
            package_id: packageData.id,
            package_name: packageData.name,
            package_sales,
          });
        }
      });
    });

    // Flatten the map
    const result: PackageComponentConsumption[] = [];
    consumptionMap.forEach((items) => {
      result.push(...items);
    });

    return result;
  }

  /**
   * Aggregate product consumption from direct sales and package components
   */
  private static aggregateConsumption(
    directSales: Map<string, { product_id: string; product_name: string; sku: string; quantity: number; current_stock: number }>,
    packageConsumption: PackageComponentConsumption[]
  ): ProductConsumption[] {
    const consumptionMap = new Map<string, ProductConsumption>();

    // Add direct sales
    directSales.forEach((sale) => {
      consumptionMap.set(sale.product_id, {
        product_id: sale.product_id,
        product_name: sale.product_name,
        current_stock: sale.current_stock,
        direct_sales: sale.quantity,
        package_consumption: 0,
        total_consumed: sale.quantity,
        package_breakdown: [],
      });
    });

    // Add package consumption
    packageConsumption.forEach((item) => {
      if (!consumptionMap.has(item.product_id)) {
        consumptionMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name,
          current_stock: 0, // Will be fetched separately
          direct_sales: 0,
          package_consumption: 0,
          total_consumed: 0,
          package_breakdown: [],
        });
      }

      const consumption = consumptionMap.get(item.product_id)!;
      consumption.package_consumption += item.quantity_consumed;
      consumption.total_consumed += item.quantity_consumed;
      consumption.package_breakdown.push({
        package_id: item.package_id,
        package_name: item.package_name,
        quantity_consumed: item.quantity_consumed,
        package_sales: item.package_sales,
      });
    });

    return Array.from(consumptionMap.values());
  }

  /**
   * Get smart reorder recommendations (Task 3.1.2)
   * 
   * Calculates reorder quantities considering both direct product sales
   * and package component consumption for accurate demand forecasting
   * 
   * @param params - Report parameters with date range and buffer days
   * @returns Array of smart reorder recommendations sorted by urgency
   */
  static async getSmartReorderRecommendations(
    params: InventoryReportParams & { bufferDays?: number } = {}
  ): Promise<SmartReorderRecommendation[]> {
    // If dates are provided, use them directly (preserves timezone offset like +08:00)
    let endDate: string;
    let startDate: string;
    
    if (params.startDate && params.endDate) {
      startDate = params.startDate;
      endDate = params.endDate;
    } else {
      // Fallback: generate default dates (last 30 days)
      endDate = new Date().toISOString();
      startDate = subDays(new Date(endDate), 30).toISOString();
    }
    const bufferDays = params.bufferDays || 14; // 2 weeks default buffer

    // Calculate date range in days
    const daysDiff = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    // 1. Get direct product sales
    const { data: directSalesData, error: salesError } = await supabaseAdmin
      .from('order_items')
      .select(`
        product_id,
        quantity,
        order:orders!inner(
          completed_at,
          status
        ),
        product:products!inner(
          id,
          name,
          sku,
          current_stock
        )
      `)
      .not('product_id', 'is', null)
      .gte('order.completed_at', startDate)
      .lte('order.completed_at', endDate)
      .eq('order.status', 'completed');

    if (salesError) throw salesError;

    // Aggregate direct sales by product
    const directSalesMap = new Map<string, any>();
    directSalesData?.forEach((item: any) => {
      if (!item.product) return;

      if (!directSalesMap.has(item.product.id)) {
        directSalesMap.set(item.product.id, {
          product_id: item.product.id,
          product_name: item.product.name,
          sku: item.product.sku,
          quantity: 0,
          current_stock: parseFloat(item.product.current_stock || 0),
        });
      }

      const product = directSalesMap.get(item.product.id)!;
      product.quantity += parseFloat(item.quantity || 0);
    });

    // 2. Get package component consumption
    const packageConsumption = await this.getPackageSalesWithComponents(startDate, endDate);

    // 3. Combine consumption data
    const aggregatedConsumption = this.aggregateConsumption(directSalesMap, packageConsumption);

    // 4. Fetch current stock for products only in package consumption
    const productIds = aggregatedConsumption
      .filter((c) => c.current_stock === 0)
      .map((c) => c.product_id);

    if (productIds.length > 0) {
      const { data: stockData } = await supabaseAdmin
        .from('products')
        .select('id, current_stock')
        .in('id', productIds);

      stockData?.forEach((product: any) => {
        const consumption = aggregatedConsumption.find((c) => c.product_id === product.id);
        if (consumption) {
          consumption.current_stock = parseFloat(product.current_stock || 0);
        }
      });
    }

    // 5. Calculate recommendations
    const recommendations: SmartReorderRecommendation[] = aggregatedConsumption.map((item) => {
      const daily_velocity = item.total_consumed / daysDiff;
      const days_until_stockout = daily_velocity > 0 ? item.current_stock / daily_velocity : Infinity;
      const recommended_reorder = Math.ceil(daily_velocity * bufferDays);

      // Calculate priority
      let priority: 'urgent' | 'high' | 'normal' = 'normal';
      if (days_until_stockout < 7) {
        priority = 'urgent';
      } else if (days_until_stockout < 14) {
        priority = 'high';
      }

      // Calculate usage breakdown percentages
      const usage_breakdown = item.package_breakdown.map((pkg) => ({
        package_id: pkg.package_id,
        package_name: pkg.package_name,
        quantity_consumed: pkg.quantity_consumed,
        percentage: item.total_consumed > 0 ? (pkg.quantity_consumed / item.total_consumed) * 100 : 0,
      }));

      return {
        product_id: item.product_id,
        product_name: item.product_name,
        sku: '', // Will be filled from direct sales if available
        current_stock: item.current_stock,
        direct_sales: item.direct_sales,
        package_consumption: item.package_consumption,
        total_consumed: item.total_consumed,
        daily_velocity,
        days_until_stockout: days_until_stockout === Infinity ? 9999 : days_until_stockout,
        recommended_reorder,
        priority,
        usage_breakdown,
      };
    });

    // Fill SKUs from direct sales map
    recommendations.forEach((rec) => {
      const directSale = directSalesMap.get(rec.product_id);
      if (directSale) {
        rec.sku = directSale.sku;
      }
    });

    // Sort by urgency (days until stockout ascending)
    return recommendations.sort((a, b) => a.days_until_stockout - b.days_until_stockout);
  }
}
