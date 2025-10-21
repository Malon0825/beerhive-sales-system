/**
 * Sales Impact Queries
 * Analyze inventory consumption breakdown by sales channel (direct vs package)
 */

import { supabaseAdmin } from '@/data/supabase/server-client';

export interface ConsumptionByChannel {
  product_id: string;
  product_name: string;
  sku: string;
  total_consumed: number;
  direct_sales: number;
  package_consumption: number;
  direct_percentage: number;
  package_percentage: number;
  package_breakdown: Array<{
    package_id: string;
    package_name: string;
    quantity_consumed: number;
    package_sales_count: number;
    percentage: number;
  }>;
}

export interface SalesChannelInsights {
  dominant_channel: 'direct' | 'package' | 'balanced';
  top_package_consumer: {
    package_id: string;
    package_name: string;
    quantity_consumed: number;
  } | null;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendation: string;
}

/**
 * Get inventory consumption by sales channel for a specific product
 * 
 * @param productId - Product UUID
 * @param dateRange - Start and end dates
 * @returns Consumption analysis with direct vs package breakdown
 */
export async function getInventoryConsumptionByChannel(
  productId: string,
  dateRange: { start: string; end: string }
): Promise<ConsumptionByChannel> {
  // 1. Get direct sales
  const { data: directSales, error: directError } = await supabaseAdmin
    .from('order_items')
    .select(`
      quantity,
      order:orders!inner(
        completed_at,
        status
      ),
      product:products!inner(
        id,
        name,
        sku
      )
    `)
    .eq('product_id', productId)
    .is('package_id', null)
    .gte('order.completed_at', dateRange.start)
    .lte('order.completed_at', dateRange.end)
    .eq('order.status', 'completed');

  if (directError) throw directError;

  // Calculate direct sales total
  const directSalesTotal = directSales?.reduce(
    (sum, item) => {
      const qty = item.quantity;
      return sum + (typeof qty === 'number' ? qty : parseFloat(qty || '0'));
    },
    0
  ) || 0;

  // 2. Get package consumption
  const { data: packageOrders, error: packageError } = await supabaseAdmin
    .from('order_items')
    .select(`
      quantity,
      order:orders!inner(
        completed_at,
        status
      ),
      package:packages!inner(
        id,
        name,
        items:package_items!inner(
          product_id,
          quantity
        )
      )
    `)
    .not('package_id', 'is', null)
    .gte('order.completed_at', dateRange.start)
    .lte('order.completed_at', dateRange.end)
    .eq('order.status', 'completed');

  if (packageError) throw packageError;

  // Aggregate package consumption by package
  const packageBreakdownMap = new Map<string, {
    package_id: string;
    package_name: string;
    quantity_consumed: number;
    package_sales_count: number;
  }>();

  let totalPackageConsumption = 0;

  packageOrders?.forEach((orderItem: any) => {
    const packageData = orderItem.package;
    const packageSalesCount = parseFloat(orderItem.quantity || '0');

    if (!packageData || !packageData.items) return;

    // Find the product in package items
    const packageItem = packageData.items.find(
      (item: any) => item.product_id === productId
    );

    if (!packageItem) return;

    const quantityPerPackage = parseFloat(packageItem.quantity || '0');
    const totalConsumed = packageSalesCount * quantityPerPackage;
    totalPackageConsumption += totalConsumed;

    // Aggregate by package
    if (!packageBreakdownMap.has(packageData.id)) {
      packageBreakdownMap.set(packageData.id, {
        package_id: packageData.id,
        package_name: packageData.name,
        quantity_consumed: 0,
        package_sales_count: 0,
      });
    }

    const breakdown = packageBreakdownMap.get(packageData.id)!;
    breakdown.quantity_consumed += totalConsumed;
    breakdown.package_sales_count += packageSalesCount;
  });

  // 3. Get product info
  const { data: productInfo } = await supabaseAdmin
    .from('products')
    .select('id, name, sku')
    .eq('id', productId)
    .single();

  const totalConsumed = directSalesTotal + totalPackageConsumption;

  // Calculate percentages and sort
  const packageBreakdown = Array.from(packageBreakdownMap.values())
    .map((pkg) => ({
      ...pkg,
      percentage: totalConsumed > 0 ? (pkg.quantity_consumed / totalConsumed) * 100 : 0,
    }))
    .sort((a, b) => b.quantity_consumed - a.quantity_consumed);

  return {
    product_id: productId,
    product_name: productInfo?.name || 'Unknown Product',
    sku: productInfo?.sku || '',
    total_consumed: totalConsumed,
    direct_sales: directSalesTotal,
    package_consumption: totalPackageConsumption,
    direct_percentage: totalConsumed > 0 ? (directSalesTotal / totalConsumed) * 100 : 0,
    package_percentage: totalConsumed > 0 ? (totalPackageConsumption / totalConsumed) * 100 : 0,
    package_breakdown: packageBreakdown,
  };
}

/**
 * Generate insights based on consumption data
 */
export function generateSalesChannelInsights(
  consumption: ConsumptionByChannel
): SalesChannelInsights {
  // Determine dominant channel
  let dominant_channel: 'direct' | 'package' | 'balanced' = 'balanced';
  if (consumption.direct_percentage > 70) {
    dominant_channel = 'direct';
  } else if (consumption.package_percentage > 70) {
    dominant_channel = 'package';
  }

  // Get top package consumer
  const top_package_consumer =
    consumption.package_breakdown.length > 0
      ? {
          package_id: consumption.package_breakdown[0].package_id,
          package_name: consumption.package_breakdown[0].package_name,
          quantity_consumed: consumption.package_breakdown[0].quantity_consumed,
        }
      : null;

  // Trend analysis (placeholder - would need historical data)
  const trend: 'increasing' | 'stable' | 'decreasing' = 'stable';

  // Generate recommendation
  let recommendation = '';
  if (dominant_channel === 'direct') {
    recommendation = `This product is primarily sold directly (${consumption.direct_percentage.toFixed(
      1
    )}%). Consider marketing packages that include this product.`;
  } else if (dominant_channel === 'package') {
    recommendation = `This product is mainly consumed through packages (${consumption.package_percentage.toFixed(
      1
    )}%). Ensure adequate stock to support package sales.`;
  } else {
    recommendation = 'This product has balanced consumption between direct sales and packages. Monitor both channels when restocking.';
  }

  if (top_package_consumer) {
    recommendation += ` Top consumer: ${top_package_consumer.package_name} (${top_package_consumer.quantity_consumed.toFixed(
      1
    )} units).`;
  }

  return {
    dominant_channel,
    top_package_consumer,
    trend,
    recommendation,
  };
}
