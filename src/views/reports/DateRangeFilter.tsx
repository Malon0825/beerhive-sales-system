// @ts-nocheck - Supabase query result type inference issues
'use client';

/**
 * Date Range Filter Component
 * Reusable date range selector for reports
 */

import { useState } from 'react';
import { Calendar } from 'lucide-react';

export type DatePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface DateRangeFilterProps {
  onDateRangeChange: (startDate: string, endDate: string, period: DatePeriod) => void;
  defaultPeriod?: DatePeriod;
}

export function DateRangeFilter({ onDateRangeChange, defaultPeriod = 'week' }: DateRangeFilterProps) {
  const [period, setPeriod] = useState<DatePeriod>(defaultPeriod);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Time-aware custom range states: keep raw date-only + time for precise filtering across midnight
  const [startDateOnly, setStartDateOnly] = useState('');
  const [endDateOnly, setEndDateOnly] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');

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

  // Combine date-only and time into ISO strings and propagate to parent
  const handleCustomDateChange = () => {
    if (startDateOnly && endDateOnly) {
      const startStr = new Date(`${startDateOnly}T${(startTime || '00:00')}:00`).toISOString();
      const endStr = new Date(`${endDateOnly}T${(endTime || '23:59')}:59`).toISOString();
      setStartDate(startStr);
      setEndDate(endStr);
      onDateRangeChange(startStr, endStr, 'custom');
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
              value={startDateOnly}
              onChange={(e) => {
                setStartDateOnly(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDateOnly}
              onChange={(e) => {
                setEndDateOnly(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="md:col-span-2">
            <button
              onClick={handleCustomDateChange}
              disabled={!startDateOnly || !endDateOnly}
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
