// @ts-nocheck - Supabase query result type inference issues
'use client';

/**
 * Excel Export Button Component
 * 
 * Provides a user interface for exporting data to Excel (.xlsx) format.
 * Supports both single-sheet and multi-sheet exports with formatting options.
 * 
 * @module ExcelExportButton
 * @category Components
 */

import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { 
  ExcelExportService, 
  ExcelHeader, 
  ExcelFormatOptions,
  ExcelWorksheet 
} from '@/core/services/export/ExcelExportService';

/**
 * Props for the ExcelExportButton component
 * 
 * @interface ExcelExportButtonProps
 * @property {any[]} data - Array of data objects to export
 * @property {string} filename - Base filename without extension
 * @property {ExcelHeader[]} headers - Column definitions with labels and formats
 * @property {string} [sheetName] - Optional worksheet name (default: 'Sheet1')
 * @property {ExcelFormatOptions} [formatting] - Optional formatting configuration
 * @property {string} [className] - Optional CSS classes for styling
 */
interface ExcelExportButtonProps {
  data: any[];
  filename: string;
  headers: ExcelHeader[];
  sheetName?: string;
  formatting?: ExcelFormatOptions;
  className?: string;
}

/**
 * Excel Export Button Component
 * 
 * Renders a button that exports data to Excel format when clicked.
 * Shows loading state during export and disables when no data is available.
 * 
 * @component
 * @param {ExcelExportButtonProps} props - Component props
 * @returns {JSX.Element} Rendered button component
 * 
 * @example
 * <ExcelExportButton
 *   data={salesData}
 *   filename="sales_report"
 *   headers={[
 *     { key: 'date', label: 'Date', format: 'date' },
 *     { key: 'amount', label: 'Amount', format: 'currency' }
 *   ]}
 *   sheetName="Sales Data"
 *   formatting={{ totalsRow: true }}
 * />
 */
export function ExcelExportButton({
  data,
  filename,
  headers,
  sheetName = 'Sheet1',
  formatting,
  className = ''
}: ExcelExportButtonProps) {
  // Track export state to show loading indicator
  const [exporting, setExporting] = useState(false);

  /**
   * Handle export button click
   * 
   * Initiates the Excel export process. Shows loading state during export
   * and displays error alert if export fails.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const handleExport = async () => {
    setExporting(true);
    
    try {
      // Export data to Excel using the service
      await ExcelExportService.exportToExcel(
        data,
        headers,
        filename,
        sheetName,
        formatting
      );
      
      // Log success for debugging
      console.log('Excel export successful');
    } catch (error) {
      // Log error and show user-friendly message
      console.error('Export failed:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      // Reset loading state
      setExporting(false);
    }
  };

  // Show disabled state when no data is available
  if (!data || data.length === 0) {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed ${className}`}
        aria-label="No data available to export"
      >
        <FileSpreadsheet className="w-4 h-4" />
        No Data to Export
      </button>
    );
  }

  // Render export button with loading state
  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      aria-label="Export data to Excel"
    >
      {exporting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Exporting...
        </>
      ) : (
        <>
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel
        </>
      )}
    </button>
  );
}

/**
 * Props for the ExcelExportMultiSheet component
 * 
 * @interface ExcelExportMultiSheetProps
 * @property {ExcelWorksheet[]} sheets - Array of worksheet configurations
 * @property {string} filename - Base filename without extension
 * @property {string} [className] - Optional CSS classes for styling
 */
interface ExcelExportMultiSheetProps {
  sheets: ExcelWorksheet[];
  filename: string;
  className?: string;
}

/**
 * Excel Multi-Sheet Export Button Component
 * 
 * Renders a button that exports multiple worksheets to a single Excel file.
 * Each worksheet can have its own data, headers, and formatting options.
 * 
 * @component
 * @param {ExcelExportMultiSheetProps} props - Component props
 * @returns {JSX.Element} Rendered button component
 * 
 * @example
 * <ExcelExportMultiSheet
 *   sheets={[
 *     {
 *       name: 'Sales',
 *       data: salesData,
 *       headers: salesHeaders,
 *       formatting: { totalsRow: true }
 *     },
 *     {
 *       name: 'Products',
 *       data: productsData,
 *       headers: productsHeaders
 *     }
 *   ]}
 *   filename="comprehensive_report"
 * />
 */
export function ExcelExportMultiSheet({
  sheets,
  filename,
  className = ''
}: ExcelExportMultiSheetProps) {
  // Track export state to show loading indicator
  const [exporting, setExporting] = useState(false);

  /**
   * Handle multi-sheet export button click
   * 
   * Initiates the multi-sheet Excel export process. Shows loading state
   * during export and displays error alert if export fails.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const handleExportAll = async () => {
    setExporting(true);
    
    try {
      // Export all sheets to a single Excel file
      await ExcelExportService.exportMultiSheet(sheets, filename);
      
      // Log success for debugging
      console.log('Multi-sheet Excel export successful');
    } catch (error) {
      // Log error and show user-friendly message
      console.error('Multi-sheet export failed:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      // Reset loading state
      setExporting(false);
    }
  };

  // Check if any sheet has data
  const hasData = sheets.some(sheet => sheet.data && sheet.data.length > 0);

  // Show disabled state when no data is available in any sheet
  if (!hasData) {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed ${className}`}
        aria-label="No data available to export"
      >
        <FileSpreadsheet className="w-4 h-4" />
        No Data to Export
      </button>
    );
  }

  // Render export button with loading state and sheet count
  return (
    <button
      onClick={handleExportAll}
      disabled={exporting}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      aria-label={`Export ${sheets.length} sheets to Excel`}
    >
      {exporting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Exporting {sheets.length} Sheets...
        </>
      ) : (
        <>
          <FileSpreadsheet className="w-4 h-4" />
          Export All ({sheets.length} Sheets)
        </>
      )}
    </button>
  );
}
