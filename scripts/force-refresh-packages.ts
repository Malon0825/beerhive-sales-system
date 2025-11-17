/**
 * Force Refresh Packages Cache
 * 
 * This script forces a complete re-sync of packages from Supabase to IndexedDB.
 * Use this when package data is stale or package_items are missing.
 * 
 * Usage:
 * 1. Open browser console on POS page
 * 2. Run: await forceRefreshPackages()
 * 3. Refresh the page
 */

export async function forceRefreshPackages() {
  console.log('🔄 [Force Refresh] Starting packages cache refresh...');
  
  try {
    // Open IndexedDB
    const dbName = 'BeerHivePOS_Cache';
    const request = indexedDB.open(dbName);
    
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Clear packages store
    const tx = db.transaction(['packages', 'meta'], 'readwrite');
    const packagesStore = tx.objectStore('packages');
    const metaStore = tx.objectStore('meta');
    
    // Delete all packages
    await new Promise((resolve, reject) => {
      const clearRequest = packagesStore.clear();
      clearRequest.onsuccess = () => resolve(undefined);
      clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    console.log('✅ [Force Refresh] Cleared packages cache');
    
    // Reset last sync timestamp for packages
    await new Promise((resolve, reject) => {
      const putRequest = metaStore.put({ key: 'lastSync_packages', value: null });
      putRequest.onsuccess = () => resolve(undefined);
      putRequest.onerror = () => reject(putRequest.error);
    });
    
    console.log('✅ [Force Refresh] Reset packages sync timestamp');
    
    db.close();
    
    console.log('✅ [Force Refresh] Packages cache cleared successfully!');
    console.log('🔄 [Force Refresh] Please refresh the page to re-sync packages with items');
    
    return {
      success: true,
      message: 'Packages cache cleared. Refresh the page to re-sync.'
    };
    
  } catch (error) {
    console.error('❌ [Force Refresh] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// For browser console use
if (typeof window !== 'undefined') {
  (window as any).forceRefreshPackages = forceRefreshPackages;
  console.log('💡 [Force Refresh] Use: await forceRefreshPackages()');
}
