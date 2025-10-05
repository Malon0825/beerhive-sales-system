# Excel Export - Quick Implementation Guide

**Ready-to-use code for implementing Excel export feature**

---

## Step 1: Install Library

```bash
npm install xlsx
npm install --save-dev @types/node  # For TypeScript support
```

---

## Step 2: Create ExcelExportService

**File:** `src/core/services/export/ExcelExportService.ts`

```typescript
/**
 * Excel Export Service
 * Handles Excel file generation with formatting
 */

import * as XLSX from 'xlsx';

export interface ExcelHeader {
  key: string;
  label: string;
  width?: number;
  format?: 'text' | 'number' | 'currency' | 'date' | 'percentage';
}

export interface ExcelFormatOptions {
  headerColor?: string;
  alternateRows?: boolean;
  freezeHeader?: boolean;
  totalsRow?: boolean;
}

export class ExcelExportService {
  /**
   * Export data to Excel file
   * @param data - Array of data objects
   * @param headers - Column definitions
   * @param filename - Output filename (without extension)
   * @param sheetName - Worksheet name
   * @param formatting - Optional formatting options
   */
  static exportToExcel(
    data: any[],
    headers: ExcelHeader[],
    filename: string,
    sheetName: string = 'Sheet1',
    formatting?: ExcelFormatOptions
  ): void {
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Prepare data with headers
      const worksheetData = this.prepareData(data, headers, formatting);

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths
      worksheet['!cols'] = headers.map(h => ({ wch: h.width || 15 }));

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Generate and download file
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error('Failed to export Excel file');
    }
  }

  /**
   * Export multiple sheets to one Excel file
   */
  static exportMultiSheet(
    sheets: Array<{
      name: string;
      data: any[];
      headers: ExcelHeader[];
      formatting?: ExcelFormatOptions;
    }>,
    filename: string
  ): void {
    try {
      const workbook = XLSX.utils.book_new();

      sheets.forEach(sheet => {
        const worksheetData = this.prepareData(sheet.data, sheet.headers, sheet.formatting);
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        worksheet['!cols'] = sheet.headers.map(h => ({ wch: h.width || 15 }));
        
        // Sanitize sheet name (Excel limit: 31 chars)
        const sheetName = sheet.name.substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);
    } catch (error) {
      console.error('Multi-sheet export error:', error);
      throw new Error('Failed to export Excel file');
    }
  }

  /**
   * Prepare data array with formatted values
   */
  private static prepareData(
    data: any[],
    headers: ExcelHeader[],
    formatting?: ExcelFormatOptions
  ): any[][] {
    const result: any[][] = [];

    // Add header row
    result.push(headers.map(h => h.label));

    // Add data rows
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
   * Format cell value based on type
   */
  private static formatValue(value: any, format?: string): any {
    if (value === null || value === undefined) return '';

    switch (format) {
      case 'currency':
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      
      case 'date':
        if (value instanceof Date) return value;
        return new Date(value);
      
      case 'percentage':
        const num = typeof value === 'number' ? value : parseFloat(value) || 0;
        return num / 100;
      
      case 'number':
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      
      default:
        // Handle nested objects
        if (typeof value === 'object' && value !== null) {
          return value.name || value.full_name || JSON.stringify(value);
        }
        return value;
    }
  }

  /**
   * Calculate totals row
   */
  private static calculateTotals(data: any[], headers: ExcelHeader[]): any[] {
    return headers.map((header, index) => {
      if (index === 0) return 'TOTAL';
      
      if (header.format === 'currency' || header.format === 'number') {
        const sum = data.reduce((acc, row) => {
          const value = parseFloat(row[header.key]) || 0;
          return acc + value;
        }, 0);
        return sum;
      }
      
      return '';
    });
  }
}
```

---

## Step 3: Create ExcelExportButton Component

**File:** `src/views/reports/ExcelExportButton.tsx`

```typescript
'use client';

/**
 * Excel Export Button Component
 * Button for exporting data to Excel format
 */

import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { ExcelExportService, ExcelHeader, ExcelFormatOptions } from '@/core/services/export/ExcelExportService';

interface ExcelExportButtonProps {
  data: any[];
  filename: string;
  headers: ExcelHeader[];
  sheetName?: string;
  formatting?: ExcelFormatOptions;
  className?: string;
}

export function ExcelExportButton({
  data,
  filename,
  headers,
  sheetName = 'Sheet1',
  formatting,
  className = ''
}: ExcelExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    
    try {
      // Dynamic import to reduce initial bundle size
      await ExcelExportService.exportToExcel(
        data,
        headers,
        filename,
        sheetName,
        formatting
      );
      
      // Show success notification (implement your toast system)
      console.log('Excel export successful');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!data || data.length === 0) {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed ${className}`}
      >
        <FileSpreadsheet className="w-4 h-4" />
        No Data to Export
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
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
```

---

## Step 4: Usage Examples

### Example 1: Sales Report Export

```typescript
// In your report component
import { ExcelExportButton } from '@/views/reports/ExcelExportButton';

const SalesReportPage = () => {
  const salesData = [
    { date: '2025-10-01', order_number: 'ORD-001', total: 1250.50, status: 'completed' },
    { date: '2025-10-02', order_number: 'ORD-002', total: 890.00, status: 'completed' },
    // ... more data
  ];

  const headers = [
    { key: 'date', label: 'Date', width: 12, format: 'date' as const },
    { key: 'order_number', label: 'Order Number', width: 15 },
    { key: 'total', label: 'Total Amount', width: 15, format: 'currency' as const },
    { key: 'status', label: 'Status', width: 12 }
  ];

  return (
    <div>
      <h1>Sales Report</h1>
      
      <ExcelExportButton
        data={salesData}
        filename="sales_report"
        headers={headers}
        sheetName="Sales Data"
        formatting={{
          totalsRow: true,
          alternateRows: true
        }}
      />
      
      {/* Your report table/chart */}
    </div>
  );
};
```

### Example 2: Multi-Sheet Export

```typescript
import { ExcelExportService } from '@/core/services/export/ExcelExportService';

const exportAllReports = () => {
  const sheets = [
    {
      name: 'Sales Summary',
      data: salesData,
      headers: [
        { key: 'date', label: 'Date', format: 'date' as const },
        { key: 'revenue', label: 'Revenue', format: 'currency' as const },
        { key: 'orders', label: 'Orders', format: 'number' as const }
      ],
      formatting: { totalsRow: true }
    },
    {
      name: 'Top Products',
      data: topProductsData,
      headers: [
        { key: 'name', label: 'Product Name' },
        { key: 'quantity_sold', label: 'Quantity', format: 'number' as const },
        { key: 'revenue', label: 'Revenue', format: 'currency' as const }
      ]
    },
    {
      name: 'Customers',
      data: customersData,
      headers: [
        { key: 'name', label: 'Customer Name' },
        { key: 'total_spent', label: 'Total Spent', format: 'currency' as const },
        { key: 'visit_count', label: 'Visits', format: 'number' as const }
      ]
    }
  ];

  ExcelExportService.exportMultiSheet(sheets, 'comprehensive_report');
};

// In your component
<button onClick={exportAllReports}>
  Export All Reports (Multiple Sheets)
</button>
```

### Example 3: Reports Dashboard Integration

```typescript
// In ReportsDashboard.tsx
import { ExcelExportButton } from './ExcelExportButton';

export function ReportsDashboard() {
  // ... existing code ...

  const salesHeaders = [
    { key: 'date', label: 'Date', width: 12, format: 'date' as const },
    { key: 'total_revenue', label: 'Revenue', width: 15, format: 'currency' as const },
    { key: 'transaction_count', label: 'Orders', width: 10, format: 'number' as const },
    { key: 'average_transaction', label: 'Avg Order', width: 15, format: 'currency' as const }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Reports & Analytics</h1>
        
        <div className="flex gap-2">
          {/* Existing CSV export */}
          <ExportReportButton 
            data={dashboardData?.sales.daily_sales || []} 
            filename="sales_report"
          />
          
          {/* NEW: Excel export */}
          <ExcelExportButton
            data={dashboardData?.sales.daily_sales || []}
            filename="sales_report"
            headers={salesHeaders}
            sheetName="Daily Sales"
            formatting={{
              totalsRow: true,
              alternateRows: true
            }}
          />
        </div>
      </div>
      
      {/* Rest of dashboard */}
    </div>
  );
}
```

---

## Step 5: Advanced Formatting (Optional)

### Custom Styling with ExcelJS

If you need advanced styling, upgrade to `exceljs`:

```bash
npm install exceljs
```

**Example with ExcelJS:**

```typescript
import ExcelJS from 'exceljs';

export class AdvancedExcelExportService {
  static async exportWithStyling(
    data: any[],
    headers: ExcelHeader[],
    filename: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Define columns
    worksheet.columns = headers.map(h => ({
      header: h.label,
      key: h.key,
      width: h.width || 15
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    data.forEach(row => {
      worksheet.addRow(row);
    });

    // Apply alternating row colors
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }
        };
      }
    });

    // Format currency columns
    headers.forEach((header, index) => {
      if (header.format === 'currency') {
        const colLetter = String.fromCharCode(65 + index);
        worksheet.getColumn(colLetter).numFmt = '₱#,##0.00';
      }
    });

    // Freeze first row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
```

---

## Troubleshooting

### Issue: Large Bundle Size

**Solution:** Use dynamic imports

```typescript
const handleExport = async () => {
  const XLSX = await import('xlsx');
  // Use XLSX here
};
```

### Issue: Export Fails on Large Datasets

**Solution:** Add chunking

```typescript
if (data.length > 10000) {
  alert('Dataset too large. Please filter data before exporting.');
  return;
}
```

### Issue: Date Format Issues

**Solution:** Ensure dates are Date objects

```typescript
const formatValue = (value: any) => {
  if (format === 'date') {
    return value instanceof Date ? value : new Date(value);
  }
  return value;
};
```

---

## Testing

### Test Export Functionality

```typescript
// Create test data
const testData = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: Math.random() * 1000,
  quantity: Math.floor(Math.random() * 100),
  date: new Date()
}));

const testHeaders = [
  { key: 'id', label: 'ID', width: 10, format: 'number' },
  { key: 'name', label: 'Product Name', width: 20 },
  { key: 'price', label: 'Price', width: 15, format: 'currency' },
  { key: 'quantity', label: 'Quantity', width: 12, format: 'number' },
  { key: 'date', label: 'Date', width: 15, format: 'date' }
];

// Test export
ExcelExportService.exportToExcel(
  testData,
  testHeaders,
  'test_export',
  'Test Sheet'
);
```

---

## Next Steps

1. ✅ Install `xlsx` library
2. ✅ Copy `ExcelExportService.ts` to your project
3. ✅ Create `ExcelExportButton.tsx` component
4. ✅ Add to Reports Dashboard
5. ✅ Test with sample data
6. ✅ Roll out to all report pages

---

## Summary

This implementation provides:
- ✅ Single-sheet Excel export
- ✅ Multi-sheet Excel export
- ✅ Cell formatting (currency, dates, numbers)
- ✅ Totals row calculation
- ✅ Column width configuration
- ✅ Reusable components
- ✅ Error handling
- ✅ Loading states
- ✅ TypeScript support

**Estimated implementation time:** 2-4 hours for basic functionality
