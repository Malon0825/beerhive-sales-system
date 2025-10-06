import { DashboardHomeClient } from '@/views/dashboard/DashboardHomeClient';

/**
 * Dashboard Home Page
 * Shows customer order history and statistics
 * 
 * Access Control:
 * - Admin: Can access dashboard (/)
 * - Manager: Can access dashboard (/)
 * - Cashier: Can access dashboard (/)
 * - Kitchen: Auto-redirected to /kitchen
 * - Bartender: Auto-redirected to /bartender
 * - Waiter: Auto-redirected to /waiter
 * 
 * Features:
 * - Customer statistics cards
 * - Order history with filtering
 * - Expandable order details
 */
/**
 * Dashboard Page (Server Component)
 *
 * Renders the client-only dashboard UI via `DashboardHomeClient`.
 * This separation helps Next.js generate client reference manifests
 * reliably in Vercel builds.
 */
export default function DashboardPage() {
  return <DashboardHomeClient />;
}
