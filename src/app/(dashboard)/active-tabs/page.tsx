import React from 'react';
import ActiveTabsDashboard from '@/views/orders/ActiveTabsDashboard';

/**
 * Active Tabs Page
 * Route: /active-tabs
 * 
 * Displays all currently open order sessions (tabs)
 * Accessible by: Cashier, Manager, Admin
 */
export default function ActiveTabsPage() {
  return (
    <div className="container mx-auto py-6">
      <ActiveTabsDashboard />
    </div>
  );
}
