'use client';

import { useMemo } from 'react';
import { KitchenOrderWithRelations } from '@/models/types/KitchenOrderWithRelations';

/**
 * Configuration for order age alerts
 */
interface OrderAgeAlertConfig {
  warningThresholdMinutes?: number; // Warning at X minutes (default: 5)
  criticalThresholdMinutes?: number; // Critical at X minutes (default: 10)
}

/**
 * Order age alert status
 */
export interface OrderAgeStatus {
  hasWarningOrders: boolean; // Orders older than warning threshold
  hasCriticalOrders: boolean; // Orders older than critical threshold
  oldestOrderAge: number; // Age of oldest order in minutes
  warningOrderCount: number;
  criticalOrderCount: number;
}

/**
 * Custom hook to detect and alert about aging orders
 * 
 * Helps ensure orders don't sit unattended by:
 * - Detecting orders that have been waiting too long
 * - Providing warning and critical thresholds
 * - Returning data for visual escalation (flashing, colors, etc.)
 * 
 * @param orders - List of orders to monitor
 * @param config - Configuration options
 * @returns Order age status information
 * 
 * @example
 * ```tsx
 * const orders = [...]; // Your orders
 * const ageStatus = useOrderAgeAlert(orders, {
 *   warningThresholdMinutes: 5,
 *   criticalThresholdMinutes: 10
 * });
 * 
 * // Show flashing alert for critical orders
 * {ageStatus.hasCriticalOrders && (
 *   <div className="animate-pulse bg-red-500">
 *     ⚠️ URGENT: {ageStatus.criticalOrderCount} orders waiting over 10 minutes!
 *   </div>
 * )}
 * ```
 */
export function useOrderAgeAlert(
  orders: KitchenOrderWithRelations[],
  config: OrderAgeAlertConfig = {}
): OrderAgeStatus {
  const {
    warningThresholdMinutes = 5,
    criticalThresholdMinutes = 10,
  } = config;

  const status = useMemo(() => {
    const now = Date.now();
    let oldestAge = 0;
    let warningCount = 0;
    let criticalCount = 0;

    orders.forEach(order => {
      // Calculate age in minutes
      const orderTime = new Date(order.sent_at).getTime();
      const ageMinutes = (now - orderTime) / 60000;

      // Track oldest order
      if (ageMinutes > oldestAge) {
        oldestAge = ageMinutes;
      }

      // Count warning and critical orders
      if (ageMinutes >= criticalThresholdMinutes) {
        criticalCount++;
      } else if (ageMinutes >= warningThresholdMinutes) {
        warningCount++;
      }
    });

    return {
      hasWarningOrders: warningCount > 0,
      hasCriticalOrders: criticalCount > 0,
      oldestOrderAge: Math.floor(oldestAge),
      warningOrderCount: warningCount,
      criticalOrderCount: criticalCount,
    };
  }, [orders, warningThresholdMinutes, criticalThresholdMinutes]);

  return status;
}

/**
 * Helper function to get order age in minutes
 */
export function getOrderAgeMinutes(order: KitchenOrderWithRelations): number {
  const now = Date.now();
  const orderTime = new Date(order.sent_at).getTime();
  return Math.floor((now - orderTime) / 60000);
}

/**
 * Helper function to determine order urgency level
 */
export function getOrderUrgencyLevel(
  order: KitchenOrderWithRelations,
  warningThreshold: number = 5,
  criticalThreshold: number = 10
): 'normal' | 'warning' | 'critical' {
  const age = getOrderAgeMinutes(order);
  
  if (age >= criticalThreshold) return 'critical';
  if (age >= warningThreshold) return 'warning';
  return 'normal';
}
