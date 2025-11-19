/**
 * Consistent toast messages for offline operations
 * Phase 3 Step 7.4 - Toast Improvements
 */

export const OfflineToasts = {
  tabOpened: (isOnline: boolean) => ({
    title: '✅ Tab Opened',
    description: isOnline 
      ? 'Tab will sync in a moment...' 
      : '💾 Tab will sync when online',
  }),
  
  orderConfirmed: (isOnline: boolean) => ({
    title: '✅ Order Confirmed',
    description: isOnline
      ? 'Sending to kitchen...'
      : '💾 Kitchen will receive when online',
  }),
  
  paymentProcessed: (isOnline: boolean) => ({
    title: '✅ Payment Processed',
    description: isOnline
      ? 'Recording payment...'
      : '💾 Will record when online',
  }),
  
  syncComplete: () => ({
    title: '✅ Synced',
    description: 'All changes saved to server',
  }),
  
  syncFailed: (error: string) => ({
    title: '❌ Sync Failed',
    description: error,
    variant: 'destructive' as const,
  }),
  
  sessionUnavailable: () => ({
    title: '❌ Session Unavailable',
    description: 'This session is not available offline.',
    variant: 'destructive' as const,
  }),
  
  insufficientStock: (itemName: string) => ({
    title: '❌ Insufficient Stock',
    description: `Not enough stock for ${itemName}`,
    variant: 'destructive' as const,
  }),
};
