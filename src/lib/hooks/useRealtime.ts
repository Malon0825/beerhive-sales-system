import { useEffect, useRef } from 'react';
import { supabase } from '@/data/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * useRealtime Hook
 * Sets up Supabase realtime subscriptions for live updates
 */

interface UseRealtimeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
}

/**
 * Subscribe to realtime changes on a Supabase table
 */
export function useRealtime({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create channel name
    const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`;

    // Create subscription
    const channel = supabase.channel(channelName);

    // Build subscription based on event type and filter
    let subscription = channel.on(
      'postgres_changes' as any,
      {
        event: event,
        schema: 'public',
        table: table,
        ...(filter && { filter }),
      },
      (payload: any) => {
        console.log(`Realtime event on ${table}:`, payload);

        // Call appropriate callback
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload);
        } else if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate(payload);
        } else if (payload.eventType === 'DELETE' && onDelete) {
          onDelete(payload);
        }

        // Call generic onChange callback
        if (onChange) {
          onChange(payload);
        }
      }
    );

    // Subscribe to the channel
    subscription.subscribe((status) => {
      console.log(`Subscription status for ${table}:`, status);
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, onInsert, onUpdate, onDelete, onChange]);

  return {
    unsubscribe: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    },
  };
}

/**
 * Subscribe to kitchen orders updates
 */
export function useKitchenOrders(
  destination: 'kitchen' | 'bartender',
  onUpdate: (payload: any) => void
) {
  return useRealtime({
    table: 'kitchen_orders',
    event: '*',
    filter: `destination=eq.${destination}`,
    onChange: onUpdate,
  });
}

/**
 * Subscribe to orders updates
 */
export function useOrders(onUpdate: (payload: any) => void) {
  return useRealtime({
    table: 'orders',
    event: '*',
    onChange: onUpdate,
  });
}

/**
 * Subscribe to table status updates
 */
export function useTableStatus(onUpdate: (payload: any) => void) {
  return useRealtime({
    table: 'restaurant_tables',
    event: 'UPDATE',
    onChange: onUpdate,
  });
}
