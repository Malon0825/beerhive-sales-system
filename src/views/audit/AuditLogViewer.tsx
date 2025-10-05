'use client';

/**
 * AuditLogViewer Component
 * Main component for viewing and filtering audit logs
 */

import React, { useState, useEffect } from 'react';
import { AuditLogWithUser } from '@/models';
import AuditLogTable from './AuditLogTable';
import AuditLogFilters from './AuditLogFilters';

interface FilterOptions {
  actions: string[];
  tables: string[];
  users: Array<{ id: string; full_name: string; username: string }>;
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    actions: [],
    tables: [],
    users: [],
  });
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    table_name: '',
    start_date: '',
    end_date: '',
  });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 50;

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch logs when filters or page change
  useEffect(() => {
    fetchLogs();
  }, [filters, currentPage]);

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/audit-logs/filters');
      
      if (response.ok) {
        const result = await response.json();
        setFilterOptions(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.action) params.append('action', filters.action);
      if (filters.table_name) params.append('table_name', filters.table_name);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      params.append('limit', limit.toString());
      params.append('offset', ((currentPage - 1) * limit).toString());

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      
      if (response.ok) {
        const result = await response.json();
        setLogs(result.data);
        setTotal(result.total);
      } else {
        console.error('Failed to fetch audit logs');
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <AuditLogFilters
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
      />
      
      <AuditLogTable
        logs={logs}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
