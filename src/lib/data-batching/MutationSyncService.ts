'use client';

import { toast } from '@/lib/hooks/useToast';
import { apiPatch, apiPost, apiPut } from '@/lib/utils/apiClient';
import {
  countMutationsByStatus,
  deleteSyncQueueEntry,
  getMutationsByStatus,
  updateSyncQueueEntry,
  type SyncQueueEntry,
} from './offlineDb';

const MAX_RETRIES = 3;
const BATCH_SIZE = 25;

export interface SyncStatus {
  syncing: boolean;
  pendingCount: number;
  failedCount?: number;
}

type SyncListener = (status: SyncStatus) => void;

export class MutationSyncService {
  private static instance: MutationSyncService;
  private syncing = false;
  private listeners = new Set<SyncListener>();
  private offlineNoticeShown = false;

  static getInstance(): MutationSyncService {
    if (!MutationSyncService.instance) {
      MutationSyncService.instance = new MutationSyncService();
    }
    return MutationSyncService.instance;
  }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', this.handleOnline);

    if (navigator.onLine) {
      await this.processPendingMutations();
    }
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
    }
    this.listeners.clear();
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const [pendingCount, failedCount] = await Promise.all([
      countMutationsByStatus('pending'),
      countMutationsByStatus('failed'),
    ]);

    return {
      syncing: this.syncing,
      pendingCount,
      failedCount,
    };
  }

  async retryFailedMutations(): Promise<void> {
    const failed = await getMutationsByStatus('failed', BATCH_SIZE);

    if (failed.length === 0) {
      return;
    }

    await Promise.all(
      failed.map((mutation) =>
        mutation.id
          ? updateSyncQueueEntry(mutation.id, {
              status: 'pending',
              retry_count: 0,
              error: null,
            })
          : Promise.resolve()
      )
    );

    await this.processPendingMutations();
  }

  async processPendingMutations(): Promise<void> {
    if (this.syncing) {
      return;
    }

    if (this.isOffline()) {
      await this.handleOfflineDefer();
      return;
    }

    this.offlineNoticeShown = false;
    this.syncing = true;
    this.notifyListeners({ syncing: true, pendingCount: 0 });

    try {
      let pending = await getMutationsByStatus('pending', BATCH_SIZE);

      while (pending.length > 0) {
        for (const mutation of pending) {
          await this.processMutation(mutation);
        }

        pending = await getMutationsByStatus('pending', BATCH_SIZE);
      }
    } catch (error) {
      console.error('[MutationSyncService] Failed to process queue', error);
    } finally {
      this.syncing = false;
      const [pendingCount, failedCount] = await Promise.all([
        countMutationsByStatus('pending'),
        countMutationsByStatus('failed'),
      ]);
      this.notifyListeners({ syncing: false, pendingCount, failedCount });
    }
  }

  private handleOnline = () => {
    if (!navigator.onLine) {
      return;
    }

    void this.processPendingMutations();
  };

  private async processMutation(mutation: SyncQueueEntry): Promise<void> {
    if (!mutation.id) {
      return;
    }

    try {
      if (this.isOffline()) {
        await this.handleOfflineDefer();
        return;
      }

      await updateSyncQueueEntry(mutation.id, {
        last_attempt_at: new Date().toISOString(),
        retry_count: mutation.retry_count + 1,
      });

      const payload = mutation.payload as {
        endpoint: string;
        method?: string;
        body?: unknown;
      };

      const method = (payload.method || 'POST').toUpperCase();
      const endpoint = payload.endpoint;
      const body = payload.body;

      let response: any;

      switch (method) {
        case 'PATCH':
          response = await apiPatch(endpoint, body);
          break;
        case 'PUT':
          response = await apiPut(endpoint, body);
          break;
        case 'POST':
        default:
          response = await apiPost(endpoint, body);
          break;
      }

      if (response && response.success === false) {
        throw new Error(response.error || 'Mutation replay failed');
      }

      await deleteSyncQueueEntry(mutation.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`[MutationSyncService] Mutation ${mutation.id} failed:`, errorMessage);

      if (this.isNetworkError(error)) {
        // Network errors - don't show repeated toasts, just log
        if (!this.offlineNoticeShown) {
          toast({
            title: 'Sync paused',
            description: 'Network connection lost. Your queued orders will sync automatically when connection is restored.',
          });
          this.offlineNoticeShown = true;
        }
      } else {
        // Application/business logic errors - show specific message
        const isMaxRetries = mutation.retry_count + 1 >= MAX_RETRIES;
        toast({
          title: isMaxRetries ? 'Sync failed permanently' : 'Sync retry scheduled',
          description: isMaxRetries 
            ? `Failed to sync after ${MAX_RETRIES} attempts. Please check the failed queue and retry manually.`
            : `Sync failed: ${errorMessage}. Will retry automatically.`,
          variant: isMaxRetries ? 'destructive' : 'default',
        });
      }

      if (mutation.retry_count + 1 >= MAX_RETRIES) {
        await updateSyncQueueEntry(mutation.id, {
          status: 'failed',
          error: errorMessage,
        });
      }
    }
  }

  private notifyListeners(status: SyncStatus): void {
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('[MutationSyncService] Listener error', error);
      }
    });
  }

  private isOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  private async handleOfflineDefer(): Promise<void> {
    if (!this.offlineNoticeShown) {
      toast({
        title: 'Device offline',
        description: 'Orders are saved locally and will sync once you reconnect.',
      });
      this.offlineNoticeShown = true;
    }

    const [pendingCount, failedCount] = await Promise.all([
      countMutationsByStatus('pending'),
      countMutationsByStatus('failed'),
    ]);

    this.notifyListeners({ syncing: false, pendingCount, failedCount });
  }

  private isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) {
      return true;
    }

    const message = error instanceof Error ? error.message : String(error ?? '');
    return /networkerror|failed to fetch|fetch failed|network request/i.test(message);
  }
}
