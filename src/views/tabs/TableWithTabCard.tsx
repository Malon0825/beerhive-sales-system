'use client';

import React, { useState } from 'react';
import { Badge } from '@/views/shared/ui/badge';
import { Button } from '@/views/shared/ui/button';
import { Card, CardContent } from '@/views/shared/ui/card';
import { 
  Clock, 
  Users, 
  DollarSign, 
  Plus, 
  Eye,
  CreditCard,
  ShoppingCart,
  Shuffle,
  Edit3,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { ChangeTableDialog } from './ChangeTableDialog';
import ManageTabItemsModal from '@/views/orders/ManageTabItemsModal';

/**
 * TableWithTabCard Component
 * Unified display for table status with integrated tab information
 * 
 * Shows:
 * - Table number, area, and capacity
 * - Active tab status and details
 * - Quick actions (Open Tab, View Bill, Add Order, Close Tab)
 * 
 * @component
 */
interface TableWithTabCardProps {
  table: {
    id: string;
    table_number: string;
    capacity: number;
    area?: string;
    status: string;
  };
  session?: {
    id: string;
    session_number: string;
    total_amount: number;
    opened_at: string;
    customer?: {
      full_name: string;
      tier?: string;
    };
    status: string;
    _pending_sync?: boolean;
    _temp_id?: boolean;
  } | null;
  onOpenTab: (tableId: string) => void;
  onViewBill: (sessionId: string) => void;
  onAddOrder: (sessionId: string) => void;
  onCloseTab: (sessionId: string) => void;
  onTableChanged?: () => void;
}

export default function TableWithTabCard({
  table,
  session,
  onOpenTab,
  onViewBill,
  onAddOrder,
  onCloseTab,
  onTableChanged,
}: TableWithTabCardProps) {
  const [showChangeTableDialog, setShowChangeTableDialog] = useState(false);
  const [showManageItemsModal, setShowManageItemsModal] = useState(false);
  /**
   * Calculate duration since session opened
   */
  const getDuration = (openedAt: string): string => {
    const opened = new Date(openedAt);
    const now = new Date();
    const diffMs = now.getTime() - opened.getTime();
    const minutes = Math.floor(diffMs / 60000);
    
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  /**
   * Get card border color based on status
   */
  const getBorderColor = () => {
    if (session) {
      return 'border-blue-400 bg-blue-50/30';
    }
    switch (table.status) {
      case 'available':
        return 'border-green-200 hover:border-green-300';
      case 'occupied':
        return 'border-red-200';
      case 'reserved':
        return 'border-yellow-200';
      default:
        return 'border-gray-200';
    }
  };

  /**
   * Get status badge
   */
  const getStatusBadge = () => {
    if (session) {
      return (
        <Badge className="bg-blue-600 text-white">
          <Clock className="w-3 h-3 mr-1" />
          Tab Active
        </Badge>
      );
    }
    switch (table.status) {
      case 'available':
        return <Badge className="bg-green-500 text-white">Available</Badge>;
      case 'occupied':
        return <Badge className="bg-red-500 text-white">Occupied</Badge>;
      case 'reserved':
        return <Badge className="bg-yellow-500 text-white">Reserved</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{table.status}</Badge>;
    }
  };

  return (
    <Card className={`border-2 ${getBorderColor()} transition-all hover:shadow-lg`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{table.table_number}</h3>
            {table.area && (
              <p className="text-xs text-gray-500 capitalize">
                {table.area.replace('_', ' ')}
              </p>
            )}
          </div>
          {getStatusBadge()}
        </div>

        {/* Table Capacity */}
        <div className="flex items-center text-xs text-gray-600 mb-3">
          <Users className="w-3 h-3 mr-1" />
          {table.capacity} seats
        </div>

        {/* Session Info (if active) */}
        {session ? (
          <div className="space-y-2 mb-3 p-3 bg-white rounded-lg border border-blue-200">
            {/* Session Number */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono text-gray-600">{session.session_number}</span>
                {session._pending_sync && (
                  <Badge variant="outline" className="text-xs h-4 px-1 border-yellow-400 text-yellow-700 bg-yellow-50">
                    <Clock className="w-2 h-2 mr-0.5" />
                    Saving…
                  </Badge>
                )}
                {session._temp_id && (
                  <Badge variant="outline" className="text-xs h-4 px-1 border-gray-400 text-gray-600">
                    <AlertCircle className="w-2 h-2 mr-0.5" />
                    Offline tab
                  </Badge>
                )}
              </div>
              <span className="text-xs text-gray-500">{getDuration(session.opened_at)}</span>
            </div>

            {/* Customer */}
            {session.customer && (
              <div className="flex items-center text-xs text-gray-700">
                <Users className="w-3 h-3 mr-1" />
                <span className="font-medium">{session.customer.full_name}</span>
                {session.customer.tier && session.customer.tier !== 'regular' && (
                  <Badge variant="outline" className="ml-2 text-xs h-4 px-1">
                    {session.customer.tier}
                  </Badge>
                )}
              </div>
            )}

            {/* Total Amount */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-gray-600">Total:</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(session.total_amount || 0)}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500">No active tab</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {session ? (
            // Tab is active - show tab management buttons
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddOrder(session.id);
                  }}
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Add Order
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewBill(session.id);
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View Bill
                </Button>
              </div>
              
              {/* Manage Items Button */}
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowManageItemsModal(true);
                }}
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Remove Items
              </Button>
              
              {/* Change Table Button */}
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-8 border-orange-200 text-orange-700 hover:bg-orange-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowChangeTableDialog(true);
                }}
              >
                <Shuffle className="w-3 h-3 mr-1" />
                Change Table
              </Button>
              
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(session.id);
                }}
              >
                <CreditCard className="w-3 h-3 mr-1" />
                Close Tab & Pay
              </Button>
            </>
          ) : table.status === 'available' ? (
            // No tab - show open tab button for available tables
            <Button
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-xs h-9"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTab(table.id);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Open New Tab
            </Button>
          ) : (
            // Table not available
            <div className="text-center py-2">
              <p className="text-xs text-gray-400">Table not available</p>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Change Table Dialog */}
      <ChangeTableDialog
        open={showChangeTableDialog && !!session}
        onOpenChange={setShowChangeTableDialog}
        sessionId={session?.id || ''}
        currentTableNumber={table.table_number}
        onSuccess={() => {
          if (onTableChanged) {
            onTableChanged();
          }
        }}
      />
      
      {/* Manage Items Modal - Single modal shows all items directly */}
      <ManageTabItemsModal
        sessionId={session?.id || ''}
        sessionNumber={session?.session_number || ''}
        isOpen={showManageItemsModal && !!session}
        onClose={() => setShowManageItemsModal(false)}
        onItemsChanged={() => {
          // Refresh parent data
          if (onTableChanged) {
            onTableChanged();
          }
        }}
      />
    </Card>
  );
}
