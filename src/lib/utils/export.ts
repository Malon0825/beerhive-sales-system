/**
 * Export Utilities
 * Generic functions for exporting data to various formats
 */

import { format } from 'date-fns';

/**
 * Convert JSON data to CSV format
 * 
 * @param data - Array of objects to export
 * @param filename - Output filename
 * @param headers - Optional custom headers (defaults to object keys)
 * 
 * @example
 * exportToCSV(products, 'inventory-report', ['Product Name', 'Stock', 'Price']);
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Use provided headers or extract from first object
  const headerRow = headers || Object.keys(data[0]);

  // Build CSV content
  const csvContent = [
    // Header row
    headerRow.join(','),
    // Data rows
    ...data.map((row) =>
      headerRow
        .map((header) => {
          const value = row[header];
          // Handle different data types
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          // Escape quotes and wrap in quotes if contains comma or newline
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    ),
  ].join('\n');

  downloadFile(csvContent, `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

/**
 * Export data as JSON file
 * 
 * @param data - Data to export
 * @param filename - Output filename
 * @param pretty - Whether to format JSON with indentation
 */
export function exportToJSON<T>(data: T, filename: string, pretty: boolean = true): void {
  const jsonContent = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  downloadFile(
    jsonContent,
    `${filename}-${format(new Date(), 'yyyy-MM-dd')}.json`,
    'application/json'
  );
}

/**
 * Export table data to CSV (simplified for HTML tables)
 * 
 * @param headers - Array of header strings
 * @param rows - Array of row arrays
 * @param filename - Output filename
 */
export function exportTableToCSV(
  headers: string[],
  rows: string[][],
  filename: string
): void {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape and quote cells that need it
          if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    ),
  ].join('\n');

  downloadFile(csvContent, `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

/**
 * Format currency for export
 */
export function formatCurrency(value: number): string {
  return `₱${value.toFixed(2)}`;
}

/**
 * Format date for export
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Format percentage for export
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Export package availability data
 */
export function exportPackageAvailability(packages: any[], filename: string = 'package-availability'): void {
  const data = packages.map((pkg) => ({
    'Package Name': pkg.package_name,
    'Max Sellable': pkg.max_sellable,
    'Status': pkg.status,
    'Bottleneck Product': pkg.bottleneck?.product_name || 'None',
    'Bottleneck Stock': pkg.bottleneck?.current_stock || 'N/A',
  }));

  exportToCSV(data, filename);
}

/**
 * Export consumption analysis data
 */
export function exportConsumptionAnalysis(
  consumption: any,
  filename: string = 'consumption-analysis'
): void {
  const data = [
    {
      'Product Name': consumption.product_name,
      'SKU': consumption.sku,
      'Total Consumed': consumption.total_consumed,
      'Direct Sales': consumption.direct_sales,
      'Direct %': formatPercentage(consumption.direct_percentage),
      'Package Consumption': consumption.package_consumption,
      'Package %': formatPercentage(consumption.package_percentage),
    },
  ];

  exportToCSV(data, filename);
}

/**
 * Export bottleneck analysis
 */
export function exportBottleneckAnalysis(bottlenecks: any[], filename: string = 'bottleneck-analysis'): void {
  const data = bottlenecks.map((b) => ({
    'Product Name': b.product_name,
    'SKU': b.sku,
    'Current Stock': b.current_stock,
    'Reorder Point': b.reorder_point,
    'Packages Affected': b.total_packages_affected,
    'Revenue Impact': formatCurrency(b.total_revenue_impact),
    'Bottleneck Severity': b.bottleneck_severity.toFixed(2),
    'Optimal Restock': b.optimal_restock,
  }));

  exportToCSV(data, filename);
}
