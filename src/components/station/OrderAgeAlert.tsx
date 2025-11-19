'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { OrderAgeStatus } from '@/lib/hooks/useOrderAgeAlert';

interface OrderAgeAlertProps {
  ageStatus: OrderAgeStatus;
  stationName?: string;
}

/**
 * OrderAgeAlert Component
 * Displays visual alerts for aging orders with escalating urgency
 * 
 * - Warning: Yellow banner for orders > 5 minutes
 * - Critical: Red flashing banner for orders > 10 minutes
 */
export function OrderAgeAlert({ ageStatus, stationName = 'Station' }: OrderAgeAlertProps) {
  const { hasCriticalOrders, hasWarningOrders, criticalOrderCount, warningOrderCount, oldestOrderAge } = ageStatus;

  // Trigger screen flash for critical orders
  useEffect(() => {
    if (hasCriticalOrders) {
      flashScreen();
    }
  }, [hasCriticalOrders]);

  if (!hasWarningOrders && !hasCriticalOrders) {
    return null;
  }

  return (
    <>
      {/* Critical Alert - Red Flashing */}
      {hasCriticalOrders && (
        <div className="bg-red-600 text-white px-3 sm:px-4 py-2 sm:py-3 animate-pulse">
          <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-bold">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 animate-bounce" />
            <span>
              🚨 URGENT: {criticalOrderCount} order{criticalOrderCount !== 1 ? 's' : ''} waiting over 10 minutes!
              {oldestOrderAge > 0 && ` (Oldest: ${oldestOrderAge} min)`}
            </span>
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 animate-bounce" />
          </div>
        </div>
      )}

      {/* Warning Alert - Yellow */}
      {!hasCriticalOrders && hasWarningOrders && (
        <div className="bg-yellow-500 text-gray-900 px-3 sm:px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-semibold">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>
              ⚠️ {warningOrderCount} order{warningOrderCount !== 1 ? 's' : ''} waiting over 5 minutes
              {oldestOrderAge > 0 && ` (Oldest: ${oldestOrderAge} min)`}
            </span>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Trigger a screen flash effect for critical alerts
 */
function flashScreen() {
  // Prevent multiple simultaneous flashes
  if (document.getElementById('screen-flash-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'screen-flash-overlay';
  overlay.className = 'fixed inset-0 bg-red-500 opacity-30 pointer-events-none z-[9999] animate-ping';
  overlay.style.animationDuration = '1s';
  overlay.style.animationIterationCount = '2';
  
  document.body.appendChild(overlay);
  
  // Remove after animation completes
  setTimeout(() => {
    overlay.remove();
  }, 2000);
}
