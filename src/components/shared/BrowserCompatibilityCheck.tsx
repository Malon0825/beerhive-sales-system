'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * BrowserCompatibilityCheck Component
 * 
 * Checks if the browser supports required features for the POS system:
 * - IndexedDB: For local order storage
 * - BroadcastChannel: For real-time cross-tab communication
 * 
 * Displays a warning message if essential features are missing.
 * 
 * @param requireIndexedDB - Whether IndexedDB is required (default: true)
 * @param requireBroadcastChannel - Whether BroadcastChannel is required (default: true)
 * @param children - Child components to render if compatible
 */
interface BrowserCompatibilityCheckProps {
  requireIndexedDB?: boolean;
  requireBroadcastChannel?: boolean;
  children: React.ReactNode;
}

export function BrowserCompatibilityCheck({
  requireIndexedDB = true,
  requireBroadcastChannel = true,
  children,
}: BrowserCompatibilityCheckProps) {
  const [isCompatible, setIsCompatible] = useState(true);
  const [missingFeatures, setMissingFeatures] = useState<string[]>([]);

  /**
   * Check browser compatibility on mount
   */
  useEffect(() => {
    const checkCompatibility = () => {
      const missing: string[] = [];

      // Check IndexedDB support
      if (requireIndexedDB && typeof indexedDB === 'undefined') {
        missing.push('IndexedDB');
      }

      // Check BroadcastChannel support
      if (requireBroadcastChannel && typeof BroadcastChannel === 'undefined') {
        missing.push('BroadcastChannel API');
      }

      if (missing.length > 0) {
        setMissingFeatures(missing);
        setIsCompatible(false);
        console.error('[BrowserCompatibility] Missing features:', missing);
      } else {
        setIsCompatible(true);
        console.log('[BrowserCompatibility] ✅ All required features supported');
      }
    };

    checkCompatibility();
  }, [requireIndexedDB, requireBroadcastChannel]);

  /**
   * If browser is not compatible, show error message
   */
  if (!isCompatible) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-6" />
          
          <h1 className="text-3xl font-bold text-white mb-4">
            Browser Not Supported
          </h1>
          
          <p className="text-slate-300 text-lg mb-6">
            Your browser doesn't support the following required features:
          </p>
          
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <ul className="text-left space-y-2">
              {missingFeatures.map((feature) => (
                <li key={feature} className="text-red-400 flex items-center gap-2">
                  <span className="text-xl">❌</span>
                  <span className="font-medium">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="text-slate-400 text-sm space-y-2">
            <p>Please use one of the following modern browsers:</p>
            <div className="flex justify-center gap-4 mt-4 text-white">
              <span>✅ Chrome 71+</span>
              <span>✅ Firefox 64+</span>
              <span>✅ Safari 13+</span>
              <span>✅ Edge 79+</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Browser is compatible, render children
   */
  return <>{children}</>;
}
