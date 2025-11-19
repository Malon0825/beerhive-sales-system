'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Order alert tracking interface
 */
interface OrderAlert {
  orderId: string;
  timestamp: number;
  acknowledged: boolean;
  soundPlayedCount: number;
  lastAlertTime: number;
}

/**
 * Configuration for order acknowledgment behavior
 */
interface AcknowledgmentConfig {
  repeatInterval?: number; // Seconds between re-alerts (default: 30)
  maxRepeats?: number; // Maximum number of re-alerts (default: 5)
  onRepeatAlert?: (orderId: string, count: number) => void;
}

/**
 * Custom hook for tracking order acknowledgments and triggering repeat alerts
 * 
 * This hook helps ensure staff don't miss new orders by:
 * - Tracking which orders have been acknowledged
 * - Re-alerting for unacknowledged orders at regular intervals
 * - Stopping alerts once an order is acknowledged
 * 
 * @param config - Configuration options
 * @returns Functions to acknowledge orders and get unacknowledged count
 * 
 * @example
 * ```tsx
 * const { acknowledgeOrder, getUnacknowledgedCount, isAcknowledged } = useOrderAcknowledgment({
 *   repeatInterval: 30,
 *   maxRepeats: 5,
 *   onRepeatAlert: (orderId, count) => {
 *     playNotification('urgent');
 *     console.log(`Re-alerting for order ${orderId} (${count} times)`);
 *   }
 * });
 * 
 * // When new order arrives
 * addNewOrder(orderId);
 * 
 * // When staff views/opens the order
 * acknowledgeOrder(orderId);
 * ```
 */
export function useOrderAcknowledgment(config: AcknowledgmentConfig = {}) {
  const {
    repeatInterval = 30, // 30 seconds default
    maxRepeats = 5,
    onRepeatAlert,
  } = config;

  // Use ref to persist across renders without causing re-renders
  const alertsRef = useRef<Map<string, OrderAlert>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Add a new order to track
   */
  const addNewOrder = useCallback((orderId: string) => {
    const now = Date.now();
    
    alertsRef.current.set(orderId, {
      orderId,
      timestamp: now,
      acknowledged: false,
      soundPlayedCount: 1, // First alert already played
      lastAlertTime: now,
    });

    console.log(`📋 Tracking new order: ${orderId}`);
  }, []);

  /**
   * Acknowledge an order (stops further alerts)
   */
  const acknowledgeOrder = useCallback((orderId: string) => {
    const alert = alertsRef.current.get(orderId);
    
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      console.log(`✅ Order acknowledged: ${orderId}`);
      
      // Clean up acknowledged orders after a delay to prevent re-adding
      setTimeout(() => {
        alertsRef.current.delete(orderId);
      }, 5000);
    }
  }, []);

  /**
   * Acknowledge multiple orders at once
   */
  const acknowledgeOrders = useCallback((orderIds: string[]) => {
    orderIds.forEach(id => acknowledgeOrder(id));
  }, [acknowledgeOrder]);

  /**
   * Check if an order is acknowledged
   */
  const isAcknowledged = useCallback((orderId: string): boolean => {
    const alert = alertsRef.current.get(orderId);
    return alert?.acknowledged ?? true; // Default to acknowledged if not tracked
  }, []);

  /**
   * Get count of unacknowledged orders
   */
  const getUnacknowledgedCount = useCallback((): number => {
    let count = 0;
    alertsRef.current.forEach(alert => {
      if (!alert.acknowledged) count++;
    });
    return count;
  }, []);

  /**
   * Get list of unacknowledged order IDs
   */
  const getUnacknowledgedOrderIds = useCallback((): string[] => {
    const ids: string[] = [];
    alertsRef.current.forEach(alert => {
      if (!alert.acknowledged) ids.push(alert.orderId);
    });
    return ids;
  }, []);

  /**
   * Remove an order from tracking (e.g., when order is completed/cancelled)
   */
  const removeOrder = useCallback((orderId: string) => {
    alertsRef.current.delete(orderId);
    console.log(`🗑️  Removed order from tracking: ${orderId}`);
  }, []);

  /**
   * Clear all tracked orders
   */
  const clearAll = useCallback(() => {
    alertsRef.current.clear();
    console.log('🗑️  Cleared all order tracking');
  }, []);

  /**
   * Check for unacknowledged orders and trigger repeat alerts
   */
  const checkUnacknowledgedOrders = useCallback(() => {
    const now = Date.now();
    const intervalMs = repeatInterval * 1000;

    alertsRef.current.forEach((alert) => {
      // Skip if already acknowledged
      if (alert.acknowledged) return;

      // Skip if max repeats reached
      if (alert.soundPlayedCount >= maxRepeats) return;

      // Check if enough time has passed since last alert
      const timeSinceLastAlert = now - alert.lastAlertTime;
      
      if (timeSinceLastAlert >= intervalMs) {
        // Time to re-alert
        alert.soundPlayedCount++;
        alert.lastAlertTime = now;

        console.log(`🔔 Re-alerting for order ${alert.orderId} (${alert.soundPlayedCount}/${maxRepeats})`);

        // Trigger callback if provided
        if (onRepeatAlert) {
          onRepeatAlert(alert.orderId, alert.soundPlayedCount);
        }
      }
    });
  }, [repeatInterval, maxRepeats, onRepeatAlert]);

  /**
   * Setup interval to check for unacknowledged orders
   */
  useEffect(() => {
    // Check every 5 seconds (more frequent than repeat interval for better timing)
    intervalRef.current = setInterval(checkUnacknowledgedOrders, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkUnacknowledgedOrders]);

  return {
    addNewOrder,
    acknowledgeOrder,
    acknowledgeOrders,
    isAcknowledged,
    getUnacknowledgedCount,
    getUnacknowledgedOrderIds,
    removeOrder,
    clearAll,
  };
}
