'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  MutationSyncService,
  type SyncStatus,
} from '@/lib/data-batching/MutationSyncService';
import { DataBatchingService } from '@/lib/data-batching/DataBatchingService';

/**
 * Service Worker registration states for the offline runtime.
 */
type RegistrationStatus = 'idle' | 'registering' | 'registered' | 'error';

/**
 * Extended DOM event type for PWA install prompts (not yet in TypeScript lib).
 */
declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms?: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface OfflineRuntimeContextValue {
  /** Indicates if Service Workers are supported in the current browser. */
  readonly isSupported: boolean;
  /** Lifecycle state for SW registration. */
  readonly registrationStatus: RegistrationStatus;
  /** Registered Service Worker instance, if any. */
  readonly registration: ServiceWorkerRegistration | null;
  /** Captures registration or install prompt errors. */
  readonly error?: string;
  /** Current online/offline status sourced from navigator.onLine. */
  readonly isOnline: boolean;
  /** Shows if the install prompt can be triggered from the UI. */
  readonly installPromptAvailable: boolean;
  /** Executes the deferred install prompt if available. */
  promptInstall(): Promise<boolean>;
  /** Current sync queue status sourced from MutationSyncService. */
  readonly syncStatus: SyncStatus;
  /** Timestamp of the last sync status refresh. */
  readonly lastSyncUpdate: Date | null;
  /** Manually refreshes sync status counts. */
  refreshSyncStatus(): Promise<void>;
  /** Retries failed mutations in the offline queue. */
  retryFailedMutations(): Promise<void>;
}

const OfflineRuntimeContext = createContext<OfflineRuntimeContextValue | undefined>(undefined);

/**
 * Provides offline runtime utilities (SW registration + install prompt handling)
 * so that UI components can expose install affordances and connectivity status.
 */
export function OfflineRuntimeProvider({ children }: { children: ReactNode }) {
  const [isSupported, setIsSupported] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>('idle');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    pendingCount: 0,
    failedCount: 0,
  });
  const [lastSyncUpdate, setLastSyncUpdate] = useState<Date | null>(null);

  const mutationSync = useMemo(() => MutationSyncService.getInstance(), []);
  const dataBatching = useMemo(() => DataBatchingService.getInstance(), []);
  const installPromptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // CRITICAL: Initialize services FIRST (before SW registration)
    // These services work independently of Service Worker and are needed in dev mode
    mutationSync.initialize().catch((err) => {
      console.error('[OfflineRuntime] Failed to initialize MutationSyncService', err);
    });

    dataBatching.initialize().catch((err) => {
      console.error('[OfflineRuntime] Failed to initialize DataBatchingService', err);
    });

    // Service Worker registration (production only)
    const swSupported = 'serviceWorker' in navigator;
    setIsSupported(swSupported);

    if (!swSupported) {
      setError('Service Workers are not supported in this browser.');
      // Don't return - services still need to run
    }

    const isDevBuild = process.env.NODE_ENV !== 'production';
    if (isDevBuild) {
      console.info('[OfflineRuntime] Skipping Service Worker registration in dev mode.');
      // Don't return - services already initialized above
    } else {
      // Only register SW in production
      const registerServiceWorker = async () => {
        if (!('serviceWorker' in navigator)) {
          return;
        }

        try {
          setRegistrationStatus('registering');
          const reg = await navigator.serviceWorker.register('/service-worker.js');
          setRegistration(reg);
          setRegistrationStatus('registered');
        } catch (err) {
          console.error('[OfflineRuntime] Failed to register Service Worker', err);
          setError((err as Error).message);
          setRegistrationStatus('error');
        }
      };

      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker, { once: true });
      }
    }

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      installPromptEventRef.current = event;
      setInstallPromptAvailable(true);
    };

    const handleAppInstalled = () => {
      installPromptEventRef.current = null;
      setInstallPromptAvailable(false);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mutationSync.destroy();
      dataBatching.destroy();
    };
  }, [mutationSync, dataBatching]);

  useEffect(() => {
    let isMounted = true;

    const initializeStatus = async () => {
      try {
        const status = await mutationSync.getSyncStatus();
        if (isMounted) {
          setSyncStatus(status);
          setLastSyncUpdate(new Date());
        }
      } catch (err) {
        console.error('[OfflineRuntime] Failed to load sync status', err);
      }
    };

    void initializeStatus();

    const unsubscribe = mutationSync.subscribe((status) => {
      setSyncStatus(status);
      setLastSyncUpdate(new Date());
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [mutationSync]);

  const refreshSyncStatus = useCallback(async () => {
    try {
      const status = await mutationSync.getSyncStatus();
      setSyncStatus(status);
      setLastSyncUpdate(new Date());
    } catch (err) {
      console.error('[OfflineRuntime] Failed to refresh sync status', err);
    }
  }, [mutationSync]);

  const retryFailedMutations = useCallback(async () => {
    try {
      await mutationSync.retryFailedMutations();
      await refreshSyncStatus();
    } catch (err) {
      console.error('[OfflineRuntime] Failed to retry failed mutations', err);
    }
  }, [mutationSync, refreshSyncStatus]);

  const promptInstall = useCallback(async () => {
    const promptEvent = installPromptEventRef.current;
    if (!promptEvent) {
      return false;
    }

    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      const accepted = choiceResult.outcome === 'accepted';
      if (accepted) {
        installPromptEventRef.current = null;
        setInstallPromptAvailable(false);
      }
      return accepted;
    } catch (err) {
      console.error('[OfflineRuntime] Install prompt failed', err);
      setError((err as Error).message);
      return false;
    }
  }, []);

  const value = useMemo<OfflineRuntimeContextValue>(
    () => ({
      isSupported,
      registrationStatus,
      registration,
      error,
      isOnline,
      installPromptAvailable,
      promptInstall,
      syncStatus,
      lastSyncUpdate,
      refreshSyncStatus,
      retryFailedMutations,
    }),
    [
      isSupported,
      registrationStatus,
      registration,
      error,
      isOnline,
      installPromptAvailable,
      promptInstall,
      syncStatus,
      lastSyncUpdate,
      refreshSyncStatus,
      retryFailedMutations,
    ]
  );

  return (
    <OfflineRuntimeContext.Provider value={value}>
      {children}
    </OfflineRuntimeContext.Provider>
  );
}

/**
 * Hook to access offline runtime data inside client components.
 */
export function useOfflineRuntime() {
  const context = useContext(OfflineRuntimeContext);
  if (!context) {
    throw new Error('useOfflineRuntime must be used within OfflineRuntimeProvider');
  }
  return context;
}
