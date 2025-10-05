/**
 * Inventory Reports Page
 * 
 * Main page for viewing comprehensive inventory reports and analytics.
 * Displays inventory summaries, turnover analysis, stock alerts, and value distribution.
 * 
 * @module InventoryReportsPage
 * @category Pages
 */

import { Metadata } from 'next';
import InventoryReportDashboard from '@/views/inventory/InventoryReportDashboard';

export const metadata: Metadata = {
  title: 'Inventory Reports | BeerHive POS',
  description: 'Comprehensive inventory reports, turnover analysis, and stock alerts',
};

/**
 * Inventory Reports Page Component
 * 
 * Server component that renders the inventory report dashboard.
 * 
 * @returns {JSX.Element} Inventory reports page
 */
export default function InventoryReportsPage() {
  return (
    <div className="p-6">
      <InventoryReportDashboard />
    </div>
  );
}
