/**
 * Excel Export Service
 * 
 * Handles Excel file generation with formatting capabilities.
 * Provides methods for exporting data to .xlsx format with customizable styling,
 * column widths, and multi-sheet support.
 * 
 * @module ExcelExportService
 * @category Services
 */

import * as XLSX from 'xlsx';

/**
 * Interface for defining Excel column headers
 * 
 * @interface ExcelHeader
 * @property {string} key - The property key in the data object
 * @property {string} label - The display label for the column header
 * @property {number} [width] - Optional column width in characters
 * @property {ExcelFormat} [format] - Optional cell format type
 */
export interface ExcelHeader {
  key: string;
  label: string;
  width?: number;
  format?: 'text' | 'number' | 'currency' | 'date' | 'percentage';
}

/**
 * Interface for Excel formatting options
 * 
 * @interface ExcelFormatOptions
 * @property {string} [headerColor] - Color for header row (hex format)
 * @property {boolean} [alternateRows] - Enable zebra striping for rows
 * @property {boolean} [freezeHeader] - Freeze the header row
 * @property {boolean} [totalsRow] - Add a totals row at the bottom
 */
export interface ExcelFormatOptions {
  headerColor?: string;
  alternateRows?: boolean;
  freezeHeader?: boolean;
  totalsRow?: boolean;
}

/**
 * Interface for multi-sheet export configuration
 * 
 * @interface ExcelWorksheet
 * @property {string} name - The name of the worksheet
 * @property {any[]} data - Array of data objects
 * @property {ExcelHeader[]} headers - Column definitions
 * @property {ExcelFormatOptions} [formatting] - Optional formatting options
 */
export interface ExcelWorksheet {
  name: string;
  data: any[];
  headers: ExcelHeader[];
  formatting?: ExcelFormatOptions;
}

/**
 * Excel Export Service Class
 * 
 * Provides static methods for exporting data to Excel format with various
 * formatting and styling options. Supports both single-sheet and multi-sheet exports.
 * 
 * @class ExcelExportService
 */
export class ExcelExportService {
  /**
   * Export data to an Excel file with a single worksheet
   * 
   * Creates an Excel workbook with formatted data and downloads it to the user's device.
   * Supports custom column headers, cell formatting, and styling options.
   * 
   * @param {any[]} data - Array of data objects to export
   * @param {ExcelHeader[]} headers - Column definitions with labels and formats
   * @param {string} filename - Base filename without extension
   * @param {string} [sheetName='Sheet1'] - Name of the worksheet
   * @param {ExcelFormatOptions} [formatting] - Optional formatting configuration
   * @throws {Error} If export fails
   * 
   * @example
   * const data = [{ date: '2025-10-01', amount: 1250.50 }];
   * const headers = [
   *   { key: 'date', label: 'Date', format: 'date' },
   *   { key: 'amount', label: 'Amount', format: 'currency' }
   * ];
   * ExcelExportService.exportToExcel(data, headers, 'sales_report');
   */
  static exportToExcel(
    data: any[],
    headers: ExcelHeader[],
    filename: string,
    sheetName: string = 'Sheet1',
    formatting?: ExcelFormatOptions
  ): void {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Prepare data with headers and formatted values
      const worksheetData = this.prepareData(data, headers, formatting);

      // Create worksheet from array of arrays
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths based on header configuration
      worksheet['!cols'] = headers.map(h => ({ wch: h.width || 15 }));

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Generate timestamp for filename
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Download the file
      XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error('Failed to export Excel file');
    }
  }

  /**
   * Export multiple worksheets to a single Excel file
   * 
   * Creates an Excel workbook with multiple worksheets, each with its own data
   * and formatting. Useful for comprehensive reports with related datasets.
   * 
   * @param {ExcelWorksheet[]} sheets - Array of worksheet configurations
   * @param {string} filename - Base filename without extension
   * @throws {Error} If export fails
   * 
   * @example
   * const sheets = [
   *   {
   *     name: 'Sales',
   *     data: salesData,
   *     headers: salesHeaders,
   *     formatting: { totalsRow: true }
   *   },
   *   {
   *     name: 'Products',
   *     data: productsData,
   *     headers: productsHeaders
   *   }
   * ];
   * ExcelExportService.exportMultiSheet(sheets, 'monthly_report');
   */
  static exportMultiSheet(
    sheets: ExcelWorksheet[],
    filename: string
  ): void {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Process each sheet
      sheets.forEach(sheet => {
        // Prepare data for this sheet
        const worksheetData = this.prepareData(
          sheet.data,
          sheet.headers,
          sheet.formatting
        );
        
        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Set column widths
        worksheet['!cols'] = sheet.headers.map(h => ({ wch: h.width || 15 }));
        
        // Sanitize sheet name (Excel limit: 31 characters, no special chars)
        const sheetName = this.sanitizeSheetName(sheet.name);
        
        // Add to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Generate timestamp for filename
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Download the file
      XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
    } catch (error) {
      console.error('Multi-sheet export error:', error);
      throw new Error('Failed to export Excel file');
    }
  }

  /**
   * Prepare data array with headers and formatted values
   * 
   * Transforms the input data into a 2D array format suitable for Excel export.
   * Applies formatting to cell values and adds optional totals row.
   * 
   * @private
   * @param {any[]} data - Array of data objects
   * @param {ExcelHeader[]} headers - Column definitions
   * @param {ExcelFormatOptions} [formatting] - Optional formatting options
   * @returns {any[][]} 2D array of formatted data
   */
  private static prepareData(
    data: any[],
    headers: ExcelHeader[],
    formatting?: ExcelFormatOptions
  ): any[][] {
    const result: any[][] = [];

    // Add header row with labels
    result.push(headers.map(h => h.label));

    // Process each data row
    data.forEach(row => {
      const rowData = headers.map(header => {
        const value = row[header.key];
        return this.formatValue(value, header.format);
      });
      result.push(rowData);
    });

    // Add totals row if requested
    if (formatting?.totalsRow) {
      const totals = this.calculateTotals(data, headers);
      result.push(totals);
    }

    return result;
  }

  /**
   * Format a cell value based on its type
   * 
   * Converts raw values into appropriate formats for Excel cells.
   * Handles currency, dates, percentages, numbers, and nested objects.
   * 
   * @private
   * @param {any} value - The raw value to format
   * @param {string} [format] - The desired format type
   * @returns {any} Formatted value suitable for Excel
   */
  private static formatValue(value: any, format?: string): any {
    // Handle null or undefined values
    if (value === null || value === undefined) return '';

    switch (format) {
      case 'currency':
        // Convert to number for currency formatting
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      
      case 'date':
        // Convert to Date object
        if (value instanceof Date) return value;
        return new Date(value);
      
      case 'percentage':
        // Convert to decimal (Excel expects 0.25 for 25%)
        const num = typeof value === 'number' ? value : parseFloat(value) || 0;
        return num / 100;
      
      case 'number':
        // Ensure numeric value
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      
      default:
        // Handle nested objects by extracting name properties
        if (typeof value === 'object' && value !== null) {
          return value.name || value.full_name || JSON.stringify(value);
        }
        return value;
    }
  }

  /**
   * Calculate totals row for numeric columns
   * 
   * Sums up values in currency and number columns to create a totals row.
   * First column shows "TOTAL" label, remaining columns show sums or empty strings.
   * 
   * @private
   * @param {any[]} data - Array of data objects
   * @param {ExcelHeader[]} headers - Column definitions
   * @returns {any[]} Array of total values
   */
  private static calculateTotals(data: any[], headers: ExcelHeader[]): any[] {
    return headers.map((header, index) => {
      // First column shows "TOTAL" label
      if (index === 0) return 'TOTAL';
      
      // Sum numeric columns
      if (header.format === 'currency' || header.format === 'number') {
        const sum = data.reduce((acc, row) => {
          const value = parseFloat(row[header.key]) || 0;
          return acc + value;
        }, 0);
        return sum;
      }
      
      // Leave other columns empty
      return '';
    });
  }

  /**
   * Sanitize sheet name for Excel compatibility
   * 
   * Removes invalid characters and truncates name to Excel's 31-character limit.
   * Invalid characters: \ / * ? : [ ]
   * 
   * @private
   * @param {string} name - The desired sheet name
   * @returns {string} Sanitized sheet name
   */
  private static sanitizeSheetName(name: string): string {
    // Remove invalid characters for Excel sheet names
    let sanitized = name.replace(/[\\/\*\?:\[\]]/g, '');
    
    // Limit to 31 characters (Excel's maximum)
    if (sanitized.length > 31) {
      sanitized = sanitized.substring(0, 31);
    }
    
    // Return sanitized name or default if empty
    return sanitized || 'Sheet';
  }

  /**
   * Flatten nested objects for export
   * 
   * Converts nested object structures into flat key-value pairs suitable for Excel.
   * Extracts common properties like 'name' and 'full_name' from nested objects.
   * 
   * @param {any[]} data - Array of data objects with potential nested structures
   * @returns {any[]} Array of flattened data objects
   * 
   * @example
   * const nested = [{ cashier: { full_name: 'John Doe' }, total: 100 }];
   * const flat = ExcelExportService.flattenData(nested);
   * // Result: [{ cashier_name: 'John Doe', total: 100 }]
   */
  static flattenData(data: any[]): any[] {
    return data.map(item => {
      const flattened: any = {};
      
      Object.keys(item).forEach(key => {
        const value = item[key];
        
        // Handle nested objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Extract common name properties
          if (value.full_name) {
            flattened[`${key}_name`] = value.full_name;
          } else if (value.name) {
            flattened[`${key}_name`] = value.name;
          } else {
            // Stringify complex objects
            flattened[key] = JSON.stringify(value);
          }
        } else {
          // Keep primitive values as-is
          flattened[key] = value;
        }
      });

      return flattened;
    });
  }
}
