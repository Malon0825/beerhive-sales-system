/**
 * Reports Page
 * Main page for viewing business reports and analytics
 */

import { ReportsDashboard } from '@/views/reports/ReportsDashboard';

export const metadata = {
  title: 'Reports & Analytics | BeerHive POS',
  description: 'View sales, inventory, and customer reports',
};

export default function ReportsPage() {
  return (
    <div className="p-6">
      <ReportsDashboard />
    </div>
  );
}
