import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/models/database.types';

/**
 * Lazily created Supabase client instance for browser-side operations
 * Only initialized when first accessed to avoid build-time environment variable checks
 */
let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Gets or creates the Supabase client for browser-side operations
 * This lazy initialization approach prevents build-time errors when environment
 * variables are not available during Next.js static analysis phase
 * 
 * @returns {SupabaseClient<Database>} Supabase client for client-side operations
 * @throws {Error} If required public environment variables are missing at runtime
 * 
 * @example
 * // In client components
 * const { data, error } = await supabase.from('products').select('*');
 */
function getSupabase(): SupabaseClient<Database> {
  // Return existing instance if already created
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Validate environment variables at runtime (not at module load time)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  // Create and cache the client instance
  // Configured for 24-hour sessions with automatic token refresh
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,        // Keep session in localStorage
      autoRefreshToken: true,       // Auto-refresh tokens before expiry
      detectSessionInUrl: false,    // Disable URL-based session detection for security
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'beerhive-auth-token', // Custom storage key for session
    },
  });

  return supabaseInstance;
}

/**
 * Supabase client for browser-side operations
 * Use this in client components and browser contexts
 * 
 * This uses a Proxy to enable lazy initialization, preventing build-time errors
 * while maintaining the same usage pattern as a regular Supabase client
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get: (_target, prop) => {
    const client = getSupabase();
    const value = (client as any)[prop];
    
    // Bind methods to maintain correct 'this' context
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
