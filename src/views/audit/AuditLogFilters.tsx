'use client';

/**
 * AuditLogFilters Component
 * Filter controls for audit logs
 */

import React from 'react';

interface FilterOptions {
  actions: string[];
  tables: string[];
  users: Array<{ id: string; full_name: string; username: string }>;
}

interface Filters {
  user_id: string;
  action: string;
  table_name: string;
  start_date: string;
  end_date: string;
}

interface AuditLogFiltersProps {
  filters: Filters;
  filterOptions: FilterOptions;
  onFilterChange: (filters: Filters) => void;
}

export default function AuditLogFilters({
  filters,
  filterOptions,
  onFilterChange,
}: AuditLogFiltersProps) {
  const handleChange = (field: keyof Filters, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({
      user_id: '',
      action: '',
      table_name: '',
      start_date: '',
      end_date: '',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        <button
          onClick={handleClearFilters}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* User Filter */}
        <div>
          <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 mb-1">
            User
          </label>
          <select
            id="user_id"
            value={filters.user_id}
            onChange={(e) => handleChange('user_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Users</option>
            {filterOptions.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} ({user.username})
              </option>
            ))}
          </select>
        </div>

        {/* Action Filter */}
        <div>
          <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">
            Action
          </label>
          <select
            id="action"
            value={filters.action}
            onChange={(e) => handleChange('action', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actions</option>
            {filterOptions.actions.map((action) => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Table Filter */}
        <div>
          <label htmlFor="table_name" className="block text-sm font-medium text-gray-700 mb-1">
            Table
          </label>
          <select
            id="table_name"
            value={filters.table_name}
            onChange={(e) => handleChange('table_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tables</option>
            {filterOptions.tables.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date Filter */}
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="datetime-local"
            id="start_date"
            value={filters.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* End Date Filter */}
        <div>
          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="datetime-local"
            id="end_date"
            value={filters.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
