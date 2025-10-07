import { supabase } from '@/data/supabase/client';

/**
 * Session Service
 * Manages user session state and persistence
 * 
 * SESSION CONFIGURATION:
 * - Session timeout: 24 hours (1440 minutes)
 * - Auto-logout disabled for in-house operations
 * - Bar business requires staff to stay logged in during full shifts
 * - Session extends automatically on user activity
 */
export class SessionService {
  private static readonly SESSION_KEY = 'beerhive_session';
  // 24-hour session for in-house bar staff (1440 minutes = 24 hours)
  private static readonly SESSION_TIMEOUT_MINUTES = 1440;
  // Disable auto-logout - this is an in-house system, not public-facing
  private static readonly AUTO_LOGOUT_ENABLED = false;

  /**
   * Initialize session monitoring
   */
  static initialize(): void {
    if (typeof window === 'undefined') return;

    // Monitor auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.clearSession();
      } else if (event === 'SIGNED_IN' && session) {
        this.updateLastActivity();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('[SessionService] Token refreshed successfully');
        this.updateLastActivity();
      }
    });

    // Start inactivity timer
    this.startInactivityTimer();
    
    // Start automatic token refresh (Supabase tokens expire after 1 hour)
    // Refresh every 50 minutes to stay ahead of expiration
    this.startTokenRefresh();
  }
  
  /**
   * Start automatic token refresh
   * Supabase access tokens expire after 1 hour, so we refresh every 50 minutes
   * This ensures staff don't get logged out during their shift
   */
  private static startTokenRefresh(): void {
    if (typeof window === 'undefined') return;
    
    const REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes in milliseconds
    
    setInterval(async () => {
      try {
        const session = await this.getSession();
        if (session) {
          console.log('[SessionService] Attempting automatic token refresh...');
          const refreshed = await this.refreshSession();
          if (refreshed) {
            console.log('[SessionService] Token refreshed automatically');
          } else {
            console.warn('[SessionService] Token refresh failed, user may need to login again');
          }
        }
      } catch (error) {
        console.error('[SessionService] Error during automatic token refresh:', error);
      }
    }, REFRESH_INTERVAL);
    
    console.log('[SessionService] Automatic token refresh enabled (every 50 minutes)');
  }

  /**
   * Start inactivity timer to auto-logout
   * DISABLED for in-house operations - bar staff need to stay logged in all day
   * Session will expire after 24 hours regardless of activity
   */
  private static startInactivityTimer(): void {
    if (typeof window === 'undefined') return;
    
    // Auto-logout is disabled for in-house bar operations
    if (!this.AUTO_LOGOUT_ENABLED) {
      // Just update activity timestamp without setting timeout
      const updateActivity = () => {
        this.updateLastActivity();
      };
      
      // Track activity for session extension purposes
      ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach((event) => {
        document.addEventListener(event, updateActivity, true);
      });
      
      // Initial activity timestamp
      this.updateLastActivity();
      return;
    }

    // Original inactivity timeout logic (disabled by default)
    let inactivityTimeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimeout);
      this.updateLastActivity();

      inactivityTimeout = setTimeout(() => {
        this.handleInactiveLogout();
      }, this.SESSION_TIMEOUT_MINUTES * 60 * 1000);
    };

    // Reset timer on user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach((event) => {
      document.addEventListener(event, resetTimer, true);
    });

    // Initial timer start
    resetTimer();
  }

  /**
   * Handle auto-logout due to inactivity
   * Only used if AUTO_LOGOUT_ENABLED is true (currently disabled)
   */
  private static async handleInactiveLogout(): Promise<void> {
    const lastActivity = this.getLastActivity();
    if (!lastActivity) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    const timeoutMs = this.SESSION_TIMEOUT_MINUTES * 60 * 1000;

    if (timeSinceActivity >= timeoutMs) {
      await supabase.auth.signOut();
      
      // Redirect to login with message
      if (typeof window !== 'undefined') {
        window.location.href = '/login?reason=session_expired';
      }
    }
  }

  /**
   * Update last activity timestamp
   */
  private static updateLastActivity(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${this.SESSION_KEY}_last_activity`, Date.now().toString());
  }

  /**
   * Get last activity timestamp
   */
  private static getLastActivity(): number | null {
    if (typeof window === 'undefined') return null;
    const timestamp = localStorage.getItem(`${this.SESSION_KEY}_last_activity`);
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  /**
   * Clear session data
   */
  static clearSession(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(`${this.SESSION_KEY}_last_activity`);
    localStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Check if session is valid
   */
  static async isSessionValid(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session !== null;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Refresh session token
   */
  static async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        return false;
      }
      return data.session !== null;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }

  /**
   * Get session info
   */
  static async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }
}
