import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/models/database.types';

/**
 * Lazily created Supabase admin client instance
 * Only initialized when first accessed to avoid build-time environment variable checks
 */
let supabaseAdminInstance: SupabaseClient<Database> | null = null;

/**
 * Gets or creates the Supabase admin client for server-side operations
 * This lazy initialization approach prevents build-time errors when environment
 * variables are not available during Next.js static analysis phase
 * 
 * @returns {SupabaseClient<Database>} Supabase client with admin privileges
 * @throws {Error} If required environment variables are missing at runtime
 * 
 * @example
 * // In API routes
 * const { data, error } = await supabaseAdmin.from('users').select('*');
 */
function getSupabaseAdmin(): SupabaseClient<Database> {
  // Return existing instance if already created
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  // Validate environment variables at runtime (not at module load time)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  // Create and cache the client instance
  supabaseAdminInstance = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminInstance;
}

/**
 * Supabase client for server-side operations with elevated permissions
 * Use this in API routes and server components that require admin access
 * 
 * WARNING: Never expose this client to the browser
 * 
 * This uses a Proxy to enable lazy initialization, preventing build-time errors
 * while maintaining the same usage pattern as a regular Supabase client
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get: (_target, prop) => {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    
    // Bind methods to maintain correct 'this' context
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
