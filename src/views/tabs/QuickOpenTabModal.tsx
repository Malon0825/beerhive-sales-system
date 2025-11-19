'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/views/shared/ui/dialog';
import { Button } from '@/views/shared/ui/button';
import { Input } from '@/views/shared/ui/input';
import { Label } from '@/views/shared/ui/label';
import { CustomerSearch } from '../pos/CustomerSearch';
import { Users, X, WifiOff } from 'lucide-react';
import { Badge } from '@/views/shared/ui/badge';
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
import { enqueueSyncMutation, putOrderSession, type OfflineOrderSession } from '@/lib/data-batching/offlineDb';
import { MutationSyncService } from '@/lib/data-batching/MutationSyncService';
import { toast } from '@/lib/hooks/useToast';
import { OfflineToasts } from '@/lib/utils/toastMessages';
import { useRouter } from 'next/navigation';

/**
 * QuickOpenTabModal Component
 * Modal dialog for quickly opening a new tab with optional customer selection
 * 
 * Features:
 * - Display table information
 * - Optional customer selection
 * - Notes field
 * - Quick tab creation
 * 
 * @component
 */
interface QuickOpenTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: {
    id: string;
    table_number: string;
    capacity: number;
    area?: string;
  } | null;
  onConfirm?: (tableId: string, customerId?: string, notes?: string) => Promise<void>;
}

export default function QuickOpenTabModal({
  isOpen,
  onClose,
  table,
  onConfirm,
}: QuickOpenTabModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isOnline } = useOfflineRuntime();
  const router = useRouter();

  /**
   * Reset form when modal closes
   */
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedCustomer(null);
      setNotes('');
      setLoading(false);
      setShowCustomerSearch(false);
    }
  }, [isOpen]);

  /**
   * Handle form submission
   * Opens the tab optimistically and navigates to add-order page immediately.
   * Uses a temp session ID when offline and queues mutation for sync.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!table || loading) return; // Prevent duplicate submissions

    setLoading(true);
    try {
      // Generate temp session ID for offline/optimistic flow
      const tempSessionId = `offline-session-${Date.now()}`;
      const tempSessionNumber = `TEMP-${Date.now().toString().slice(-6)}`;

      // Create optimistic session payload for IndexedDB
      const now = new Date().toISOString();
      const tempSession: OfflineOrderSession = {
        id: tempSessionId,
        session_number: tempSessionNumber,
        table_id: table.id,
        customer_id: selectedCustomer?.id,
        status: 'open',
        opened_at: now,
        updated_at: now,
        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        notes: notes || undefined,
        table: {
          id: table.id,
          table_number: table.table_number,
          area: table.area,
        },
        customer: selectedCustomer
          ? {
              id: selectedCustomer.id,
              full_name: selectedCustomer.full_name,
              tier: selectedCustomer.tier,
            }
          : undefined,
        _pending_sync: true,
        _temp_id: true,
      };

      // Save optimistic session locally for instant offline use
      await putOrderSession(tempSession);
      console.log('💾 [QuickOpenTabModal] Created temp session:', tempSessionId);

      // Queue mutation for server-side session creation
      const queueId = await enqueueSyncMutation('orderSessions.create', {
        endpoint: '/api/order-sessions',
        method: 'POST',
        body: {
          table_id: table.id,
          customer_id: selectedCustomer?.id,
          notes: notes || undefined,
        },
        local_id: tempSessionId,
        created_at: now,
      });

      console.log(`📋 [QuickOpenTabModal] Queued session creation mutation: #${queueId}`);

      toast(OfflineToasts.tabOpened(isOnline));

      // Navigate immediately using the temp session ID; this will be
      // reconciled to the real ID by MutationSyncService once synced.
      router.push(`/tabs/${tempSessionId}/add-order`);

      // Trigger background sync if online
      if (isOnline) {
        const syncService = MutationSyncService.getInstance();
        void syncService.processPendingMutations();
      }

      // Close modal after navigation
      onClose();

      // NOTE: onConfirm callback removed - session creation now handled via mutation queue
      // The offline-first flow queues the mutation and syncs it, so calling onConfirm
      // would create a duplicate session (causing "duplicate key" database errors)
    } catch (error) {
      console.error('Failed to open tab:', error);
      alert('Failed to open tab. Please try again.');
      setLoading(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!loading) {
      setSelectedCustomer(null);
      setNotes('');
      onClose();
    }
  };

  /**
   * Handle customer selection
   */
  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setShowCustomerSearch(false);
  };

  /**
   * Get tier badge color
   */
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'vip_platinum':
        return 'bg-gray-800 text-white';
      case 'vip_gold':
        return 'bg-yellow-500 text-white';
      case 'vip_silver':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  if (!table) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              Open New Tab
              {!isOnline && (
                <Badge variant="outline" className="ml-2 flex items-center gap-1 text-xs">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Create a new tab for table {table.table_number}
              {table.area && ` (${table.area.replace('_', ' ')})`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Table Info */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Table {table.table_number}
                    </p>
                    <p className="text-xs text-blue-700">
                      Capacity: {table.capacity} seats
                    </p>
                  </div>
                  <Badge className="bg-blue-600 text-white">Ready</Badge>
                </div>
              </div>

              {/* Customer Selection */}
              <div className="space-y-2">
                <Label>Customer (Optional)</Label>
                {selectedCustomer ? (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedCustomer.full_name}
                        </p>
                        {selectedCustomer.tier && selectedCustomer.tier !== 'regular' && (
                          <Badge 
                            className={`text-xs mt-1 ${getTierColor(selectedCustomer.tier)}`}
                          >
                            {selectedCustomer.tier.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCustomerSearch(true)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Select Customer
                  </Button>
                )}
                <p className="text-xs text-gray-500">
                  Link this tab to a customer for personalized pricing and history
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="e.g., Birthday celebration, Special requests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Opening...
                  </>
                ) : (
                  'Open Tab'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Search Dialog */}
      <CustomerSearch
        open={showCustomerSearch}
        onOpenChange={setShowCustomerSearch}
        onSelectCustomer={handleSelectCustomer}
      />
    </>
  );
}
