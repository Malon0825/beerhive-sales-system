'use client';

import { use } from 'react';
import SessionOrderFlow from '@/views/pos/SessionOrderFlow';
import { StockTrackerProvider } from '@/lib/contexts/StockTrackerContext';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/views/shared/ui/button';
import { useRouter } from 'next/navigation';

/**
 * Add Order to Tab Page
 * Interface for adding orders to an existing tab session
 * 
 * Features:
 * - Realtime stock tracking in memory
 * - Stock deducted when items added to cart
 * - Stock saved to DB only after successful order confirmation
 * - Professional layout matching POS interface
 * 
 * @page
 */
export default function AddOrderToTabPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  /**
   * Handle order confirmed - redirect back to tabs
   */
  const handleOrderConfirmed = () => {
    router.push('/tabs');
  };

  return (
    <StockTrackerProvider>
      <div className="space-y-4">
        {/* Header with Back Button and Tab Detail */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left: Back Button and Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/tabs')}
              className="h-10 w-10 p-0 hover:bg-gray-100 flex-shrink-0"
              aria-label="Back to tabs"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add Order to Tab</h1>
              <p className="text-sm text-gray-600">
                Add items to the active tab • Stock tracking enabled
              </p>
            </div>
          </div>

          {/* Right: Tab Detail will be rendered here by SessionOrderFlow */}
          <div id="tab-detail-container" className="lg:min-w-[400px]" />
        </div>

        {/* Order Flow Component with Stock Tracking */}
        <SessionOrderFlow
          sessionId={resolvedParams.sessionId}
          onOrderConfirmed={handleOrderConfirmed}
        />
      </div>
    </StockTrackerProvider>
  );
}
