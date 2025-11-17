'use client';

import { useState } from 'react';
import { Wifi, WifiOff, AlertTriangle, RefreshCcw, RotateCcw } from 'lucide-react';
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/lib/hooks/useToast';

interface OfflineStatusBadgeProps {
  className?: string;
}

export function OfflineStatusBadge({ className }: OfflineStatusBadgeProps) {
  const {
    isOnline,
    syncStatus,
    lastSyncUpdate,
    refreshSyncStatus,
    retryFailedMutations,
  } = useOfflineRuntime();
  const pending = syncStatus.pendingCount ?? 0;
  const failed = syncStatus.failedCount ?? 0;
  const syncing = Boolean(syncStatus.syncing);

  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const indicatorColor = !isOnline
    ? 'bg-red-500 animate-pulse'
    : failed > 0
    ? 'bg-orange-500 animate-pulse'
    : pending > 0 || syncing
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  const statusLabel = !isOnline
    ? 'Offline mode'
    : failed > 0
    ? 'Attention needed'
    : pending > 0 || syncing
    ? 'Syncing queued orders'
    : 'All caught up';

  const lastUpdatedLabel = lastSyncUpdate
    ? lastSyncUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSyncStatus();
      toast({
        title: 'Sync status updated',
        description: 'Queue counts refreshed from local IndexedDB.',
      });
    } catch {
      toast({
        title: 'Failed to refresh status',
        description: 'Please try again in a few seconds.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryFailedMutations();
      toast({
        title: 'Retry triggered',
        description: 'Failed mutations moved back to the queue.',
      });
    } catch {
      toast({
        title: 'Retry failed',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-amber-200 bg-white/90 p-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', indicatorColor)} aria-hidden />
        <div>
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-emerald-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            {statusLabel}
            {syncing && (
              <Badge variant="warning" className="uppercase tracking-wide">
                Syncing
              </Badge>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Pending: <strong>{pending}</strong> • Failed: <strong>{failed}</strong>
          </div>
          <div className="text-xs text-gray-500">
            Last update: {lastUpdatedLabel}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={refreshing}
          onClick={handleRefresh}
          className="flex items-center gap-1"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={failed > 0 ? 'destructive' : 'outline'}
          disabled={failed === 0 || retrying}
          onClick={handleRetry}
          className="flex items-center gap-1"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {retrying ? 'Retrying…' : failed > 0 ? 'Retry failed' : 'Retry'}
        </Button>
        {!isOnline && (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Offline-first
          </Badge>
        )}
      </div>
    </div>
  );
}
