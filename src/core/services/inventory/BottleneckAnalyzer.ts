/**
 * Bottleneck Analyzer Service
 * 
 * Identifies products that limit package availability and calculates
 * their business impact. Helps prioritize restocking decisions.
 * 
 * @module core/services/inventory/BottleneckAnalyzer
 */

import { supabaseAdmin } from '@/data/supabase/server-client';
import { PackageAvailabilityService } from './PackageAvailabilityService';

export interface BottleneckProduct {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  reorder_point: number;
  affected_packages: Array<{
    package_id: string;
    package_name: string;
    max_sellable: number;
    required_per_package: number;
    potential_revenue: number;
  }>;
  total_packages_affected: number;
  bottleneck_severity: number;
  total_revenue_impact: number;
  optimal_restock: number;
}

export interface BottleneckAnalysisResult {
  bottlenecks: BottleneckProduct[];
  summary: {
    total_bottlenecks: number;
    critical_bottlenecks: number;
    total_packages_affected: number;
    total_revenue_at_risk: number;
  };
}

export class BottleneckAnalyzer {
  /**
   * Identify all bottleneck products across active packages
   * 
   * @returns Ranked list of bottleneck products with impact analysis
   */
  static async identifyBottlenecks(): Promise<BottleneckAnalysisResult> {
    // 1. Get all active packages
    const { data: packages, error: packagesError } = await supabaseAdmin
      .from('packages')
      .select(`
        id,
        name,
        base_price,
        is_active
      `)
      .eq('is_active', true);

    if (packagesError) throw packagesError;

    if (!packages || packages.length === 0) {
      return {
        bottlenecks: [],
        summary: {
          total_bottlenecks: 0,
          critical_bottlenecks: 0,
          total_packages_affected: 0,
          total_revenue_at_risk: 0,
        },
      };
    }

    // 2. Get availability for each package and identify bottleneck
    const bottleneckMap = new Map<string, {
      product_id: string;
      product_name: string;
      sku: string;
      current_stock: number;
      reorder_point: number;
      packages: Array<{
        package_id: string;
        package_name: string;
        max_sellable: number;
        required_per_package: number;
        sell_price: number;
      }>;
    }>();

    for (const pkg of packages) {
      try {
        const availability = await PackageAvailabilityService.calculatePackageAvailability(pkg.id);

        if (availability.bottleneck_product) {
          const bottleneck = availability.bottleneck_product;
          const key = bottleneck.product_id;

          if (!bottleneckMap.has(key)) {
            bottleneckMap.set(key, {
              product_id: bottleneck.product_id,
              product_name: bottleneck.product_name,
              sku: '',
              current_stock: bottleneck.current_stock,
              reorder_point: 0,
              packages: [],
            });
          }

          const bottleneckData = bottleneckMap.get(key)!;
          bottleneckData.packages.push({
            package_id: pkg.id,
            package_name: pkg.name,
            max_sellable: availability.max_sellable,
            required_per_package: bottleneck.required_per_package,
            sell_price: typeof pkg.base_price === 'number' ? pkg.base_price : parseFloat(pkg.base_price || '0'),
          });
        }
      } catch (error) {
        console.error(`Error analyzing package ${pkg.id}:`, error);
        // Continue with other packages
      }
    }

    // 2.5. Fetch SKU and reorder_point for bottleneck products
    const productIds = Array.from(bottleneckMap.keys());
    if (productIds.length > 0) {
      const { data: productDetails } = await supabaseAdmin
        .from('products')
        .select('id, sku, reorder_point')
        .in('id', productIds);

      productDetails?.forEach((product: any) => {
        const bottleneckData = bottleneckMap.get(product.id);
        if (bottleneckData) {
          bottleneckData.sku = product.sku || '';
          bottleneckData.reorder_point = parseFloat(product.reorder_point || '0');
        }
      });
    }

    // 3. Calculate bottleneck severity and revenue impact
    const bottlenecks: BottleneckProduct[] = Array.from(bottleneckMap.values()).map((data) => {
      const affected_packages = data.packages.map((pkg) => ({
        package_id: pkg.package_id,
        package_name: pkg.package_name,
        max_sellable: pkg.max_sellable,
        required_per_package: pkg.required_per_package,
        potential_revenue: pkg.max_sellable * pkg.sell_price,
      }));

      // Calculate total revenue impact
      const total_revenue_impact = affected_packages.reduce(
        (sum, pkg) => sum + pkg.potential_revenue,
        0
      );

      // Calculate bottleneck severity
      // Severity = number of packages affected × average revenue per package
      const avg_revenue = affected_packages.length > 0
        ? total_revenue_impact / affected_packages.length
        : 0;
      const bottleneck_severity = affected_packages.length * avg_revenue;

      // Calculate optimal restock
      // Take the maximum required across all packages, with a buffer
      const max_required = Math.max(...data.packages.map((p) => p.required_per_package), 0);
      const optimal_restock = Math.ceil(max_required * 50); // 50 packages worth

      return {
        product_id: data.product_id,
        product_name: data.product_name,
        sku: data.sku,
        current_stock: data.current_stock,
        reorder_point: data.reorder_point,
        affected_packages,
        total_packages_affected: affected_packages.length,
        bottleneck_severity,
        total_revenue_impact,
        optimal_restock,
      };
    });

    // 4. Sort by severity (highest first)
    bottlenecks.sort((a, b) => b.bottleneck_severity - a.bottleneck_severity);

    // 5. Calculate summary
    const summary = {
      total_bottlenecks: bottlenecks.length,
      critical_bottlenecks: bottlenecks.filter((b) => b.current_stock <= b.reorder_point).length,
      total_packages_affected: bottlenecks.reduce((sum, b) => sum + b.total_packages_affected, 0),
      total_revenue_at_risk: bottlenecks.reduce((sum, b) => sum + b.total_revenue_impact, 0),
    };

    return {
      bottlenecks,
      summary,
    };
  }

  /**
   * Check if a product is a bottleneck for any active packages
   * 
   * @param productId - Product UUID to check
   * @returns Bottleneck information if product is a bottleneck
   */
  static async checkProductBottleneck(productId: string): Promise<BottleneckProduct | null> {
    const analysis = await this.identifyBottlenecks();
    return analysis.bottlenecks.find((b) => b.product_id === productId) || null;
  }

  /**
   * Get critical bottlenecks (stock below reorder point)
   */
  static async getCriticalBottlenecks(): Promise<BottleneckProduct[]> {
    const analysis = await this.identifyBottlenecks();
    return analysis.bottlenecks.filter((b) => b.current_stock <= b.reorder_point);
  }
}
