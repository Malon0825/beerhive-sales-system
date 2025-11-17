'use client';

import { Wifi, WifiOff, AlertTriangle, CheckCircle2, Database } from 'lucide-react';
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
import { DataBatchingService } from '@/lib/data-batching/DataBatchingService';
import { Button } from './button';
import { Badge } from './badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/lib/hooks/useToast';
import { useState, useMemo } from 'react';

/**
 * SyncStatusIndicator Component
 * 
 * Compact sync status indicator for the header navigation.
 * Shows online/offline status and pending/failed mutation counts.
 * Provides quick actions via dropdown menu.
 * 
 * Design:
 * - Icon-based indicator that changes based on status
 * - Badge shows count of pending/failed items
 * - Dropdown shows detailed status and actions
 * - Color-coded for quick status recognition
 */
export function SyncStatusIndicator() {
  const {
    isOnline,
    syncStatus,
    refreshSyncStatus,
    retryFailedMutations,
  } = useOfflineRuntime();
  
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  
  const dataBatching = useMemo(() => DataBatchingService.getInstance(), []);

  const pending = syncStatus.pendingCount ?? 0;
  const failed = syncStatus.failedCount ?? 0;
  const syncing = Boolean(syncStatus.syncing);
  const totalIssues = pending + failed;

  // Determine icon and color based on status
  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-5 w-5 text-red-500" />;
    }
    if (failed > 0) {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    }
    if (pending > 0 || syncing) {
      return <Wifi className="h-5 w-5 text-amber-500 animate-pulse" />;
    }
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  };

  const getStatusLabel = () => {
    if (!isOnline) return 'Offline mode';
    if (failed > 0) return 'Attention needed';
    if (pending > 0 || syncing) return 'Syncing';
    return 'All synced';
  };

  const getBadgeVariant = () => {
    if (!isOnline || failed > 0) return 'destructive';
    if (pending > 0 || syncing) return 'warning';
    return 'success';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSyncStatus();
      toast({
        title: 'Status refreshed',
        description: 'Sync queue updated.',
      });
    } catch {
      toast({
        title: 'Refresh failed',
        description: 'Please try again.',
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
        description: 'Failed items moved back to queue.',
      });
    } catch {
      toast({
        title: 'Retry failed',
        description: 'Check connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleSyncCatalog = async () => {
    if (!isOnline) {
      toast({
        title: 'Cannot sync',
        description: 'You must be online to sync the catalog.',
        variant: 'destructive',
      });
      return;
    }

    setSyncingCatalog(true);
    try {
      toast({
        title: 'Syncing catalog',
        description: 'Fetching latest products, packages, categories, and tables...',
      });
      
      await dataBatching.forceFullSync();
      
      toast({
        title: 'Catalog synced',
        description: 'All data has been updated. Components will refresh automatically.',
      });
      
      // No page reload needed! DataBatchingService notifies listeners
      // Components subscribed to catalog updates will refresh automatically
      // This provides better UX - no state loss, no jarring reload
    } catch (error) {
      console.error('Catalog sync failed:', error);
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Failed to sync catalog.',
        variant: 'destructive',
      });
    } finally {
      setSyncingCatalog(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title={getStatusLabel()}
        >
          {getStatusIcon()}
          
          {/* Badge for pending/failed count */}
          {totalIssues > 0 && (
            <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center -translate-y-1/4 translate-x-1/4">
              <Badge
                variant={getBadgeVariant()}
                className="h-5 w-5 min-w-[20px] rounded-full p-0 text-[10px] font-bold leading-none flex items-center justify-center"
              >
                {totalIssues}
              </Badge>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4 space-y-4">
          {/* Status Header */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {getStatusIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                {getStatusLabel()}
                {syncing && (
                  <Badge variant="warning" className="text-xs">
                    SYNCING
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Pending: <strong>{pending}</strong> • Failed: <strong>{failed}</strong>
              </div>
            </div>
          </div>

          {/* Offline Warning */}
          {!isOnline && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <WifiOff className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <div className="font-medium">Device offline</div>
                <div className="text-xs mt-1">
                  Orders saved locally. Will sync when connection is restored.
                </div>
              </div>
            </div>
          )}

          {/* Failed Items Warning */}
          {failed > 0 && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <div className="font-medium">Sync failures detected</div>
                <div className="text-xs mt-1">
                  {failed} {failed === 1 ? 'item' : 'items'} failed to sync. Review and retry.
                </div>
              </div>
            </div>
          )}

          {/* Queue Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-1 text-xs"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Status'}
            </Button>
            <Button
              size="sm"
              variant={failed > 0 ? 'destructive' : 'outline'}
              onClick={handleRetry}
              disabled={failed === 0 || retrying}
              className="flex-1 text-xs"
            >
              {retrying ? 'Retrying...' : 'Retry Failed'}
            </Button>
          </div>

          {/* Catalog Sync Action */}
          <div className="pt-2 border-t">
            <Button
              size="sm"
              variant="default"
              onClick={handleSyncCatalog}
              disabled={!isOnline || syncingCatalog}
              className="w-full text-xs bg-blue-600 hover:bg-blue-700"
            >
              <Database className="h-3.5 w-3.5 mr-2" />
              {syncingCatalog ? 'Syncing Catalog...' : 'Sync Catalog'}
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Updates products, packages, categories & tables
            </p>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
