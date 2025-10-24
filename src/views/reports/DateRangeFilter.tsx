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

  /**
   * Handle period quick filter changes (Today, Yesterday, Week, Month)
   * 
   * Business Hours Alignment (v1.0.2): 
   * Operations run from 5pm to 5pm next day.
   * All date ranges adjusted to match actual business day cycles.
   * 
   * - Today: 5pm yesterday → 5pm today (current business day)
   * - Yesterday: 5pm 2 days ago → 5pm yesterday (previous business day)
   * - Last 7 Days: 5pm 8 days ago → 5pm today (7 complete business days)
   * - Last 30 Days: 5pm 31 days ago → 5pm today (30 complete business days)
   * 
   * Timezone Fix (v1.0.3):
   * Appends explicit timezone offset (+08:00 for Philippines) to prevent PostgreSQL
   * from misinterpreting timestamps when database timezone differs from app timezone.
   */
  const handlePeriodChange = (newPeriod: DatePeriod) => {
    setPeriod(newPeriod);
    
    let start: Date;
    let end: Date;

    // Format as local datetime string with explicit timezone offset
    // Format: "YYYY-MM-DDTHH:mm:ss+08:00" (Philippines/Manila timezone)
    const formatLocalDateTime = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
    };

    switch (newPeriod) {
      case 'today':
        // Current business day: 5pm yesterday to 5pm today
        start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(17, 0, 0, 0); // 5pm yesterday
        end = new Date();
        end.setHours(17, 0, 0, 0); // 5pm today
        break;
      case 'yesterday':
        // Previous business day: 5pm 2 days ago to 5pm yesterday
        start = new Date();
        start.setDate(start.getDate() - 2);
        start.setHours(17, 0, 0, 0); // 5pm 2 days ago
        end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(17, 0, 0, 0); // 5pm yesterday
        break;
      case 'week':
        // Last 7 business days: 5pm 8 days ago to 5pm today
        start = new Date();
        start.setDate(start.getDate() - 8);
        start.setHours(17, 0, 0, 0); // 5pm 8 days ago
        end = new Date();
        end.setHours(17, 0, 0, 0); // 5pm today
        break;
      case 'month':
        // Last 30 business days: 5pm 31 days ago to 5pm today
        start = new Date();
        start.setDate(start.getDate() - 31);
        start.setHours(17, 0, 0, 0); // 5pm 31 days ago
        end = new Date();
        end.setHours(17, 0, 0, 0); // 5pm today
        break;
      case 'custom':
        // Default custom range: 5pm yesterday to 5pm today (current business day)
        start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(17, 0, 0, 0); // 5pm yesterday
        end = new Date();
        end.setHours(17, 0, 0, 0); // 5pm today
        
        // Pre-populate the date and time fields
        const formatDateOnly = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        const formatTimeOnly = (date: Date): string => {
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${hours}:${minutes}`;
        };
        
        setStartDateOnly(formatDateOnly(start));
        setEndDateOnly(formatDateOnly(end));
        setStartTime(formatTimeOnly(start));
        setEndTime(formatTimeOnly(end));
        
        // Auto-apply the custom range immediately
        const startStrCustom = formatLocalDateTime(start);
        const endStrCustom = formatLocalDateTime(end);
        setStartDate(startStrCustom);
        setEndDate(endStrCustom);
        onDateRangeChange(startStrCustom, endStrCustom, newPeriod);
        return; // Exit early for custom range
      default:
        start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
    }

    const startStr = formatLocalDateTime(start);
    const endStr = formatLocalDateTime(end);
    setStartDate(startStr);
    setEndDate(endStr);
    onDateRangeChange(startStr, endStr, newPeriod);
  };

  /**
   * Combine date-only and time into datetime strings and propagate to parent
   * 
   * CRITICAL FIX: Append explicit timezone offset to prevent PostgreSQL misinterpretation.
   * Without timezone, PostgreSQL interprets timestamps based on database timezone setting,
   * which may differ from application timezone, causing 8-hour shifts in query results.
   * 
   * Philippines Time = UTC+8, so we append '+08:00' to make timezone explicit.
   * Format: "YYYY-MM-DDTHH:mm:ss+08:00"
   * 
   * Bug History:
   * - v1.0.1: Used .toISOString() → forced UTC conversion (wrong)
   * - v1.0.2: Removed .toISOString() → timezone-naive strings (still wrong if DB in UTC)
   * - v1.0.3: Append explicit timezone offset → correct interpretation guaranteed
   */
  const handleCustomDateChange = () => {
    if (startDateOnly && endDateOnly) {
      // Format: "YYYY-MM-DDTHH:mm:ss+08:00" with explicit Philippines timezone
      const startStr = `${startDateOnly}T${(startTime || '00:00')}:00+08:00`;
      const endStr = `${endDateOnly}T${(endTime || '23:59')}:59+08:00`;
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
