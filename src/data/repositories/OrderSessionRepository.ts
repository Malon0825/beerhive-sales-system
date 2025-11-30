// @ts-nocheck - Supabase type inference issues
import { supabaseAdmin } from '../supabase/server-client';
import { OrderSession, CreateOrderSessionDto, UpdateOrderSessionDto } from '@/models/entities/OrderSession';
import { SessionStatus } from '@/models/enums/SessionStatus';
import { AppError } from '@/lib/errors/AppError';

/**
 * OrderSessionRepository
 * Data access layer for order sessions (tabs)
 */
export class OrderSessionRepository {
  private static readonly TABLE = 'order_sessions';

  /**
   * Create a new order session (open a tab)
   * @param data - Session creation data
   * @returns Created session
   */
  static async create(data: CreateOrderSessionDto): Promise<OrderSession> {
    try {
      const { data: session, error } = await supabaseAdmin
        .from(this.TABLE)
        .insert({
          table_id: data.table_id,
          customer_id: data.customer_id,
          notes: data.notes,
          opened_by: data.opened_by,
          status: SessionStatus.OPEN,
          subtotal: 0,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: 0,
        })
        .select(`
          *,
          table:restaurant_tables!order_sessions_table_id_fkey(id, table_number, area),
          customer:customers(id, full_name, tier)
        `)
        .single();

      if (error) {
        console.error('Create order session error:', error);

        const message = error.message || '';
        const isNetwork = /fetch failed|network request|Failed to fetch/i.test(message);

        if (isNetwork) {
          throw new AppError('Network unavailable while creating tab', 503, 'NETWORK_UNAVAILABLE', error);
        }

        throw new AppError(`Failed to create order session: ${message}`, 500, 'ORDER_SESSION_CREATE_FAILED', error);
      }

      return session as OrderSession;
    } catch (err: any) {
      // Supabase client itself can throw (e.g. TypeError: fetch failed)
      const message = err?.message || String(err ?? 'Unknown error');
      const isNetwork = /fetch failed|network request|Failed to fetch/i.test(message);

      if (isNetwork) {
        console.error('Create order session network error:', err);
        throw new AppError('Network unavailable while creating tab', 503, 'NETWORK_UNAVAILABLE', err);
      }

      console.error('Create order session unexpected error:', err);
      throw new AppError('Failed to create order session', 500, 'ORDER_SESSION_CREATE_FAILED', err);
    }
  }

  /**
   * Get session by ID with related data
   * @param sessionId - Session ID
   * @returns Session with orders
   */
  static async getById(sessionId: string): Promise<OrderSession | null> {
    const { data: session, error } = await supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        table:restaurant_tables!order_sessions_table_id_fkey(id, table_number, area),
        customer:customers(id, full_name, tier),
        orders(
          *,
          order_items(
            *,
            product:products(name, base_price),
            package:packages(name, base_price)
          )
        )
      `)
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Get session error:', error);
      return null;
    }

    return session as OrderSession;
  }

  /**
   * Get active session for a table
   * @param tableId - Table ID
   * @returns Active session or null
   */
  static async getActiveSessionByTable(tableId: string): Promise<OrderSession | null> {
    const { data: session, error } = await supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        table:restaurant_tables!order_sessions_table_id_fkey(id, table_number, area),
        customer:customers(id, full_name, tier),
        orders(
          *,
          order_items(
            *,
            product:products(name, base_price),
            package:packages(name, base_price)
          )
        )
      `)
      .eq('table_id', tableId)
      .eq('status', SessionStatus.OPEN)
      .order('opened_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Get active session error:', error);
      return null;
    }

    return session as OrderSession;
  }

  /**
   * Get all active sessions
   * @returns List of open sessions
   */
  static async getAllActiveSessions(): Promise<OrderSession[]> {
    const { data: sessions, error } = await supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        table:restaurant_tables!order_sessions_table_id_fkey(id, table_number, area),
        customer:customers(id, full_name, tier)
      `)
      .eq('status', SessionStatus.OPEN)
      .order('opened_at', { ascending: false });

    if (error) {
      console.error('Get active sessions error:', error);
      throw new Error(`Failed to fetch active sessions: ${error.message}`);
    }

    return (sessions as OrderSession[]) || [];
  }

  /**
   * Update session details
   * @param sessionId - Session ID
   * @param data - Update data
   * @returns Updated session
   */
  static async update(sessionId: string, data: UpdateOrderSessionDto): Promise<OrderSession> {
    const { data: session, error } = await supabaseAdmin
      .from(this.TABLE)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Update session error:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return session as OrderSession;
  }

  /**
   * Close a session (mark as closed)
   * @param sessionId - Session ID
   * @param closedBy - User ID who closed the session
   * @returns Closed session
   */
  static async close(sessionId: string, closedBy?: string): Promise<OrderSession> {
    const { data: session, error } = await supabaseAdmin
      .from(this.TABLE)
      .update({
        status: SessionStatus.CLOSED,
        closed_at: new Date().toISOString(),
        closed_by: closedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Close session error:', error);
      throw new Error(`Failed to close session: ${error.message}`);
    }

    return session as OrderSession;
  }

  /**
   * Get session with order count and duration
   * @param sessionId - Session ID
   * @returns Session summary
   */
  static async getSessionSummary(sessionId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('active_sessions_view')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Get session summary error:', error);
      return null;
    }

    return data;
  }

  /**
   * Get sessions by date range
   * @param startDate - Start date ISO string
   * @param endDate - End date ISO string
   * @returns Sessions in date range
   */
  static async getByDateRange(startDate: string, endDate: string): Promise<OrderSession[]> {
    const { data: sessions, error } = await supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        table:restaurant_tables!order_sessions_table_id_fkey(id, table_number, area),
        customer:customers(id, full_name, tier)
      `)
      .gte('opened_at', startDate)
      .lte('opened_at', endDate)
      .order('opened_at', { ascending: false });

    if (error) {
      console.error('Get sessions by date range error:', error);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    return (sessions as OrderSession[]) || [];
  }

  /**
   * Mark session as abandoned
   * @param sessionId - Session ID
   * @returns Updated session
   */
  static async markAbandoned(sessionId: string): Promise<OrderSession> {
    const { data: session, error } = await supabaseAdmin
      .from(this.TABLE)
      .update({
        status: SessionStatus.ABANDONED,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Mark session abandoned error:', error);
      throw new Error(`Failed to mark session as abandoned: ${error.message}`);
    }

    return session as OrderSession;
  }

  /**
   * Update table reference when session is created/closed
   * @param tableId - Table ID
   * @param sessionId - Session ID (null to clear)
   */
  static async updateTableSession(tableId: string, sessionId: string | null): Promise<void> {
    const { error } = await supabaseAdmin
      .from('restaurant_tables')
      .update({
        current_session_id: sessionId,
        status: sessionId ? 'occupied' : 'available',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId);

    if (error) {
      console.error('Update table session error:', error);
      throw new Error(`Failed to update table session: ${error.message}`);
    }
  }
}
