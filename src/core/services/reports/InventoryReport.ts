/**
 * Inventory Report Service
 * Business logic for generating inventory reports
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
   */
  static async getInventoryTurnoverReport(
    params: InventoryReportParams = {}
  ): Promise<InventoryTurnoverItem[]> {
    const endDate = params.endDate || new Date().toISOString();
    const startDate = params.startDate || subDays(new Date(endDate), 30).toISOString();

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
}
