/**
 * Package Availability Queries
 * 
 * Direct async functions for fetching package availability data
 * from the PackageAvailability API endpoints
 * 
 * Note: Use useState + useEffect pattern in components, not React Query
 */

/**
 * Single package availability result
 */
export interface PackageAvailabilityDetail {
  max_sellable: number;
  package_name?: string;
  bottleneck_product?: {
    product_id: string;
    product_name: string;
    current_stock: number;
    required_per_package: number;
  };
  component_availability: Array<{
    product_id: string;
    product_name: string;
    current_stock: number;
    required_per_package: number;
    max_packages: number;
  }>;
}

/**
 * All packages availability result
 */
export interface PackageAvailabilityItem {
  package_id: string;
  package_name: string;
  max_sellable: number;
  bottleneck?: {
    product_id: string;
    product_name: string;
    current_stock: number;
    required_per_package: number;
  };
}

/**
 * Package impact result (packages affected by a product)
 */
export interface PackageImpactData {
  product_id: string;
  product_name: string;
  current_stock: number;
  packages: Array<{
    package_id: string;
    package_name: string;
    quantity_per_package: number;
    max_sellable: number;
  }>;
}

/**
 * Fetch package availability for a single package
 * 
 * @param packageId - Package ID
 * @returns Package availability details
 * 
 * @example
 * ```tsx
 * const [data, setData] = useState<PackageAvailabilityDetail | null>(null);
 * 
 * useEffect(() => {
 *   fetchPackageAvailability('pkg-123').then(setData);
 * }, []);
 * ```
 */
export async function fetchPackageAvailability(
  packageId: string
): Promise<PackageAvailabilityDetail> {
  const response = await fetch(`/api/packages/${packageId}/availability`);

  if (!response.ok) {
    throw new Error(`Failed to fetch package availability: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to fetch package availability');
  }

  return result.data;
}

/**
 * Fetch availability for all active packages
 * 
 * @param includeInactive - Include inactive packages
 * @returns Array of package availability data
 * 
 * @example
 * ```tsx
 * const [packages, setPackages] = useState<PackageAvailabilityItem[]>([]);
 * 
 * useEffect(() => {
 *   fetchAllPackageAvailability().then(setPackages);
 * }, []);
 * 
 * const outOfStock = packages.filter(p => p.max_sellable === 0);
 * ```
 */
export async function fetchAllPackageAvailability(
  includeInactive: boolean = false
): Promise<PackageAvailabilityItem[]> {
  const params = new URLSearchParams();
  if (includeInactive) {
    params.append('includeInactive', 'true');
  }

  const response = await fetch(`/api/packages/availability?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch all package availability: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to fetch all package availability');
  }

  return result.data;
}

/**
 * Fetch packages affected by a product (package impact)
 * 
 * @param productId - Product ID
 * @returns Package impact data
 * 
 * @example
 * ```tsx
 * const [impact, setImpact] = useState<PackageImpactData | null>(null);
 * 
 * useEffect(() => {
 *   fetchPackageImpact('prod-123').then(setImpact);
 * }, [productId]);
 * 
 * console.log(`Used in ${impact?.packages.length} packages`);
 * ```
 */
export async function fetchPackageImpact(
  productId: string
): Promise<PackageImpactData> {
  const response = await fetch(`/api/inventory/package-impact/${productId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch package impact: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'Failed to fetch package impact');
  }

  return result.data;
}


/**
 * Get availability status category for UI display
 * 
 * @param maxSellable - Maximum sellable quantity
 * @param threshold - Low stock threshold (default: 20)
 * @returns Status: 'available' | 'low' | 'out'
 */
export function getAvailabilityStatus(
  maxSellable: number,
  threshold: number = 20
): 'available' | 'low' | 'out' {
  if (maxSellable === 0) return 'out';
  if (maxSellable <= threshold) return 'low';
  return 'available';
}

/**
 * Get availability status color for UI badges
 * 
 * @param status - Availability status
 * @returns Tailwind color classes
 */
export function getAvailabilityColor(status: 'available' | 'low' | 'out'): string {
  const colors = {
    available: 'bg-green-100 text-green-800 border-green-300',
    low: 'bg-amber-100 text-amber-800 border-amber-300',
    out: 'bg-red-100 text-red-800 border-red-300',
  };
  return colors[status];
}
