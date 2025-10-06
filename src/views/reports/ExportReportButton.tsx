// @ts-nocheck - Supabase query result type inference issues
'use client';

/**
 * Export Report Button Component
 * Export reports to CSV format
 */

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';

interface ExportReportButtonProps {
  data: any[];
  filename: string;
  headers?: string[];
  className?: string;
}

export function ExportReportButton({ 
  data, 
  filename, 
  headers,
  className = '' 
}: ExportReportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const convertToCSV = (objArray: any[], headerList?: string[]) => {
    if (!objArray || objArray.length === 0) {
      return '';
    }

    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    let str = '';

    // Get headers
    const headers = headerList || Object.keys(array[0]);
    str += headers.join(',') + '\r\n';

    // Add data rows
    for (let i = 0; i < array.length; i++) {
      let line = '';
      for (let j = 0; j < headers.length; j++) {
        if (line !== '') line += ',';

        const header = headers[j];
        let value = array[i][header];

        // Handle nested objects
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }

        // Escape commas and quotes in values
        if (value && typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
        }

        line += value || '';
      }
      str += line + '\r\n';
    }

    return str;
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExport = () => {
    setExporting(true);

    try {
      // Flatten nested objects for better CSV export
      const flattenedData = data.map(item => {
        const flattened: any = {};
        
        Object.keys(item).forEach(key => {
          const value = item[key];
          
          // Handle nested objects (like cashier, customer, etc.)
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Extract common properties
            if (value.full_name) {
              flattened[`${key}_name`] = value.full_name;
            } else if (value.name) {
              flattened[`${key}_name`] = value.name;
            } else {
              flattened[key] = JSON.stringify(value);
            }
          } else {
            flattened[key] = value;
          }
        });

        return flattened;
      });

      const csv = convertToCSV(flattenedData, headers);
      const timestamp = new Date().toISOString().split('T')[0];
      const fullFilename = `${filename}_${timestamp}.csv`;
      
      downloadCSV(csv, fullFilename);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
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
        <Download className="w-4 h-4" />
        No Data to Export
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {exporting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Exporting...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Export to CSV
        </>
      )}
    </button>
  );
}

/**
 * Export Multiple Reports Button
 * For exporting comprehensive reports with multiple sheets (tabs)
 */
interface ExportMultipleReportsProps {
  reports: Array<{
    data: any[];
    name: string;
    headers?: string[];
  }>;
  filename: string;
  className?: string;
}

export function ExportMultipleReports({ 
  reports, 
  filename,
  className = '' 
}: ExportMultipleReportsProps) {
  const [exporting, setExporting] = useState(false);

  const convertToCSV = (objArray: any[], headerList?: string[]) => {
    if (!objArray || objArray.length === 0) {
      return '';
    }

    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    let str = '';

    const headers = headerList || Object.keys(array[0]);
    str += headers.join(',') + '\r\n';

    for (let i = 0; i < array.length; i++) {
      let line = '';
      for (let j = 0; j < headers.length; j++) {
        if (line !== '') line += ',';

        const header = headers[j];
        let value = array[i][header];

        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }

        if (value && typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
        }

        line += value || '';
      }
      str += line + '\r\n';
    }

    return str;
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportAll = () => {
    setExporting(true);

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Export each report as a separate CSV file
      // Download them sequentially with small delay
      reports.forEach((report, index) => {
        setTimeout(() => {
          // Flatten nested objects
          const flattenedData = report.data.map(item => {
            const flattened: any = {};
            
            Object.keys(item).forEach(key => {
              const value = item[key];
              
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                if (value.full_name) {
                  flattened[`${key}_name`] = value.full_name;
                } else if (value.name) {
                  flattened[`${key}_name`] = value.name;
                } else {
                  flattened[key] = JSON.stringify(value);
                }
              } else {
                flattened[key] = value;
              }
            });

            return flattened;
          });

          const csv = convertToCSV(flattenedData, report.headers);
          const fullFilename = `${filename}_${report.name}_${timestamp}.csv`;
          downloadCSV(csv, fullFilename);
        }, index * 500); // Stagger downloads by 500ms
      });

      setTimeout(() => {
        setExporting(false);
      }, reports.length * 500 + 1000);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export reports. Please try again.');
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportAll}
      disabled={exporting}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {exporting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Exporting {reports.length} Reports...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          Export All Reports
        </>
      )}
    </button>
  );
}
