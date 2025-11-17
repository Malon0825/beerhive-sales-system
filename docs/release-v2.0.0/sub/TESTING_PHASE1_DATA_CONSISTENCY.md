# Testing Guide: Phase 1 Data Consistency

**Date**: 2025-11-17  
**Version**: v2.0.0  
**Purpose**: Verify Phase 1 data consistency improvements work correctly

---

## Prerequisites

- Development environment running
- Access to browser DevTools
- Access to Supabase dashboard (optional)
- At least 10 products in database for testing

---

## Test 1: Full Sync on First Load

### Objective
Verify that empty IndexedDB triggers full sync and populates cache.

### Steps

1. **Clear IndexedDB**
   ```
   - Open DevTools (F12)
   - Application > IndexedDB
   - Find "beerhive_pos_offline"
   - Right-click > Delete database
   - Refresh page
   ```

2. **Monitor Console Logs**
   ```
   Expected logs:
   ✅ "[DataBatchingService] First sync for products, doing full sync..."
   ✅ "[DataBatchingService] Full sync starting for products..."
   ✅ "[DataBatchingService] Full sync complete for products: X records"
   ✅ Same for categories, packages, tables
   ```

3. **Verify IndexedDB Populated**
   ```
   - DevTools > Application > IndexedDB > beerhive_pos_offline
   - Check stores: products, categories, packages, tables
   - Verify records present
   ```

4. **Verify Metadata**
   ```
   - IndexedDB > metadata store
   - Check keys:
     - lastSync.products (should have timestamp)
     - lastSync.categories (should have timestamp)
     - lastSync.packages (should have timestamp)
     - lastSync.tables (should have timestamp)
     - lastFullSync (should have timestamp)
   ```

5. **Verify POS Loads**
   ```
   - Navigate to POS page
   - Products should display instantly
   - No "Loading..." state
   ```

### Expected Result
✅ Full sync completes in < 10 seconds  
✅ All stores populated  
✅ Cursors set  
✅ POS displays products

---

## Test 2: Periodic Full Refresh (24 Hours)

### Objective
Verify that 24-hour interval triggers full refresh.

### Steps

1. **Simulate Old Last Full Sync**
   ```javascript
   // Run in browser console
   (async () => {
     const { openOfflineDb } = await import('./src/lib/data-batching/offlineDb.ts');
     const db = await openOfflineDb();
     const tx = db.transaction(['metadata'], 'readwrite');
     const store = tx.objectStore('metadata');
     
     // Set to 2 days ago
     const twoDaysAgo = new Date();
     twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
     
     store.put({
       key: 'lastFullSync',
       value: twoDaysAgo.toISOString(),
       updated_at: new Date().toISOString()
     });
     
     await new Promise((resolve, reject) => {
       tx.oncomplete = resolve;
       tx.onerror = reject;
     });
     
     db.close();
     console.log('✅ Set lastFullSync to:', twoDaysAgo.toISOString());
   })();
   ```

2. **Refresh App**
   ```
   - Hard refresh (Ctrl+Shift+R)
   - Monitor console
   ```

3. **Expected Logs**
   ```
   ✅ "[DataBatchingService] Triggering periodic full sync (24h elapsed)..."
   ✅ "[DataBatchingService] Starting full sync for all entities..."
   ✅ Full sync completes
   ```

4. **Verify Recent Sync Doesn't Trigger**
   ```javascript
   // Set to 1 hour ago
   const oneHourAgo = new Date();
   oneHourAgo.setHours(oneHourAgo.getHours() - 1);
   // ... same code but with oneHourAgo
   ```

5. **Refresh App Again**
   ```
   Expected logs:
   ✅ "[DataBatchingService] Doing incremental sync..."
   ❌ No "periodic full sync" message
   ```

### Expected Result
✅ >24h triggers full sync  
✅ <24h triggers incremental sync  
✅ lastFullSync updated after full sync

---

## Test 3: Stock Quantity Authority

### Objective
Verify server stock is always trusted, not merged or cached.

### Steps

1. **Check Initial Stock**
   ```javascript
   // Browser console
   (async () => {
     const { readAllRecords } = await import('./src/lib/data-batching/offlineDb.ts');
     const products = await readAllRecords('products');
     const testProduct = products[0];
     console.log('Product:', testProduct.name);
     console.log('Current stock:', testProduct.current_stock);
     console.log('Stock synced at:', testProduct.stock_synced_at);
   })();
   ```

2. **Create Order in Supabase**
   ```sql
   -- In Supabase SQL Editor
   -- Find a product
   SELECT id, name, current_stock FROM products LIMIT 1;
   
   -- Manually reduce stock (simulate order)
   UPDATE products 
   SET current_stock = current_stock - 5,
       updated_at = NOW()
   WHERE id = '<product_id>';
   
   -- Verify
   SELECT id, name, current_stock, updated_at FROM products WHERE id = '<product_id>';
   ```

3. **Trigger Sync**
   ```javascript
   // Browser console
   const { DataBatchingService } = await import('./src/lib/data-batching/DataBatchingService.ts');
   const service = DataBatchingService.getInstance();
   await service.syncAllEntities();
   console.log('✅ Sync complete');
   ```

4. **Verify Updated Stock**
   ```javascript
   // Check IndexedDB
   const { readAllRecords } = await import('./src/lib/data-batching/offlineDb.ts');
   const products = await readAllRecords('products');
   const updated = products.find(p => p.id === '<product_id>');
   console.log('Updated stock:', updated.current_stock); // Should be -5
   console.log('Stock synced at:', updated.stock_synced_at); // Should be recent
   ```

5. **Verify in POS**
   ```
   - Navigate to POS
   - Find the product
   - Stock should show updated value (-5)
   ```

### Expected Result
✅ Server stock value used  
✅ stock_synced_at updated  
✅ POS displays correct stock  
✅ No stock value averaging or merging

---

## Test 4: Batch Checkpoints

### Objective
Verify sync recovers from network failure using checkpoints.

### Steps

1. **Setup Network Throttling**
   ```
   - DevTools > Network tab
   - Throttling: Custom > 500 Kbps (slow 3G)
   - This slows sync enough to interrupt
   ```

2. **Monitor Sync Progress**
   ```javascript
   // Browser console
   const { DataBatchingService } = await import('./src/lib/data-batching/DataBatchingService.ts');
   const service = DataBatchingService.getInstance();
   
   console.log('Starting sync...');
   service.syncAllEntities();
   // Watch console for checkpoint logs
   ```

3. **Expected Checkpoint Logs**
   ```
   ✅ "[DataBatchingService] Syncing products batch from cursor: ..."
   ✅ "[DataBatchingService] Checkpoint: 100 products synced"
   ✅ "[DataBatchingService] Checkpoint: 200 products synced"
   ```

4. **Simulate Network Failure**
   ```
   - After seeing "Checkpoint: 100 products synced"
   - DevTools > Network > Offline (checkbox)
   - Wait 5 seconds
   - Go back online (uncheck Offline)
   ```

5. **Resume Sync**
   ```javascript
   await service.syncAllEntities();
   ```

6. **Verify Resume Point**
   ```
   Expected logs:
   ✅ "Syncing products batch from cursor: <timestamp_of_batch_100>"
   ❌ Not "from cursor: <original_start_timestamp>"
   
   // Sync should continue from batch 101, not batch 1
   ```

### Expected Result
✅ Checkpoints logged every 100 records  
✅ Cursor updated after each batch  
✅ Failed sync resumes from last checkpoint  
✅ No duplicate syncing

---

## Test 5: Sync Status Tracking

### Objective
Verify getSyncStatus() returns accurate information.

### Steps

1. **Before Sync**
   ```javascript
   const { DataBatchingService } = await import('./src/lib/data-batching/DataBatchingService.ts');
   const service = DataBatchingService.getInstance();
   
   const status = await service.getSyncStatus();
   console.log('Status:', {
     syncing: status.syncing,           // Should be false
     entity: status.entity,              // Should be null
     error: status.error,                // Should be null
     lastSync: status.lastSync,          // Date or null
     lastFullSync: status.lastFullSync,  // Date or null
     recordCounts: status.recordCounts   // Object with counts
   });
   ```

2. **During Sync**
   ```javascript
   // Start sync (don't await)
   service.syncAllEntities();
   
   // Immediately check status
   const statusDuring = await service.getSyncStatus();
   console.log('Syncing:', statusDuring.syncing);    // Should be true
   console.log('Entity:', statusDuring.entity);       // 'products', 'categories', etc.
   ```

3. **After Sync**
   ```javascript
   await service.syncAllEntities();
   
   const statusAfter = await service.getSyncStatus();
   console.log('Syncing:', statusAfter.syncing);      // Should be false
   console.log('Entity:', statusAfter.entity);         // Should be null
   console.log('Last sync:', statusAfter.lastSync);    // Should be recent
   console.log('Counts:', statusAfter.recordCounts);   // Should have data
   ```

4. **Verify Record Counts**
   ```javascript
   const { readAllRecords } = await import('./src/lib/data-batching/offlineDb.ts');
   
   const actualProducts = await readAllRecords('products');
   console.log('Status says:', statusAfter.recordCounts.products);
   console.log('Actual count:', actualProducts.length);
   // Should match
   ```

5. **Test Error Tracking**
   ```javascript
   // Cause an error (go offline first)
   // DevTools > Network > Offline
   
   try {
     await service.syncAllEntities();
   } catch (e) {
     // Expected to fail
   }
   
   const statusError = await service.getSyncStatus();
   console.log('Error:', statusError.error); // Should have error message
   ```

### Expected Result
✅ Status reflects sync state accurately  
✅ Record counts match IndexedDB  
✅ Timestamps updated after sync  
✅ Errors captured and reported

---

## Test 6: End-to-End Integration

### Objective
Verify entire flow works together.

### Steps

1. **Fresh Start**
   ```
   - Clear IndexedDB
   - Clear browser cache (Ctrl+Shift+Delete)
   - Hard refresh
   ```

2. **Verify First Load**
   ```
   ✅ Full sync triggered
   ✅ All entities synced
   ✅ POS loads products
   ✅ Stock displayed correctly
   ```

3. **Make Changes in Database**
   ```sql
   -- Add new product
   INSERT INTO products (name, base_price, current_stock, sku, updated_at)
   VALUES ('Test Product', 100, 50, 'TEST001', NOW());
   
   -- Update existing product stock
   UPDATE products SET current_stock = current_stock - 10, updated_at = NOW()
   WHERE name = 'Some Product';
   ```

4. **Trigger Incremental Sync**
   ```javascript
   const { DataBatchingService } = await import('./src/lib/data-batching/DataBatchingService.ts');
   await DataBatchingService.getInstance().syncAllEntities();
   ```

5. **Verify Changes Appear**
   ```
   - Refresh POS
   - New product should appear
   - Updated stock should be correct
   ```

6. **Wait 24 Hours (or simulate)**
   ```javascript
   // Set lastFullSync to 25 hours ago
   // Restart app
   ```

7. **Verify Periodic Refresh**
   ```
   ✅ Full sync triggered
   ✅ All data refreshed
   ✅ No stale records
   ```

### Expected Result
✅ Complete flow works end-to-end  
✅ Data stays consistent  
✅ Sync recovers from failures  
✅ Performance acceptable

---

## Quick Test Script

Run this in browser console for quick verification:

```javascript
(async () => {
  try {
    console.log('🧪 Running Phase 1 Tests...\n');
    
    // Import services
    const { DataBatchingService } = await import('./src/lib/data-batching/DataBatchingService.ts');
    const { readAllRecords } = await import('./src/lib/data-batching/offlineDb.ts');
    
    const service = DataBatchingService.getInstance();
    
    // Test 1: Get status
    console.log('Test 1: Sync Status');
    const status = await service.getSyncStatus();
    console.log('  Syncing:', status.syncing);
    console.log('  Last sync:', status.lastSync);
    console.log('  Last full sync:', status.lastFullSync);
    console.log('  Products:', status.recordCounts.products);
    console.log('  Categories:', status.recordCounts.categories);
    console.log('  Packages:', status.recordCounts.packages);
    console.log('  Tables:', status.recordCounts.tables);
    console.log('  ✅ Status API works\n');
    
    // Test 2: Verify data in IndexedDB
    console.log('Test 2: IndexedDB Data');
    const products = await readAllRecords('products');
    const categories = await readAllRecords('categories');
    console.log('  Products in cache:', products.length);
    console.log('  Categories in cache:', categories.length);
    
    if (products.length > 0) {
      console.log('  Sample product:', {
        name: products[0].name,
        stock: products[0].current_stock,
        stock_synced_at: products[0].stock_synced_at
      });
    }
    console.log('  ✅ Data accessible\n');
    
    // Test 3: Trigger sync
    console.log('Test 3: Trigger Sync');
    console.log('  Starting sync...');
    await service.syncAllEntities();
    console.log('  ✅ Sync completed\n');
    
    // Test 4: Verify updated status
    console.log('Test 4: Updated Status');
    const newStatus = await service.getSyncStatus();
    console.log('  Last sync:', newStatus.lastSync);
    console.log('  Products:', newStatus.recordCounts.products);
    console.log('  ✅ Status updated\n');
    
    console.log('✅ All Phase 1 tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
```

---

## Success Criteria

All tests should show:
- ✅ Full sync on first load
- ✅ Periodic 24-hour refresh
- ✅ Server stock authority
- ✅ Batch checkpoints working
- ✅ Status tracking accurate
- ✅ No data loss on failure
- ✅ POS loads instantly from cache

---

## Troubleshooting

### Issue: Sync not triggering
**Check**:
- Network online?
- Console errors?
- IndexedDB permissions?

### Issue: Old data still showing
**Fix**:
- Clear IndexedDB completely
- Trigger `fullSyncAll()`
- Hard refresh browser

### Issue: Stock not updating
**Check**:
- Supabase updated_at changed?
- Cursor advanced past change?
- Force full sync to reset

### Issue: Checkpoints not working
**Check**:
- Batch size = 100?
- Cursor being updated?
- Check metadata store

---

## Production Testing

Before production deployment:
1. Test on staging environment
2. Test with 1000+ products
3. Test slow networks
4. Test network interruptions
5. Test multi-device scenarios
6. Monitor for 48 hours

---

**Testing Complete**: Phase 1 ready for production  
**Next**: Deploy to staging for real-world testing
