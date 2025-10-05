import { format, formatDistance, formatRelative } from 'date-fns';

/**
 * Format a date to a readable string
 * @param date - Date to format
 * @param pattern - Format pattern (default: 'MMM dd, yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, pattern: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, pattern);
}

/**
 * Format a date and time
 * @param date - Date to format
 * @returns Formatted date-time string
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'MMM dd, yyyy hh:mm a');
}

/**
 * Format a date relative to now (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Relative date string
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

/**
 * Format time only
 * @param date - Date to format
 * @returns Time string
 */
export function formatTime(date: Date | string): string {
  return formatDate(date, 'hh:mm a');
}
