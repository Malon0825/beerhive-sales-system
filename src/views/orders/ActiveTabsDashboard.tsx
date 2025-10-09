'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { Clock, DollarSign, Users, Receipt, CreditCard, Eye } from 'lucide-react';
import { OrderSession } from '@/models/entities/OrderSession';
import { SessionStatus } from '@/models/enums/SessionStatus';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRealtime } from '@/lib/hooks/useRealtime';
import { apiGet } from '@/lib/utils/apiClient';

/**
 * ActiveTabsDashboard Component
 * Displays all active order sessions (tabs) with real-time updates
 * 
 * Features:
 * - View all open tabs
 * - Real-time session updates
 * - Quick actions (view bill, close tab)
 * - Session statistics
 */
export default function ActiveTabsDashboard() {
  const [sessions, setSessions] = useState<OrderSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  /**
   * Fetch all active sessions from API
   * Uses authenticated API client to include Bearer token
   */
  const fetchActiveTabs = async () => {
    try {
      const data = await apiGet('/api/order-sessions');
      
      if (data.success) {
        setSessions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch active tabs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchActiveTabs();
  }, []);

  // Real-time subscription for order sessions
  useRealtime({
    table: 'order_sessions',
    event: '*',
    onChange: () => {
      console.log('Session updated, refreshing...');
      fetchActiveTabs();
    },
  });

  // Calculate statistics
  const stats = {
    totalTabs: sessions.length,
    totalRevenue: sessions.reduce((sum, s) => sum + (s.total_amount || 0), 0),
    averageTicket: sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + (s.total_amount || 0), 0) / sessions.length 
      : 0,
  };

  /**
   * Calculate duration since session opened
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

  /**
   * Get status badge color
   */
  const getStatusColor = (status: SessionStatus): string => {
    switch (status) {
      case SessionStatus.OPEN:
        return 'bg-green-500';
      case SessionStatus.CLOSED:
        return 'bg-gray-500';
      case SessionStatus.ABANDONED:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading active tabs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Active Tabs</h1>
          <p className="text-gray-600 mt-1">Monitor all open customer tabs</p>
        </div>
        <Button
          onClick={fetchActiveTabs}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tabs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTabs}</div>
            <p className="text-xs text-muted-foreground">
              Currently open sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Pending payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Ticket</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageTicket)}</div>
            <p className="text-xs text-muted-foreground">
              Per session
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions Grid */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Tabs</h3>
            <p className="text-gray-500">
              All tables are available. Open a new tab to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedSession === session.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedSession(session.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {session.table?.table_number || 'Walk-in'}
                  </CardTitle>
                  <Badge className={getStatusColor(session.status)}>
                    {session.status}
                  </Badge>
                </div>
                {session.table?.area && (
                  <p className="text-sm text-gray-500">{session.table.area}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Customer Info */}
                {session.customer && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{session.customer.full_name}</span>
                    {session.customer.tier && (
                      <Badge variant="outline" className="text-xs">
                        {session.customer.tier}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Session Number */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Receipt className="w-4 h-4" />
                  <span className="font-mono">{session.session_number}</span>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{getDuration(session.opened_at)}</span>
                </div>

                {/* Total Amount */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(session.total_amount || 0)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/order-sessions/${session.id}/bill-preview`;
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    View Bill
                  </Button>
                  <Button
                    size="sm"
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/order-sessions/${session.id}/close`;
                    }}
                  >
                    <CreditCard className="w-4 h-4" />
                    Close Tab
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
