/**
 * Loading Component for Dashboard Routes
 * Displays a skeleton loader while dashboard pages are being loaded
 * Provides immediate visual feedback during route transitions
 */
import { DashboardSkeleton } from '@/components/loading/LoadingSkeleton';

/**
 * Dashboard Loading State
 * Used by Next.js App Router to show loading UI during navigation
 */
export default function Loading() {
  return (
    <div className="animate-in fade-in duration-300">
      <DashboardSkeleton />
    </div>
  );
}
