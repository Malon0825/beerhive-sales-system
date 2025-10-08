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
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/tabs')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tabs
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add Order to Tab</h1>
            <p className="text-gray-600 mt-1">
              Add items to the active tab • Stock tracking enabled
            </p>
          </div>
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
