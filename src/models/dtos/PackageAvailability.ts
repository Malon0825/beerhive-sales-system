/**
 * Package Availability DTOs
 * 
 * Data Transfer Objects for package availability calculations
 * Used by PackageAvailabilityService to communicate availability data
 * 
 * @module models/dtos/PackageAvailability
 */

/**
 * Represents a single component product's availability within a package
 * 
 * @example
 * {
 *   product_id: "uuid-123",
 *   product_name: "Premium Beer",
 *   current_stock: 50,
 *   required_per_package: 2,
 *   max_packages: 25
 * }
 */
export interface ComponentAvailability {
  /** Unique identifier of the product */
  product_id: string;
  
  /** Display name of the product */
  product_name: string;
  
  /** Current stock level in inventory */
  current_stock: number;
  
  /** Quantity required per package unit */
  required_per_package: number;
  
  /** Maximum packages that can be made from this component */
  max_packages: number;
}

/**
 * Represents the bottleneck product limiting package availability
 * This is the component with the lowest max_packages value
 * 
 * @example
 * {
 *   product_id: "uuid-456",
 *   product_name: "Rare Snack",
 *   current_stock: 15,
 *   required_per_package: 1
 * }
 */
export interface BottleneckProduct {
  /** Unique identifier of the bottleneck product */
  product_id: string;
  
  /** Display name of the bottleneck product */
  product_name: string;
  
  /** Current stock level of this product */
  current_stock: number;
  
  /** Quantity required per package */
  required_per_package: number;
}

/**
 * Complete availability calculation result for a single package
 * 
 * Contains the maximum sellable quantity and detailed component breakdown
 * Used by UI to display availability and identify constraints
 * 
 * @example
 * {
 *   package_id: "uuid-789",
 *   package_name: "VIP Premium Bundle",
 *   max_sellable: 25,
 *   bottleneck_product: { ... },
 *   component_availability: [ ... ]
 * }
 */
export interface PackageAvailabilityResult {
  /** Unique identifier of the package */
  package_id: string;
  
  /** Display name of the package */
  package_name: string;
  
  /** Maximum number of package units that can be sold */
  max_sellable: number;
  
  /** The component product limiting availability (optional - may not exist if unlimited) */
  bottleneck_product?: BottleneckProduct;
  
  /** Detailed availability breakdown for all components */
  component_availability: ComponentAvailability[];
}

/**
 * Simplified package availability for list views
 * Contains only essential availability information
 * 
 * @example
 * {
 *   package_id: "uuid-789",
 *   package_name: "VIP Bundle",
 *   max_sellable: 25,
 *   status: "low_stock"
 * }
 */
export interface PackageAvailabilitySummary {
  /** Unique identifier of the package */
  package_id: string;
  
  /** Display name of the package */
  package_name: string;
  
  /** Maximum sellable quantity */
  max_sellable: number;
  
  /** Availability status */
  status: 'available' | 'low_stock' | 'out_of_stock';
  
  /** Optional bottleneck info for quick display */
  bottleneck?: {
    product_name: string;
    current_stock: number;
  };
}

/**
 * Information about packages affected by a specific product
 * Used to show package impact on product inventory pages
 * 
 * @example
 * {
 *   package_id: "uuid-789",
 *   package_name: "VIP Bundle",
 *   quantity_per_package: 2,
 *   max_sellable: 25
 * }
 */
export interface PackageImpactInfo {
  /** Unique identifier of the affected package */
  package_id: string;
  
  /** Display name of the package */
  package_name: string;
  
  /** How many units of the product are used per package */
  quantity_per_package: number;
  
  /** Current maximum sellable for this package */
  max_sellable: number;
  
  /** Package type for categorization */
  package_type?: 'vip_only' | 'regular' | 'promotional';
}

/**
 * Complete product impact analysis showing all affected packages
 * 
 * @example
 * {
 *   product_id: "uuid-123",
 *   product_name: "Premium Beer",
 *   current_stock: 50,
 *   affected_packages: [ ... ],
 *   total_packages_impacted: 3
 * }
 */
export interface ProductPackageImpact {
  /** Unique identifier of the product */
  product_id: string;
  
  /** Display name of the product */
  product_name: string;
  
  /** Current stock level */
  current_stock: number;
  
  /** List of packages using this product */
  affected_packages: PackageImpactInfo[];
  
  /** Total count of packages using this product */
  total_packages_impacted: number;
  
  /** Minimum availability across all packages (critical constraint) */
  minimum_package_availability?: number;
}

/**
 * Request parameters for availability queries
 */
export interface AvailabilityQueryParams {
  /** Include inactive packages in results */
  includeInactive?: boolean;
  
  /** Filter by package type */
  packageType?: 'vip_only' | 'regular' | 'promotional';
  
  /** Refresh cache and force recalculation */
  forceRefresh?: boolean;
}

/**
 * Cache metadata for availability calculations
 * Used internally by caching system
 */
export interface AvailabilityCacheEntry {
  /** The cached availability data */
  data: PackageAvailabilityResult;
  
  /** Timestamp when cache entry was created */
  timestamp: number;
  
  /** Timestamp when cache entry expires */
  expires: number;
  
  /** Cache version for invalidation */
  version: number;
}
