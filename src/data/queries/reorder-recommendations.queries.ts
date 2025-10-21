/**
 * Reorder Recommendations Queries
 * React Query hooks for fetching smart reorder recommendations
 */

import { useQuery } from '@tanstack/react-query';
import { SmartReorderRecommendation } from '@/core/services/reports/InventoryReport';

interface ReorderRecommendationsParams {
  days?: number;
  buffer?: number;
  startDate?: string;
  endDate?: string;
  priority?: 'urgent' | 'high' | 'normal';
}

interface ReorderRecommendationsResponse {
  recommendations: SmartReorderRecommendation[];
  summary: {
    total_products: number;
    urgent_count: number;
    high_priority_count: number;
    normal_count: number;
  };
  metadata: {
    start_date: string;
    end_date: string;
    days_analyzed: number;
    buffer_days: number;
    priority_filter: string | null;
  };
}

/**
 * Fetch reorder recommendations from API
 */
async function fetchReorderRecommendations(
  params: ReorderRecommendationsParams = {}
): Promise<ReorderRecommendationsResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.days) searchParams.set('days', params.days.toString());
  if (params.buffer) searchParams.set('buffer', params.buffer.toString());
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.priority) searchParams.set('priority', params.priority);
  
  const url = `/api/inventory/reorder-recommendations${
    searchParams.toString() ? `?${searchParams.toString()}` : ''
  }`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch reorder recommendations');
  }
  
  const result = await response.json();
  return result.data;
}

/**
 * Hook to fetch reorder recommendations
 * 
 * @example
 * const { data, isLoading, error } = useReorderRecommendations({ days: 30, buffer: 14 });
 */
export function useReorderRecommendations(
  params: ReorderRecommendationsParams = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: ['reorder-recommendations', params],
    queryFn: () => fetchReorderRecommendations(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options.enabled !== false,
  });
}

/**
 * Hook to fetch urgent reorder recommendations only
 */
export function useUrgentReorderRecommendations(
  params: Omit<ReorderRecommendationsParams, 'priority'> = {}
) {
  return useReorderRecommendations({ ...params, priority: 'urgent' });
}
