'use client';

/**
 * Date Range Filter Component
 * Reusable date range selector for reports
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

export type DatePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: string, endDate: string, period: DatePeriod) => void;
  defaultPeriod?: DatePeriod;
}

export function DateRangeFilter({ onDateRangeChange, defaultPeriod = 'week' }: DateRangeFilterProps) {
  const [period, setPeriod] = useState<DatePeriod>(defaultPeriod);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handlePeriodChange = (newPeriod: DatePeriod) => {
    setPeriod(newPeriod);
    
    let start: Date;
    let end: Date;

    switch (newPeriod) {
      case 'today':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start = new Date();
        start.setDate(start.getDate() - 7);
        end = new Date();
        break;
      case 'month':
        start = new Date();
        start.setDate(start.getDate() - 30);
        end = new Date();
        break;
      case 'custom':
        return; // Wait for user to select dates
      default:
        start = new Date();
        start.setDate(start.getDate() - 7);
        end = new Date();
    }

    // Convert to ISO strings and trigger the callback
    const startStr = start.toISOString();
    const endStr = end.toISOString();
    setStartDate(startStr);
    setEndDate(endStr);
    onDateRangeChange(startStr, endStr, newPeriod);
  };

  const handleCustomDateChange = () => {
    if (startDate && endDate) {
      onDateRangeChange(startDate, endDate, 'custom');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Date Range</h3>
      </div>

      {/* Period Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handlePeriodChange('today')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 'today'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => handlePeriodChange('yesterday')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 'yesterday'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Yesterday
        </button>
        <button
          onClick={() => handlePeriodChange('week')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => handlePeriodChange('month')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => handlePeriodChange('custom')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom Range
        </button>
      </div>

      {/* Custom Date Inputs */}
      {period === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate ? format(new Date(startDate), 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                const newStartDate = new Date(e.target.value).toISOString();
                setStartDate(newStartDate);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate ? format(new Date(endDate), 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                const newEndDate = new Date(e.target.value).toISOString();
                setEndDate(newEndDate);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <button
              onClick={handleCustomDateChange}
              disabled={!startDate || !endDate}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply Custom Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
