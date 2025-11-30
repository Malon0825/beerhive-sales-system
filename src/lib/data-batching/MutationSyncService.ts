'use client';

import { toast } from '@/lib/hooks/useToast';
import { apiPatch, apiPost, apiPut } from '@/lib/utils/apiClient';
import {
  countMutationsByStatus,
  deleteSyncQueueEntry,
  getMutationsByStatus,
  updateSyncQueueEntry,
  type SyncQueueEntry,
  updateSessionId,
  updateOrderSession,
  migrateOrdersToSession,
} from './offlineDb';

const MAX_RETRIES = 3;
const BATCH_SIZE = 25;
const NETWORK_BACKOFF_BASE_MS = 60_000;
const NETWORK_BACKOFF_MAX_MS = 24 * 60 * 60 * 1000;

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
  private retryTimer: number | null = null;
  private orderIdMap = new Map<string, string>();
  private sessionIdMap = new Map<string, string>();

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

    this.startRetryTimer();
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
    }
    this.stopRetryTimer();
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
      // CRITICAL: Rebuild ID mappings from IndexedDB before processing
      // This handles retry scenarios where in-memory mappings were lost
      await this.rebuildIdMappings();

      let pending = await getMutationsByStatus('pending', BATCH_SIZE);

      while (pending.length > 0) {
        const now = Date.now();
        const dueMutations = pending.filter((mutation) => {
          if (!mutation.next_attempt_at) {
            return true;
          }
          const nextTime = new Date(mutation.next_attempt_at).getTime();
          return Number.isNaN(nextTime) || nextTime <= now;
        });

        if (dueMutations.length === 0) {
          break;
        }

        for (const mutation of dueMutations) {
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
        local_id?: string;
        local_order_id?: string;
        depends_on?: number;
        session_id?: string;
      };

      const method = (payload.method || 'POST').toUpperCase();
      const endpoint = payload.endpoint;
      const body = payload.body;

      let response: any;

      // Special handling for Tab session + order flows so we can
      // migrate temp IDs and maintain correct sequencing.
      if (mutation.mutationType === 'orderSessions.create') {
        response = await this.processSessionCreateMutation({
          endpoint,
          body,
          localId: payload.local_id,
        });
      } else if (mutation.mutationType === 'orders.create') {
        response = await this.processOrderCreateMutation({
          endpoint,
          body,
          localOrderId: payload.local_order_id,
        });
      } else if (mutation.mutationType === 'orders.confirm') {
        response = await this.processOrderConfirmMutation({
          endpoint,
          localOrderId: payload.local_order_id,
        });
      } else if (mutation.mutationType === 'orderSessions.close') {
        response = await this.processSessionCloseMutation({
          endpoint,
          body,
          sessionId: payload.session_id,
        });
      } else {
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
      }

      if (response && response.success === false) {
        const errorCode = (response as any).code as string | undefined;
        const errorMessage = (response as any).error as string | undefined;

        if (errorCode === 'NETWORK_UNAVAILABLE') {
          // Tag as network error so it follows exponential backoff path
          throw new Error('NETWORK_UNAVAILABLE');
        }

        throw new Error(errorMessage || 'Mutation replay failed');
      }

      await deleteSyncQueueEntry(mutation.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isNetwork = this.isNetworkError(error);
      
      // Differentiate between expected network errors and unexpected errors
      if (isNetwork) {
        // Network errors are expected when offline - use warn instead of error
        console.warn(`[MutationSyncService] Mutation ${mutation.id} paused (network unavailable):`, errorMessage);
        
        // Network errors - don't show repeated toasts, just log
        if (!this.offlineNoticeShown) {
          toast({
            title: 'Sync paused',
            description: 'Network connection lost. Your queued orders will sync automatically when connection is restored.',
          });
          this.offlineNoticeShown = true;
        }

        if (mutation.id) {
          const attempt = mutation.retry_count + 1;
          const backoffMs = Math.min(
            NETWORK_BACKOFF_BASE_MS * Math.pow(2, attempt - 1),
            NETWORK_BACKOFF_MAX_MS
          );
          const nextAttemptAt = new Date(Date.now() + backoffMs).toISOString();
          await updateSyncQueueEntry(mutation.id, {
            status: 'pending',
            error: null,
            next_attempt_at: nextAttemptAt,
          });
        }
      } else {
        // Unexpected errors - log as error for debugging
        console.error(`[MutationSyncService] Mutation ${mutation.id} failed:`, errorMessage);
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

      if (!isNetwork && mutation.retry_count + 1 >= MAX_RETRIES) {
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

  private startRetryTimer(): void {
    if (this.retryTimer !== null) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    this.retryTimer = window.setInterval(() => {
      if (this.syncing || this.isOffline()) {
        return;
      }

      void this.processPendingMutations();
    }, 60_000);
  }

  private stopRetryTimer(): void {
    if (this.retryTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
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

    // Treat explicit backend network marker as network error
    if (/NETWORK_UNAVAILABLE/i.test(message)) {
      return true;
    }

    return /networkerror|failed to fetch|fetch failed|network request/i.test(message);
  }

  /**
   * Rebuild ID mappings from IndexedDB
   * Used when retrying failed mutations to restore session/order ID mappings
   * that were lost when service restarted or page reloaded
   * 
   * FIX: Now scans both order_sessions and session_orders stores to recover
   * all temp ID → real ID mappings from _synced_id fields.
   */
  private async rebuildIdMappings(): Promise<void> {
    try {
      const { getAllOrderSessions, readAllRecords } = await import('./offlineDb');
      
      let sessionMappingsFound = 0;
      let orderMappingsFound = 0;
      
      // 1. Rebuild session ID mappings from order_sessions store
      const sessions = await getAllOrderSessions();
      
      for (const session of sessions) {
        // Look for temp sessions that have been synced to real IDs
        if (session.id.startsWith('offline-session-') && session._synced_id) {
          this.sessionIdMap.set(session.id, session._synced_id);
          sessionMappingsFound++;
          console.log(`🗺️ Recovered session mapping: ${session.id} → ${session._synced_id}`);
        }
      }
      
      // 2. Rebuild order ID mappings from session_orders store
      try {
        const orders = await readAllRecords('session_orders');
        
        for (const order of orders) {
          // Look for temp orders that have been synced to real IDs
          if (order.id.startsWith('offline-order-') && order._synced_id) {
            this.orderIdMap.set(order.id, order._synced_id);
            orderMappingsFound++;
            console.log(`🗺️ Recovered order mapping: ${order.id} → ${order._synced_id}`);
          }
          
          // Also check if order has remote_session_id for session mapping recovery
          if (order.session_id?.startsWith('offline-session-') && order.remote_session_id) {
            // Only add if not already in mapping
            if (!this.sessionIdMap.has(order.session_id)) {
              this.sessionIdMap.set(order.session_id, order.remote_session_id);
              sessionMappingsFound++;
              console.log(`🗺️ Recovered session mapping from order: ${order.session_id} → ${order.remote_session_id}`);
            }
          }
        }
      } catch (orderError) {
        console.warn('⚠️ [MutationSyncService] Failed to scan session_orders for mappings:', orderError);
      }
      
      console.log(
        `🗺️ [MutationSyncService] ID mappings rebuild complete: ` +
        `${sessionMappingsFound} sessions, ${orderMappingsFound} orders`
      );
    } catch (error) {
      console.warn('⚠️ [MutationSyncService] Failed to rebuild ID mappings:', error);
      // Don't throw - we'll rebuild mappings as we process mutations
    }
  }

  /**
   * Process orderSessions.create mutation
   * Syncs temp session to server and updates local IndexedDB IDs.
   * 
   * Note: Server-side openTab is idempotent and will return existing session
   * if table already has one, so this should succeed even on retries.
   */
  private async processSessionCreateMutation(params: {
    endpoint: string;
    body?: unknown;
    localId?: string;
  }): Promise<any> {
    const { endpoint, body, localId } = params;

    console.log(`🔄 [MutationSyncService] Syncing session creation: ${localId}`);

    const response = await apiPost(endpoint, body);

    if (!response || response.success === false) {
      throw new Error(response?.error || 'Session creation failed');
    }

    const realSession = response.data as {
      id: string;
      session_number?: string;
      subtotal?: number;
      discount_amount?: number;
      tax_amount?: number;
      total_amount?: number;
    };

    if (localId && realSession?.id && localId !== realSession.id) {
      // Store session ID mapping for use in dependent order creation mutations
      this.sessionIdMap.set(localId, realSession.id);
      console.log(`🗺️ [MutationSyncService] Stored session ID mapping: ${localId} → ${realSession.id}`);
      
      // Update local IndexedDB: temp ID → real server ID
      await updateSessionId(localId, realSession.id);

      await updateOrderSession(realSession.id, {
        session_number: realSession.session_number,
        subtotal: realSession.subtotal ?? 0,
        discount_amount: realSession.discount_amount ?? 0,
        tax_amount: realSession.tax_amount ?? 0,
        total_amount: realSession.total_amount ?? 0,
        _pending_sync: false,
        _temp_id: false,
        synced_at: new Date().toISOString(),
      });

      // Migrate any temp orders associated with the session
      await migrateOrdersToSession(localId, realSession.id);

      console.log(`✅ [MutationSyncService] Session synced: ${localId} → ${realSession.id}`);
    }

    return response;
  }

  /**
   * Process orders.create mutation
   * Creates order on server and stores real order ID for dependent mutations.
   * Also replaces temp session_id with real session_id before sending to server.
   * Handles retry scenarios by checking IndexedDB for synced sessions.
   */
  private async processOrderCreateMutation(params: {
    endpoint: string;
    body?: unknown;
    localOrderId?: string;
  }): Promise<any> {
    const { endpoint, localOrderId } = params;
    let { body } = params;

    console.log(`🔄 [MutationSyncService] Syncing order creation: ${localOrderId}`);

    // Replace temp session_id with real session_id if it exists in the mapping
    if (body && typeof body === 'object' && 'session_id' in body) {
      const tempSessionId = (body as any).session_id;
      
      // Check if it's a temp ID that needs replacement
      if (tempSessionId && typeof tempSessionId === 'string' && tempSessionId.startsWith('offline-session-')) {
        let realSessionId = this.sessionIdMap.get(tempSessionId);
        
        // If not in mapping (retry scenario), check IndexedDB
        if (!realSessionId) {
          console.log(`⚠️ [MutationSyncService] Session ID not in mapping, checking IndexedDB: ${tempSessionId}`);
          
          try {
            const { getOrderSessionById } = await import('./offlineDb');
            const session = await getOrderSessionById(tempSessionId);
            
            // Check if this temp session was already synced and replaced with real ID
            // In that case, the temp ID won't exist anymore - we need to find the real one
            if (!session) {
              // Temp ID doesn't exist - it was replaced. Try to find by table_id
              const tableId = (body as any).table_id;
              if (tableId) {
                const { getActiveOrderSessions } = await import('./offlineDb');
                const sessions = await getActiveOrderSessions();
                const matchingSession = sessions.find(s => s.table_id === tableId);
                
                if (matchingSession && !matchingSession.id.startsWith('offline-session-')) {
                  realSessionId = matchingSession.id;
                  // Store in mapping for future mutations in this batch
                  this.sessionIdMap.set(tempSessionId, realSessionId);
                  console.log(`✅ [MutationSyncService] Found synced session via table lookup: ${tempSessionId} → ${realSessionId}`);
                }
              }
            }
          } catch (error) {
            console.warn(`⚠️ [MutationSyncService] Failed to lookup session in IndexedDB:`, error);
          }
        }
        
        if (realSessionId) {
          console.log(`🔄 [MutationSyncService] Replacing temp session_id: ${tempSessionId} → ${realSessionId}`);
          body = {
            ...body,
            session_id: realSessionId,
          };
        } else {
          throw new Error(`Cannot sync order: session ${tempSessionId} not yet synced. Please ensure session mutation completes first.`);
        }
      }
    }

    const response = await apiPost(endpoint, body);

    if (!response || response.success === false) {
      throw new Error(response?.error || 'Order creation failed');
    }

    const realOrder = response.data as { id: string; session_id?: string };

    if (localOrderId && realOrder?.id) {
      this.orderIdMap.set(localOrderId, realOrder.id);
      console.log(`✅ [MutationSyncService] Order created: ${localOrderId} → ${realOrder.id}`);
      
      // Store _synced_id in IndexedDB for ID mapping recovery on restart
      try {
        const { getSessionOrderById } = await import('./offlineDb');
        const order = await getSessionOrderById(localOrderId);
        
        if (order) {
          const { putSessionOrder } = await import('./offlineDb');
          await putSessionOrder({
            ...order,
            _synced_id: realOrder.id,
            _pending_sync: false,
            synced_at: new Date().toISOString(),
            // Store real session ID if available and different from current
            remote_session_id: realOrder.session_id && realOrder.session_id !== order.session_id 
              ? realOrder.session_id 
              : order.remote_session_id,
          });
          console.log(`💾 [MutationSyncService] Stored _synced_id for order: ${localOrderId} → ${realOrder.id}`);
        }
      } catch (error) {
        // Non-fatal - log but don't fail the mutation
        console.warn(`⚠️ [MutationSyncService] Failed to store _synced_id for order:`, error);
      }
    }

    return response;
  }

  /**
   * Process orders.confirm mutation
   * Confirms order and sends to kitchen using the real order ID.
   * After successful confirmation, triggers session refresh to clear pending_sync flag.
   */
  private async processOrderConfirmMutation(params: {
    endpoint: string;
    localOrderId?: string;
  }): Promise<any> {
    const { endpoint, localOrderId } = params;

    if (!localOrderId) {
      throw new Error('orders.confirm mutation missing localOrderId');
    }

    const realOrderId = this.orderIdMap.get(localOrderId);

    if (!realOrderId) {
      throw new Error(`Real order ID not found for ${localOrderId}`);
    }

    const realEndpoint = endpoint.replace('{{ORDER_ID}}', realOrderId);

    console.log(`🔄 [MutationSyncService] Confirming order: ${realOrderId}`);

    const response = await apiPatch(realEndpoint, undefined);

    if (!response || response.success === false) {
      // Check for specific error types
      const errorMsg = response?.error || '';
      
      // Handle insufficient stock error - don't retry automatically
      if (errorMsg.toLowerCase().includes('insufficient stock') || 
          errorMsg.toLowerCase().includes('out of stock')) {
        console.error(`⚠️ [MutationSyncService] Stock error for order ${realOrderId}: ${errorMsg}`);
        // Note: In production, you might want to notify the user via toast
        // For now, we'll throw to mark as failed
        throw new Error(`Stock error: ${errorMsg}`);
      }
      
      throw new Error(response?.error || 'Order confirmation failed');
    }

    console.log(`✅ [MutationSyncService] Order confirmed and sent to kitchen: ${realOrderId}`);

    // CRITICAL FIX: After order confirmation, fetch the updated session from server
    // to get correct totals calculated by database trigger, and clear _pending_sync flag
    try {
      const orderData = response.data;
      if (orderData && orderData.session_id) {
        console.log(`🔄 [MutationSyncService] Fetching updated session totals for: ${orderData.session_id}`);
        
        const { apiGet } = await import('@/lib/utils/apiClient');
        const sessionResponse = await apiGet(`/api/order-sessions/${orderData.session_id}`);
        
        if (sessionResponse && sessionResponse.success && sessionResponse.data) {
          const serverSession = sessionResponse.data;
          await updateOrderSession(serverSession.id, {
            subtotal: serverSession.subtotal ?? 0,
            discount_amount: serverSession.discount_amount ?? 0,
            tax_amount: serverSession.tax_amount ?? 0,
            total_amount: serverSession.total_amount ?? 0,
            _pending_sync: false, // Clear pending flag - server now has correct totals
            synced_at: new Date().toISOString(),
          });
          console.log(
            `✅ [MutationSyncService] Session totals refreshed: ` +
            `${serverSession.session_number} = ₱${serverSession.total_amount}`
          );
        }
      }
    } catch (refreshError) {
      // Log but don't fail the mutation - order is already confirmed
      console.warn('⚠️ [MutationSyncService] Failed to refresh session totals (non-fatal):', refreshError);
    }

    return response;
  }

  /**
   * Process orderSessions.close mutation
   * Closes session and processes payment on server, then removes from local cache.
   * CRITICAL: Closed sessions are deleted from IndexedDB (not just marked closed)
   * since DataBatchingService only syncs status='open' sessions.
   * 
   * FIX: Resolves temp session IDs (offline-session-*) to real UUIDs before API call
   * to prevent 22P02 UUID validation errors on server.
   */
  private async processSessionCloseMutation(params: {
    endpoint: string;
    body?: unknown;
    sessionId?: string;
  }): Promise<any> {
    let { endpoint, body, sessionId } = params;

    console.log(`🔄 [MutationSyncService] Syncing session close: ${sessionId}`);

    // CRITICAL FIX: Resolve temp session ID to real UUID before calling API
    let realSessionId = sessionId;
    if (sessionId && sessionId.startsWith('offline-session-')) {
      // Try to get real session ID from in-memory mapping first
      realSessionId = this.sessionIdMap.get(sessionId);
      
      // If not in mapping (retry scenario), check IndexedDB
      if (!realSessionId) {
        console.log(`⚠️ [MutationSyncService] Session ID not in mapping, checking IndexedDB: ${sessionId}`);
        
        try {
          const { getOrderSessionById, getActiveOrderSessions } = await import('./offlineDb');
          
          // Check if temp session exists and has been synced
          const tempSession = await getOrderSessionById(sessionId);
          if (tempSession?._synced_id) {
            realSessionId = tempSession._synced_id;
            // Store in mapping for consistency
            this.sessionIdMap.set(sessionId, realSessionId);
            console.log(`✅ [MutationSyncService] Found synced session ID from temp session: ${sessionId} → ${realSessionId}`);
          } else if (tempSession?.table_id) {
            // Temp session exists but not synced - try to find real session by table_id
            const sessions = await getActiveOrderSessions();
            const matchingSession = sessions.find(
              s => s.table_id === tempSession.table_id && 
                   !s.id.startsWith('offline-session-') &&
                   !s._temp_id
            );
            
            if (matchingSession) {
              realSessionId = matchingSession.id;
              this.sessionIdMap.set(sessionId, realSessionId);
              console.log(`✅ [MutationSyncService] Found real session via table lookup: ${sessionId} → ${realSessionId}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ [MutationSyncService] Failed to lookup session in IndexedDB:`, error);
        }
      }
      
      // If we still don't have a real session ID, throw error
      if (!realSessionId || realSessionId.startsWith('offline-session-')) {
        throw new Error(
          `Cannot close session: temp session ${sessionId} not yet synced to server. ` +
          `Please ensure session creation mutation completes first.`
        );
      }
      
      // Replace temp session ID in endpoint with real UUID
      endpoint = endpoint.replace(sessionId, realSessionId);
      console.log(`🔄 [MutationSyncService] Replaced temp session ID in endpoint: ${sessionId} → ${realSessionId}`);
      
      // Optionally add real session_id to body if server expects it
      if (body && typeof body === 'object') {
        body = {
          ...body,
          session_id: realSessionId,
        };
      }
    }

    const response = await apiPost(endpoint, body);

    if (!response || response.success === false) {
      const errorMsg = response?.error || '';
      
      // Handle idempotent case: session already closed
      if (errorMsg.toLowerCase().includes('already closed') || 
          errorMsg.toLowerCase().includes('not open') ||
          errorMsg.toLowerCase().includes('session is closed')) {
        console.log(`ℹ️ [MutationSyncService] Session ${realSessionId} already closed on server (idempotent)`);
        
        // Remove from local cache since it's already closed
        // Delete both temp and real session IDs
        if (sessionId || realSessionId) {
          const { deleteOrderSession } = await import('./offlineDb');
          if (sessionId && sessionId !== realSessionId) {
            await deleteOrderSession(sessionId);
            console.log(`🗑️ [MutationSyncService] Removed temp session from IndexedDB: ${sessionId}`);
          }
          if (realSessionId) {
            await deleteOrderSession(realSessionId);
            console.log(`🗑️ [MutationSyncService] Removed real session from IndexedDB: ${realSessionId}`);
          }
        }
        
        // Return success - this is idempotent
        return { success: true, message: 'Session already closed (idempotent)' };
      }
      
      throw new Error(response?.error || 'Session close failed');
    }

    // CRITICAL FIX: Delete closed session from IndexedDB instead of updating status
    // This prevents UI from showing "Occupied + No active tab" state
    // DataBatchingService only syncs open sessions, so closed ones should be removed
    // Delete both temp session (if exists) and real session
    if (sessionId || realSessionId) {
      const { deleteOrderSession } = await import('./offlineDb');
      
      // Delete temp session if it's different from real session
      if (sessionId && sessionId !== realSessionId) {
        await deleteOrderSession(sessionId);
        console.log(`🗑️ [MutationSyncService] Removed temp session from cache: ${sessionId}`);
      }
      
      // Delete real session
      if (realSessionId) {
        await deleteOrderSession(realSessionId);
        console.log(`✅ [MutationSyncService] Session closed and removed from cache: ${realSessionId}`);
      }
    }

    return response;
  }
}
