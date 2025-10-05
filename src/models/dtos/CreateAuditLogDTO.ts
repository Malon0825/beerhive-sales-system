/**
 * CreateAuditLogDTO
 * Data Transfer Object for creating audit log entries
 */

export interface CreateAuditLogDTO {
  user_id?: string | null;
  action: string;
  table_name?: string | null;
  record_id?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Audit Log Filter DTO
 */
export interface AuditLogFilterDTO {
  user_id?: string;
  action?: string;
  table_name?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}
