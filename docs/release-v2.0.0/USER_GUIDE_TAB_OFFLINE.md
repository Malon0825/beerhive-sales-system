# Tab Management Offline Guide

**Phase 3 - Step 10.1: User Guide**

## What is Offline Mode?

The Tab Management system can now work without an internet connection. You can:
- View existing tabs
- Open new tabs
- Add orders to tabs
- Close tabs and process payments

All operations are saved locally and will sync to the server when your connection returns.

## How to Know You're Offline

Look for these indicators:
- **Offline Mode** badge in the top-right corner of the dashboard
- **Offline** badge when opening new tabs
- **Syncing** or **Temp** badges on session cards
- Toast messages mentioning "will sync when online"

## Opening a Tab Offline

1. Click on any available table
2. Click "Open Tab"
3. You'll see an "Offline" badge on the modal if you're offline
4. The tab will be created with a temporary number (TEMP-xxx)
5. When online, the temporary number will update to a real tab number (TAB-xxx)

**What happens:**
- The tab is saved to your device immediately
- You can start adding orders right away
- When you reconnect, the tab syncs to the server automatically

## Adding Orders Offline

1. Click "Add Order" on any tab
2. Select products as usual
3. Click "Confirm Order"
4. You'll see a message: "Kitchen will receive when online"
5. The order is saved locally and will be sent to the kitchen when you reconnect

**Important Notes:**
- Stock is decreased immediately in your local view, even offline
- The order shows a temporary number (TEMP-ORD-xxx) until synced
- Orders are queued and sent automatically when connection returns

## Closing Tabs Offline

1. Click "Close Tab"
2. Process payment as usual (cash, card, etc.)
3. A receipt will be displayed immediately
4. The receipt shows "OFFLINE RECEIPT" header
5. Payment is recorded locally and will sync when online

**Important:**
- The receipt is valid even when offline
- Payment data is saved securely on your device
- When online, payment syncs to the server for reports

## What Happens When You Go Back Online?

The system automatically syncs all pending operations in order:
1. New tabs are created on the server
2. Orders are sent to the kitchen
3. Payments are recorded

You'll see notifications when sync completes:
- "✅ Synced - All changes saved to server"

### Sync Indicators

- **Syncing badge** - Operation is currently syncing
- **Temp badge** - Uses temporary ID, will update when synced
- **WiFi icon with number** - Shows pending operations count

## Troubleshooting

### Q: I opened a tab offline, but the number is still TEMP-xxx
**A:** Check your internet connection. The system will update the number automatically when online. Look for the "Syncing" badge which indicates the sync is in progress.

### Q: Will the kitchen receive my offline orders?
**A:** Yes! As soon as your connection returns, all orders are queued and sent automatically. The kitchen will receive them in the order they were created.

### Q: What if I run out of stock offline?
**A:** The system tracks stock locally. If you try to order more than available, you'll see an "Insufficient Stock" error. The local stock updates immediately when orders are placed.

### Q: Can I see which operations are pending sync?
**A:** Yes! Check the WiFi icon in the top-right corner. It shows:
- Connection status (Online/Offline)
- Number of pending operations
- Last sync time
- Option to manually retry failed operations

### Q: What if sync fails?
**A:** If an operation fails to sync:
1. It remains in the queue for automatic retry
2. You'll see a failed count in the sync status indicator
3. You can manually retry from the sync status menu
4. Failed operations won't be lost

### Q: Can I continue working if some operations failed?
**A:** Yes! Failed operations are kept separate and won't block new operations. You can continue working normally while resolving failed syncs.

## Best Practices

### Before Going Offline
1. Ensure recent sync - check the "Last Sync" time
2. Verify critical data is cached (tables, products, active tabs)
3. Close any unnecessary tabs to reduce sync load later

### While Offline
1. Monitor local stock carefully
2. Note which operations are pending (check badges)
3. Keep the app open if possible to sync quickly when connection returns

### When Connection Returns
1. Wait for automatic sync to complete
2. Check that all "Pending" badges disappear
3. Verify kitchen received orders
4. Confirm reports show payments

## Technical Details

### What Data is Available Offline?
- **Tables** - All tables and their status
- **Active Sessions** - Currently open tabs
- **Products** - Full product catalog with stock levels
- **Packages** - All packages and their components
- **Customers** - Customer list for assignment

### What Data is NOT Available Offline?
- **Session History** - Past closed sessions
- **Reports** - Sales reports and analytics
- **Kitchen Display** - Real-time kitchen updates

### Data Storage
- All offline data is stored securely in your browser's IndexedDB
- Data persists even if you close the browser
- No sensitive payment information is stored permanently offline

### Sync Frequency
- **Catalog Sync** - Every 5 minutes when online
- **Full Sync** - Every 24 hours
- **Mutation Sync** - Immediate when operations are queued

## Privacy & Security

- Offline data is stored locally on your device only
- No data is sent to external servers
- When online, data syncs only to your authorized Beerhive server
- Clear browser data to remove all offline information

## Support

If you experience issues with offline mode:
1. Check browser console for error messages
2. Try clearing offline data (Settings → Clear Cache)
3. Contact your system administrator
4. Refer to the troubleshooting guide

---

**Version:** 2.0.0  
**Last Updated:** November 2024  
**Module:** Tab Management Offline-First
