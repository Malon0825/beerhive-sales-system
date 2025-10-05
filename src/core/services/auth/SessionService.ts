import { supabase } from '@/data/supabase/client';

/**
 * Session Service
 * Manages user session state and persistence
 */
export class SessionService {
  private static readonly SESSION_KEY = 'beerhive_session';
  private static readonly AUTO_LOGOUT_MINUTES = 30;

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
      }
    });

    // Start inactivity timer
    this.startInactivityTimer();
  }

  /**
   * Start inactivity timer to auto-logout
   */
  private static startInactivityTimer(): void {
    if (typeof window === 'undefined') return;

    let inactivityTimeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimeout);
      this.updateLastActivity();

      inactivityTimeout = setTimeout(() => {
        this.handleInactiveLogout();
      }, this.AUTO_LOGOUT_MINUTES * 60 * 1000);
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
   */
  private static async handleInactiveLogout(): Promise<void> {
    const lastActivity = this.getLastActivity();
    if (!lastActivity) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    const timeoutMs = this.AUTO_LOGOUT_MINUTES * 60 * 1000;

    if (timeSinceActivity >= timeoutMs) {
      await supabase.auth.signOut();
      
      // Redirect to login with message
      if (typeof window !== 'undefined') {
        window.location.href = '/login?reason=inactivity';
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
