/**
 * PackageAvailabilityService
 * 
 * Core service for calculating package availability based on component product stocks.
 * Follows SOLID principles with clear separation of concerns.
 * 
 * Single Responsibility: Calculate package availability
 * Open/Closed: Extensible through strategy pattern for caching
 * Liskov Substitution: Can be substituted with mock for testing
 * Interface Segregation: Focused interface, no unnecessary methods
 * Dependency Inversion: Depends on Repository abstractions
 * 
 * @module core/services/inventory/PackageAvailabilityService
 */

import { PackageRepository } from '@/data/repositories/PackageRepository';
import { AppError } from '@/lib/errors/AppError';
import {
  PackageAvailabilityResult,
  PackageAvailabilitySummary,
  ComponentAvailability,
  BottleneckProduct,
  ProductPackageImpact,
  PackageImpactInfo,
  AvailabilityQueryParams,
} from '@/models/dtos/PackageAvailability';
import { Package } from '@/models/entities/Package';

/**
 * Cache entry structure for availability data
 */
interface CacheEntry {
  data: PackageAvailabilityResult;
  expires: number;
  version: number;
}

/**
 * PackageAvailabilityService
 * 
 * Calculates how many units of a package can be sold based on
 * current component product inventory levels.
 * 
 * Algorithm:
 * 1. Fetch package with component items
 * 2. For each component: calculate max_packages = floor(stock / required_qty)
 * 3. Find minimum (bottleneck component)
 * 4. Return availability with bottleneck details
 * 
 * Performance:
 * - Uses in-memory cache with 5-minute TTL
 * - Database queries optimized with indexes
 * - Target response time: <500ms
 */
export class PackageAvailabilityService {
  private static cache = new Map<string, CacheEntry>();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly CACHE_VERSION = 1;
  private static readonly LOW_STOCK_THRESHOLD = 20;

  /**
   * Calculate detailed availability for a single package
   * 
   * @param packageId - UUID of the package
   * @param forceRefresh - Skip cache and recalculate
   * @returns Detailed availability result with component breakdown
   * @throws AppError if package not found or calculation fails
   * 
   * @example
   * const availability = await PackageAvailabilityService.calculatePackageAvailability('uuid-123');
   * console.log(`Can sell ${availability.max_sellable} packages`);
   * console.log(`Limited by: ${availability.bottleneck_product?.product_name}`);
   */
  static async calculatePackageAvailability(
    packageId: string,
    forceRefresh: boolean = false
  ): Promise<PackageAvailabilityResult> {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = this.getFromCache(packageId);
        if (cached) {
          console.log(`[PackageAvailabilityService] Cache hit for package ${packageId}`);
          return cached;
        }
      }

      console.log(`[PackageAvailabilityService] Calculating availability for package ${packageId}`);

      // Fetch package with items from repository
      const pkg = await PackageRepository.getById(packageId);

      if (!pkg) {
        throw new AppError(`Package not found: ${packageId}`, 404);
      }

      if (!pkg.items || pkg.items.length === 0) {
        // Package with no items has unlimited availability (edge case)
        console.warn(`[PackageAvailabilityService] Package ${packageId} has no items`);
        return {
          package_id: pkg.id,
          package_name: pkg.name,
          max_sellable: Infinity,
          component_availability: [],
        };
      }

      // Calculate availability for each component
      // Type assertion: we've verified items exists above
      const componentAvailability = this.calculateComponentAvailability(
        pkg as Package & { items: any[] }
      );

      // Find bottleneck (component with minimum max_packages)
      const bottleneck = this.identifyBottleneck(componentAvailability);

      // Build result
      const result: PackageAvailabilityResult = {
        package_id: pkg.id,
        package_name: pkg.name,
        max_sellable: bottleneck.maxPackages,
        bottleneck_product: bottleneck.product,
        component_availability: componentAvailability,
      };

      // Cache the result
      this.setCache(packageId, result);

      console.log(
        `[PackageAvailabilityService] Package ${pkg.name}: ` +
        `max_sellable=${result.max_sellable}, ` +
        `bottleneck=${bottleneck.product?.product_name || 'none'}`
      );

      return result;
    } catch (error) {
      console.error('[PackageAvailabilityService] Error calculating package availability:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to calculate package availability', 500);
    }
  }

  /**
   * Calculate availability for all active packages
   * 
   * @param params - Query parameters for filtering
   * @returns Map of package ID to max sellable quantity
   * 
   * @example
   * const availability = await PackageAvailabilityService.calculateAllPackageAvailability();
   * availability.forEach((max, pkgId) => console.log(`${pkgId}: ${max} available`));
   */
  static async calculateAllPackageAvailability(
    params: AvailabilityQueryParams = {}
  ): Promise<Map<string, number>> {
    try {
      console.log('[PackageAvailabilityService] Calculating availability for all packages');

      // Fetch all active packages
      const packages = await PackageRepository.getActivePackages();

      const availabilityMap = new Map<string, number>();

      // Calculate availability for each package
      for (const pkg of packages) {
        try {
          const result = await this.calculatePackageAvailability(pkg.id, params.forceRefresh);
          availabilityMap.set(pkg.id, result.max_sellable);
        } catch (error) {
          console.error(`[PackageAvailabilityService] Error calculating for package ${pkg.id}:`, error);
          // Continue with other packages even if one fails
          availabilityMap.set(pkg.id, 0);
        }
      }

      console.log(`[PackageAvailabilityService] Calculated availability for ${availabilityMap.size} packages`);
      return availabilityMap;
    } catch (error) {
      console.error('[PackageAvailabilityService] Error calculating all package availability:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to calculate package availability', 500);
    }
  }

  /**
   * Get availability summaries for all active packages
   * 
   * @param params - Query parameters
   * @returns Array of package availability summaries
   * 
   * @example
   * const summaries = await PackageAvailabilityService.getAllPackageSummaries();
   * const lowStock = summaries.filter(s => s.status === 'low_stock');
   */
  static async getAllPackageSummaries(
    params: AvailabilityQueryParams = {}
  ): Promise<PackageAvailabilitySummary[]> {
    try {
      const packages = await PackageRepository.getActivePackages();
      const summaries: PackageAvailabilitySummary[] = [];

      for (const pkg of packages) {
        try {
          const availability = await this.calculatePackageAvailability(pkg.id, params.forceRefresh);
          
          summaries.push({
            package_id: availability.package_id,
            package_name: availability.package_name,
            max_sellable: availability.max_sellable,
            status: this.determineStatus(availability.max_sellable),
            bottleneck: availability.bottleneck_product
              ? {
                  product_name: availability.bottleneck_product.product_name,
                  current_stock: availability.bottleneck_product.current_stock,
                }
              : undefined,
          });
        } catch (error) {
          console.error(`[PackageAvailabilityService] Error getting summary for ${pkg.id}:`, error);
          // Add as out of stock on error
          summaries.push({
            package_id: pkg.id,
            package_name: pkg.name,
            max_sellable: 0,
            status: 'out_of_stock',
          });
        }
      }

      return summaries;
    } catch (error) {
      console.error('[PackageAvailabilityService] Error getting package summaries:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to get package summaries', 500);
    }
  }

  /**
   * Get packages impacted by a specific product
   * Shows which packages use this product and their availability
   * 
   * @param productId - UUID of the product
   * @returns Package impact information
   * @throws AppError if calculation fails
   * 
   * @example
   * const impact = await PackageAvailabilityService.getProductPackageImpact('uuid-product');
   * console.log(`Product is used in ${impact.total_packages_impacted} packages`);
   */
  static async getProductPackageImpact(productId: string): Promise<ProductPackageImpact> {
    try {
      console.log(`[PackageAvailabilityService] Getting package impact for product ${productId}`);

      // Get all active packages
      const packages = await PackageRepository.getActivePackages();

      // Filter packages that contain this product
      const affectedPackages: PackageImpactInfo[] = [];
      let productName = 'Unknown Product';
      let currentStock = 0;

      for (const pkg of packages) {
        if (!pkg.items) continue;

        // Check if this package uses the product
        const packageItem = pkg.items.find((item: any) => item.product_id === productId);

        if (packageItem) {
          // Get product info from first match
          if (packageItem.product && productName === 'Unknown Product') {
            productName = packageItem.product.name;
            currentStock = packageItem.product.current_stock ?? 0;
          }

          // Calculate availability for this package
          try {
            const availability = await this.calculatePackageAvailability(pkg.id);

            affectedPackages.push({
              package_id: pkg.id,
              package_name: pkg.name,
              quantity_per_package: packageItem.quantity,
              max_sellable: availability.max_sellable,
              package_type: pkg.package_type,
            });
          } catch (error) {
            console.error(`[PackageAvailabilityService] Error calculating for package ${pkg.id}:`, error);
          }
        }
      }

      // Find minimum availability
      const minAvailability = affectedPackages.length > 0
        ? Math.min(...affectedPackages.map(p => p.max_sellable))
        : undefined;

      const result: ProductPackageImpact = {
        product_id: productId,
        product_name: productName,
        current_stock: currentStock,
        affected_packages: affectedPackages,
        total_packages_impacted: affectedPackages.length,
        minimum_package_availability: minAvailability,
      };

      console.log(
        `[PackageAvailabilityService] Product ${productName} impacts ${affectedPackages.length} packages, ` +
        `min availability: ${minAvailability ?? 'N/A'}`
      );

      return result;
    } catch (error) {
      console.error('[PackageAvailabilityService] Error getting product package impact:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to get product package impact', 500);
    }
  }

  /**
   * Invalidate cache for specific package or all packages
   * Should be called when product stock changes
   * 
   * @param packageId - Optional package ID to invalidate, or null for all
   * 
   * @example
   * // Invalidate specific package
   * PackageAvailabilityService.invalidateCache('uuid-package');
   * 
   * // Invalidate all packages
   * PackageAvailabilityService.invalidateCache();
   */
  static invalidateCache(packageId?: string): void {
    if (packageId) {
      this.cache.delete(packageId);
      console.log(`[PackageAvailabilityService] Cache invalidated for package ${packageId}`);
    } else {
      this.cache.clear();
      console.log('[PackageAvailabilityService] Cache cleared for all packages');
    }
  }

  /**
   * Invalidate cache for packages using a specific product
   * Call this when a product's stock changes
   * 
   * @param productId - UUID of the product
   */
  static async invalidateCacheForProduct(productId: string): Promise<void> {
    try {
      // Get all packages using this product
      const impact = await this.getProductPackageImpact(productId);

      // Invalidate cache for each affected package
      for (const pkg of impact.affected_packages) {
        this.invalidateCache(pkg.package_id);
      }

      console.log(
        `[PackageAvailabilityService] Invalidated cache for ${impact.affected_packages.length} ` +
        `packages using product ${productId}`
      );
    } catch (error) {
      console.error('[PackageAvailabilityService] Error invalidating cache for product:', error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Calculate availability for each component in a package
   * 
   * @param pkg - Package with items
   * @returns Array of component availability
   */
  private static calculateComponentAvailability(
    pkg: Package & { items: any[] }
  ): ComponentAvailability[] {
    return pkg.items.map((item) => {
      const currentStock = item.product?.current_stock ?? 0;
      const requiredPerPackage = item.quantity;
      const maxPackages = Math.floor(currentStock / requiredPerPackage);

      return {
        product_id: item.product_id,
        product_name: item.product?.name ?? 'Unknown Product',
        current_stock: currentStock,
        required_per_package: requiredPerPackage,
        max_packages: maxPackages,
      };
    });
  }

  /**
   * Identify the bottleneck component (minimum availability)
   * 
   * @param components - Array of component availability
   * @returns Bottleneck info with max packages and product details
   */
  private static identifyBottleneck(
    components: ComponentAvailability[]
  ): {
    maxPackages: number;
    product?: BottleneckProduct;
  } {
    if (components.length === 0) {
      return { maxPackages: Infinity };
    }

    // Find component with minimum max_packages
    const bottleneck = components.reduce((min, curr) =>
      curr.max_packages < min.max_packages ? curr : min
    );

    return {
      maxPackages: bottleneck.max_packages,
      product: {
        product_id: bottleneck.product_id,
        product_name: bottleneck.product_name,
        current_stock: bottleneck.current_stock,
        required_per_package: bottleneck.required_per_package,
      },
    };
  }

  /**
   * Determine availability status based on quantity
   * 
   * @param maxSellable - Maximum sellable quantity
   * @returns Status classification
   */
  private static determineStatus(
    maxSellable: number
  ): 'available' | 'low_stock' | 'out_of_stock' {
    if (maxSellable === 0) return 'out_of_stock';
    if (maxSellable <= this.LOW_STOCK_THRESHOLD) return 'low_stock';
    return 'available';
  }

  /**
   * Get cached availability result
   * 
   * @param packageId - UUID of the package
   * @returns Cached result or null if expired/not found
   */
  private static getFromCache(packageId: string): PackageAvailabilityResult | null {
    const cached = this.cache.get(packageId);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expires) {
      this.cache.delete(packageId);
      console.log(`[PackageAvailabilityService] Cache expired for package ${packageId}`);
      return null;
    }

    // Check version
    if (cached.version !== this.CACHE_VERSION) {
      this.cache.delete(packageId);
      console.log(`[PackageAvailabilityService] Cache version mismatch for package ${packageId}`);
      return null;
    }

    return cached.data;
  }

  /**
   * Store result in cache
   * 
   * @param packageId - UUID of the package
   * @param data - Availability result to cache
   */
  private static setCache(packageId: string, data: PackageAvailabilityResult): void {
    const entry: CacheEntry = {
      data,
      expires: Date.now() + this.CACHE_TTL_MS,
      version: this.CACHE_VERSION,
    };

    this.cache.set(packageId, entry);
  }

  /**
   * Get cache statistics (for monitoring)
   * 
   * @returns Cache statistics
   */
  static getCacheStats(): {
    size: number;
    hitRate: number;
    version: number;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit/miss tracking
      version: this.CACHE_VERSION,
    };
  }
}
