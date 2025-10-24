/**
 * usePackageAvailability Hook
 * 
 * Custom hooks for fetching package availability data
 * Provides real-time availability calculations based on component product stocks
 * 
 * Features:
 * - Automatic caching (5-minute TTL on server)
 * - Error handling with user-friendly messages
 * - Loading states
 * - Manual refresh capability
 * - TypeScript type safety
 * 
 * @module lib/hooks/usePackageAvailability
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PackageAvailabilityResult,
  PackageAvailabilitySummary,
  ProductPackageImpact,
} from '@/models/dtos/PackageAvailability';

/**
 * Hook to fetch availability for a single package
 * 
 * @param packageId - UUID of the package
 * @param options - Configuration options
 * @returns Package availability data with loading/error states
 * 
 * @example
 * const { availability, loading, error, refresh } = usePackageAvailability('uuid-123');
 * 
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * 
 * return <div>Max sellable: {availability?.max_sellable}</div>;
 */
export function usePackageAvailability(
  packageId: string | null,
  options: {
    enabled?: boolean;
    forceRefresh?: boolean;
    refetchInterval?: number; // milliseconds
  } = {}
) {
  const [availability, setAvailability] = useState<PackageAvailabilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const { enabled = true, forceRefresh = false, refetchInterval } = options;

  /**
   * Fetch availability data from API
   */
  const fetchAvailability = useCallback(async () => {
    if (!packageId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (forceRefresh) {
        queryParams.append('forceRefresh', 'true');
      }

      const url = `/api/packages/${packageId}/availability${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setAvailability(result.data);
        setLastFetched(new Date());
        setError(null);
      } else {
        setError(result.error?.message || 'Failed to fetch package availability');
        setAvailability(null);
      }
    } catch (err: any) {
      console.error('[usePackageAvailability] Error:', err);
      setError(err.message || 'Failed to fetch package availability');
      setAvailability(null);
    } finally {
      setLoading(false);
    }
  }, [packageId, enabled, forceRefresh]);

  // Initial fetch
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Auto-refetch interval (if specified)
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const intervalId = setInterval(() => {
      fetchAvailability();
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, fetchAvailability]);

  return {
    availability,
    loading,
    error,
    lastFetched,
    refresh: fetchAvailability,
  };
}

/**
 * Hook to fetch availability for all active packages
 * 
 * @param options - Configuration options
 * @returns Array of package availability summaries
 * 
 * @example
 * const { packages, loading, error, stats } = useAllPackageAvailability();
 * 
 * const lowStock = packages.filter(p => p.status === 'low_stock');
 * const outOfStock = packages.filter(p => p.status === 'out_of_stock');
 */
export function useAllPackageAvailability(
  options: {
    includeInactive?: boolean;
    forceRefresh?: boolean;
    format?: 'summary' | 'full';
    refetchInterval?: number;
  } = {}
) {
  const [packages, setPackages] = useState<PackageAvailabilitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  const {
    includeInactive = false,
    forceRefresh = false,
    format = 'summary',
    refetchInterval,
  } = options;

  /**
   * Fetch all packages availability
   */
  const fetchAllAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (includeInactive) queryParams.append('includeInactive', 'true');
      if (forceRefresh) queryParams.append('forceRefresh', 'true');
      if (format) queryParams.append('format', format);

      const url = `/api/packages/availability?${queryParams.toString()}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setPackages(result.data);
        setLastFetched(new Date());

        // Calculate stats
        const available = result.data.filter(
          (p: PackageAvailabilitySummary) => p.status === 'available'
        ).length;
        const lowStock = result.data.filter(
          (p: PackageAvailabilitySummary) => p.status === 'low_stock'
        ).length;
        const outOfStock = result.data.filter(
          (p: PackageAvailabilitySummary) => p.status === 'out_of_stock'
        ).length;

        setStats({
          total: result.data.length,
          available,
          lowStock,
          outOfStock,
        });

        setError(null);
      } else {
        setError(result.error?.message || 'Failed to fetch package availability');
        setPackages([]);
      }
    } catch (err: any) {
      console.error('[useAllPackageAvailability] Error:', err);
      setError(err.message || 'Failed to fetch package availability');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [includeInactive, forceRefresh, format]);

  // Initial fetch
  useEffect(() => {
    fetchAllAvailability();
  }, [fetchAllAvailability]);

  // Auto-refetch interval (if specified)
  useEffect(() => {
    if (!refetchInterval) return;

    const intervalId = setInterval(() => {
      fetchAllAvailability();
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [refetchInterval, fetchAllAvailability]);

  return {
    packages,
    loading,
    error,
    lastFetched,
    stats,
    refresh: fetchAllAvailability,
  };
}

/**
 * Hook to fetch package impact for a specific product
 * Shows which packages are affected by a product's stock level
 * 
 * @param productId - UUID of the product
 * @param options - Configuration options
 * @returns Package impact data
 * 
 * @example
 * const { impact, loading, error } = usePackageImpact('product-uuid');
 * 
 * if (impact) {
 *   console.log(`Product used in ${impact.total_packages_impacted} packages`);
 *   console.log(`Minimum availability: ${impact.minimum_package_availability}`);
 * }
 */
export function usePackageImpact(
  productId: string | null,
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) {
  const [impact, setImpact] = useState<ProductPackageImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const { enabled = true, refetchInterval } = options;

  /**
   * Fetch package impact data
   */
  const fetchImpact = useCallback(async () => {
    if (!productId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = `/api/inventory/package-impact/${productId}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setImpact(result.data);
        setLastFetched(new Date());
        setError(null);
      } else {
        setError(result.error?.message || 'Failed to fetch package impact');
        setImpact(null);
      }
    } catch (err: any) {
      console.error('[usePackageImpact] Error:', err);
      setError(err.message || 'Failed to fetch package impact');
      setImpact(null);
    } finally {
      setLoading(false);
    }
  }, [productId, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchImpact();
  }, [fetchImpact]);

  // Auto-refetch interval (if specified)
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const intervalId = setInterval(() => {
      fetchImpact();
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, fetchImpact]);

  return {
    impact,
    loading,
    error,
    lastFetched,
    refresh: fetchImpact,
  };
}

/**
 * Helper hook to determine if a package is available for sale
 * 
 * @param packageId - UUID of the package
 * @returns Boolean indicating if package can be sold
 * 
 * @example
 * const isAvailable = useIsPackageAvailable('uuid-123');
 * 
 * <Button disabled={!isAvailable}>
 *   Add to Cart
 * </Button>
 */
export function useIsPackageAvailable(packageId: string | null): boolean {
  const { availability } = usePackageAvailability(packageId);
  return (availability?.max_sellable ?? 0) > 0;
}
