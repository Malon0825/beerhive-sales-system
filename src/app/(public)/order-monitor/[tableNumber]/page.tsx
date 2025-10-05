'use client';

import { use } from 'react';
import { CurrentOrderMonitor } from '@/views/orders/CurrentOrderMonitor';

interface PageProps {
  params: Promise<{
    tableNumber: string;
  }>;
}

/**
 * Customer-Facing Order Monitor Page
 * 
 * Route: /order-monitor/[tableNumber]
 * Example: /order-monitor/T-01
 * 
 * This page displays the current order for a specific table.
 * Customers can scan a QR code at their table to view their current bill in real-time.
 * 
 * Features:
 * - Real-time updates when items are added/removed
 * - Shows item details, quantities, and prices
 * - Displays discounts and VIP pricing
 * - Shows total bill amount
 * - No authentication required (public access)
 */
export default function OrderMonitorPage({ params }: PageProps) {
  const { tableNumber } = use(params);

  return <CurrentOrderMonitor tableNumber={tableNumber} />;
}
