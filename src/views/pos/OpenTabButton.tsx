'use client';

import React, { useState } from 'react';
import { Button } from '@/views/shared/ui/button';
import { Receipt, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * OpenTabButton Component
 * Button to open a new tab session for a table
 * 
 * Features:
 * - Quick tab creation
 * - Navigation to session order flow
 * - Visual feedback
 */
interface OpenTabButtonProps {
  tableId?: string;
  customerId?: string;
  onTabOpened?: (sessionId: string) => void;
}

export default function OpenTabButton({ tableId, customerId, onTabOpened }: OpenTabButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  /**
   * Handle opening a new tab
   */
  const handleOpenTab = async () => {
    if (!tableId) {
      alert('Please select a table first');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/order-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_id: tableId,
          customer_id: customerId,
          opened_by: 'current-user-id', // TODO: Get from auth context
        }),
      });

      const data = await response.json();

      if (data.success) {
        const sessionId = data.data.id;
        
        if (onTabOpened) {
          onTabOpened(sessionId);
        }

        // Navigate to session order flow
        router.push(`/order-sessions/${sessionId}`);
      } else {
        alert(data.error || 'Failed to open tab');
      }
    } catch (error) {
      console.error('Failed to open tab:', error);
      alert('Failed to open tab. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleOpenTab}
      disabled={loading || !tableId}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Opening Tab...
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" />
          <Receipt className="w-4 h-4" />
          Open New Tab
        </>
      )}
    </Button>
  );
}
