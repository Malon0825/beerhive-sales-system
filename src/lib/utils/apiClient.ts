import { supabase } from '@/data/supabase/client';

/**
 * API Client Utility
 * Provides helper functions for making authenticated API requests
 * Automatically includes the Authorization header with the current session token
 */

/**
 * Get the current session access token
 * @returns The access token or null if not authenticated
 */
async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make an authenticated fetch request
 * Automatically includes Authorization header with Bearer token
 * 
 * @param url - The API endpoint URL
 * @param options - Fetch options (headers will be merged with auth header)
 * @returns Fetch Response
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  
  const headers = new Headers(options.headers);
  
  // Add Authorization header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Ensure Content-Type is set for JSON requests
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Make an authenticated GET request
 * @param url - The API endpoint URL
 * @param options - Additional fetch options
 * @returns Parsed JSON response
 */
export async function apiGet<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'GET',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}

/**
 * Make an authenticated POST request
 * @param url - The API endpoint URL
 * @param data - Request body data (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Parsed JSON response
 */
export async function apiPost<T = any>(
  url: string,
  data?: any,
  options?: RequestInit
): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}

/**
 * Make an authenticated PATCH request
 * @param url - The API endpoint URL
 * @param data - Request body data (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Parsed JSON response
 */
export async function apiPatch<T = any>(
  url: string,
  data?: any,
  options?: RequestInit
): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}

/**
 * Make an authenticated PUT request
 * @param url - The API endpoint URL
 * @param data - Request body data (will be JSON stringified)
 * @param options - Additional fetch options
 * @returns Parsed JSON response
 */
export async function apiPut<T = any>(
  url: string,
  data?: any,
  options?: RequestInit
): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}

/**
 * Make an authenticated DELETE request
 * @param url - The API endpoint URL
 * @param options - Additional fetch options
 * @returns Parsed JSON response
 */
export async function apiDelete<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}
