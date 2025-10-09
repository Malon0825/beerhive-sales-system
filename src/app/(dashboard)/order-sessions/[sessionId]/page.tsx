'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import SessionOrderFlow from '@/views/pos/SessionOrderFlow';
import { Button } from '@/views/shared/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * Session Order Management Page
 * Route: /order-sessions/[sessionId]
 * 
 * Manage orders within a specific session
 * Create, confirm, and track orders
 */
export default function SessionOrderPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/active-tabs">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Active Tabs
          </Button>
        </Link>
      </div>

      {/* Session Order Flow */}
      <SessionOrderFlow 
        sessionId={sessionId}
        onOrderConfirmed={(orderId) => {
          console.log('Order confirmed:', orderId);
          // Could navigate or show success message
        }}
      />
    </div>
  );
}
