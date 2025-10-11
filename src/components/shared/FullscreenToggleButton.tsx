'use client';

import { Maximize2, Minimize2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * FullscreenToggleButton Component
 * 
 * Toggles between normal dashboard view and fullscreen customer display mode.
 * This is NOT the browser's native fullscreen (F11), but an app-level fullscreen
 * that hides the sidebar and navigation for a cleaner customer-facing display.
 * 
 * Features:
 * - Adds/removes 'fullscreen=true' URL parameter
 * - Maintains other URL parameters (e.g., cashier ID)
 * - Modern, accessible button design
 * - Smooth transitions
 * 
 * Usage:
 * ```tsx
 * <FullscreenToggleButton />
 * ```
 */
export function FullscreenToggleButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFullscreen = searchParams.get('fullscreen') === 'true';

  /**
   * Toggle fullscreen mode by updating URL parameters
   * Preserves existing search parameters (e.g., cashier ID)
   */
  const toggleFullscreen = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (isFullscreen) {
      // Exit fullscreen - remove parameter
      params.delete('fullscreen');
    } else {
      // Enter fullscreen - add parameter
      params.set('fullscreen', 'true');
    }
    
    // Build new URL with updated parameters
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    
    router.push(newUrl);
  };

  return (
    <button
      onClick={toggleFullscreen}
      className={`
        fixed right-4 z-50 bg-slate-700/80 hover:bg-slate-700 backdrop-blur-sm text-white p-3 rounded-xl 
        transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 group
        ${isFullscreen ? 'top-4' : 'top-20'}
      `}
      title={isFullscreen ? 'Exit fullscreen display' : 'Enter fullscreen display'}
      aria-label={isFullscreen ? 'Exit fullscreen display' : 'Enter fullscreen display'}
    >
      {isFullscreen ? (
        <Minimize2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
      ) : (
        <Maximize2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
      )}
    </button>
  );
}
