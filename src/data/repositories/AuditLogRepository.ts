/**
 * AuditLogRepository
 * Data access layer for audit log operations
 */

import { supabaseAdmin } from '@/data/supabase/server-client';
import { AuditLog, AuditLogWithUser, CreateAuditLogDTO, AuditLogFilterDTO } from '@/models';

export class AuditLogRepository {
  /**
   * Create a new audit log entry
   */
  static async create(data: CreateAuditLogDTO): Promise<AuditLog | null> {
    try {
      const { data: auditLog, error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: data.user_id,
          action: data.action,
          table_name: data.table_name,
          record_id: data.record_id,
          old_values: data.old_values,
          new_values: data.new_values,
          ip_address: data.ip_address,
          user_agent: data.user_agent,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating audit log:', error);
        return null;
      }

      return auditLog;
    } catch (error) {
      console.error('Error in AuditLogRepository.create:', error);
      return null;
    }
  }

  /**
   * Get audit logs with filters
   */
  static async getAll(filters: AuditLogFilterDTO = {}): Promise<{
    logs: AuditLogWithUser[];
    total: number;
  }> {
    let query = supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        user:users(id, full_name, username, role)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.table_name) {
      query = query.eq('table_name', filters.table_name);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    // Apply pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    return {
      logs: data || [],
      total: count || 0,
    };
  }

  /**
   * Get audit logs by user ID
   */
  static async getByUser(userId: string, limit = 50): Promise<AuditLogWithUser[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        user:users(id, full_name, username, role)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch user audit logs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get audit logs by table and record
   */
  static async getByRecord(
    tableName: string,
    recordId: string,
    limit = 20
  ): Promise<AuditLogWithUser[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        user:users(id, full_name, username, role)
      `)
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch record audit logs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get audit logs by date range
   */
  static async getByDateRange(
    startDate: string,
    endDate: string,
    limit = 100
  ): Promise<AuditLogWithUser[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        user:users(id, full_name, username, role)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch audit logs by date range: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get audit logs by action type
   */
  static async getByAction(action: string, limit = 50): Promise<AuditLogWithUser[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        user:users(id, full_name, username, role)
      `)
      .eq('action', action)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch audit logs by action: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get distinct action types
   */
  static async getActionTypes(): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('action')
      .order('action');

    if (error) {
      throw new Error(`Failed to fetch action types: ${error.message}`);
    }

    // Get unique action types
    const uniqueActions = Array.from(new Set(data?.map((item: any) => item.action) || []));
    return uniqueActions;
  }

  /**
   * Get distinct table names
   */
  static async getTableNames(): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('table_name')
      .not('table_name', 'is', null)
      .order('table_name');

    if (error) {
      throw new Error(`Failed to fetch table names: ${error.message}`);
    }

    // Get unique table names
    const uniqueTables = Array.from(new Set(data?.map((item: any) => item.table_name).filter(Boolean) || []));
    return uniqueTables as string[];
  }
}
