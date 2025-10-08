'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { Receipt, Clock, DollarSign, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

/**
 * SessionSelector Component
 * Allows selecting an existing session or creating a new one
 * 
 * Usage in POS workflow:
 * - Show active sessions for the selected table
 * - Allow cashier to resume existing session or open new one
 */
interface SessionSelectorProps {
  tableId?: string;
  onSessionSelected?: (sessionId: string) => void;
}

export default function SessionSelector({ tableId, onSessionSelected }: SessionSelectorProps) {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openingNew, setOpeningNew] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  /**
   * Fetch active session for the table
   */
  const fetchActiveSession = async () => {
    if (!tableId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/order-sessions/by-table/${tableId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setActiveSession(data.data);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Failed to fetch active session:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSession();
  }, [tableId]);

  /**
   * Handle opening a new tab
   */
  const handleOpenNewTab = async () => {
    if (!tableId) {
      alert('Please select a table first');
      return;
    }

    if (!user?.id) {
      alert('User not authenticated');
      return;
    }

    setOpeningNew(true);

    try {
      const response = await fetch('/api/order-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_id: tableId,
          opened_by: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const sessionId = data.data.id;
        setActiveSession(data.data);

        if (onSessionSelected) {
          onSessionSelected(sessionId);
        }

        // Navigate to session order flow
        router.push(`/order-sessions/${sessionId}`);
      } else {
        alert(data.error || 'Failed to open tab');
      }
    } catch (error) {
      console.error('Failed to open tab:', error);
      alert('Failed to open tab');
    } finally {
      setOpeningNew(false);
    }
  };

  /**
   * Handle resuming existing session
   */
  const handleResumeSession = () => {
    if (activeSession) {
      if (onSessionSelected) {
        onSessionSelected(activeSession.id);
      }
      router.push(`/order-sessions/${activeSession.id}`);
    }
  };

  /**
   * Calculate duration
   */
  const getDuration = (openedAt: string): string => {
    const opened = new Date(openedAt);
    const now = new Date();
    const diffMs = now.getTime() - opened.getTime();
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (!tableId) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-gray-500">
          <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Select a table to view or open a tab</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Checking for active tab...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Table Session
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeSession ? (
          <>
            {/* Active Session Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-green-500 mb-2">Active Tab</Badge>
                  <p className="font-mono font-semibold text-lg">
                    {activeSession.session_number}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-green-200">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span>{getDuration(activeSession.opened_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-semibold">
                    {formatCurrency(activeSession.total_amount || 0)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleResumeSession}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Resume Tab & Add Orders
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* No Active Session */}
            <div className="text-center py-6">
              <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">No Active Tab</h3>
              <p className="text-sm text-gray-600 mb-4">
                Open a new tab to start taking orders
              </p>

              <Button
                onClick={handleOpenNewTab}
                disabled={openingNew}
                className="bg-green-600 hover:bg-green-700"
              >
                {openingNew ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Opening Tab...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    <Receipt className="w-4 h-4 mr-2" />
                    Open New Tab
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
