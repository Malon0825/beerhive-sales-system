# v2.0.0 Summary – POS Stock, Packages & Receipts

## 1. Goal

Ensure that the POS correctly handles **stock updates**, **packages**, and **receipts** in both online and offline modes:

- Local stock reflects orders **immediately**.
- Packages are correctly represented in cache, orders, and receipts.
- Offline receipts for packages look as correct and detailed as online ones.

Covered documents:

- `FEATURE_LOCAL_STOCK_DEDUCTION.md`
- `BUGFIX_POS_FIRST_PRODUCT_DOUBLE_STOCK_DEDUCTION.md`
- `BUGFIX_SUMMARY_POS_DOUBLE_STOCK_DEDUCTION.md`
- `BUGFIX_PACKAGE_ITEMS_CACHE_STALE.md`
- `BUGFIX_PACKAGE_ITEMS_MISSING_ON_RECEIPT.md`
- `BUGFIX_POS_OFFLINE_PACKAGE_RECEIPT.md`
- `BUGFIX_SUMMARY_POS_OFFLINE_PACKAGE_RECEIPT.md`

---

## 2. Local Stock Deduction (Optimistic Inventory)

### 2.1 Problem

- In the offline-first architecture, orders were stored locally and synced later, but **IndexedDB product stock** did not change immediately.
- The POS UI showed **stale stock** until the next server sync.
- Cashiers could oversell items because displayed stock lagged behind reality.

### 2.2 Solution – Local Stock Updates in IndexedDB

File: `offlineDb.ts` and `PaymentPanel.tsx`

New IndexedDB helpers:

- `getProductById(productId)` – fetch a single product from IndexedDB.
- `updateProductStock(productId, quantityDelta)` – update stock by a delta, preventing negative values.
- `decreaseStockForOrder(items)` – atomically decrease stock for multiple products in a single transaction, based on order items.

Integration in payment flow:

- After queueing the order mutation in `PaymentPanel.tsx` (POS mode):
  - Build an array of **non-package** cart items with `productId` and `quantity`.
  - Call `decreaseStockForOrder(stockItems)`.
  - Log success or non-fatal failure (payment is not blocked by local stock write failure).

**Design decisions:**

- Only **products** (not packages) are treated as inventory items.
- Local stock update is **non-blocking** – server sync will correct discrepancies later.
- Negative stock is prevented with `Math.max(0, newStock)`.

**Result:**

- Stock shown in POS updates immediately when orders are placed, even offline.
- Server remains the ultimate authority and will reconcile via the data consistency mechanisms.

---

## 3. POS First Product Double Stock Deduction Bug

### 3.1 Symptom

When adding the **first product** to an empty POS cart:

- Product was added once, but stock appeared to decrement **twice** (e.g. 10 → 8 instead of 10 → 9).
- Completing payment would later correct the display back to the right value.

Functional impact:

- Display-only bug; database stock remained correct.
- Confusing for staff and could influence their decisions.

### 3.2 Root Cause

File: `POSInterface.tsx`

- There is a **cart restoration effect** intended to re-reserve stock when restoring a cart from IndexedDB.
- When the component first mounted with an **empty** cart:
  - `cartRestorationCompleteRef.current` was `false`.
  - On adding the first item, `cart.items.length` became 1.
  - The restoration effect interpreted this as “restored cart with items” and **re-applied stock reservation**.

Sequence:

1. Empty cart → user adds first product → `handleAddProduct` reserves 1 stock.
2. Cart now has 1 item → restoration effect runs once and reserves stock again.
3. Stock display shows a double deduction.

### 3.3 Fix

**New ref:** `initialCartLoadCheckedRef` to track whether the initial cart load has been evaluated.

**New effect:**

- When cart loading finishes (`!cart.isLoadingCart`):
  - If the cart is empty and we have not yet checked initial load:
    - Mark both `cartRestorationCompleteRef.current = true` and `initialCartLoadCheckedRef.current = true`.
    - This tells the restoration logic **not** to run when the first item is added (because there was nothing to restore).
  - If the cart finishes loading with items, mark only `initialCartLoadCheckedRef` and let the normal restoration effect proceed.

**Result:**

- First product addition after an empty load now deducts stock exactly once.
- Restored carts with items still get stock re-reserved as intended.
- Subsequent cart clears and reloads behave correctly without regressions.

---

## 4. Package Items & Cache Staleness

### 4.1 Package Items Cache Stale Issue

File: `BUGFIX_PACKAGE_ITEMS_CACHE_STALE.md`

**Symptom:**

- A package (e.g. "Ultimate Beer Bucket") showed a configuration error in POS:
  - "This package has no items configured."
- Database confirmed that `package_items` existed and were correctly configured.

**Root cause:**

- Early versions of `DataBatchingService.fetchPackages()` did **not include** related `package_items` in the select.
- Some packages were synced to IndexedDB **before** the query was fixed.
- After code fix, packages already cached still lacked items because cached records were never refreshed.

**Fix/Workarounds:**

- Fix in code: `fetchPackages()` now selects `packages` **with `package_items` and related products`**.
- For existing caches created before the fix:
  - Provide scripts and DevTools steps to clear the `packages` store and reset `lastSync_packages` so packages re-sync with items.

### 4.2 Long-Term Prevention

- Encourage **cache versioning** (e.g. `BeerHivePOS_Cache_v2`).
- Add **validation** on load (e.g. detect packages without items and force re-sync).
- Provide an **admin/manual "Sync Catalog"** button that forces a full refresh.

---

## 5. Package Items Missing on Receipts (Online)

File: `BUGFIX_PACKAGE_ITEMS_MISSING_ON_RECEIPT.md`

### 5.1 Symptom

- Receipts for package orders showed only the package line (e.g. `1x Ultimate Beer Bucket ₱800.00`).
- They **did not list the items inside** the package (e.g. `• 5x San Mig Light (Bottle)`).

### 5.2 Root Cause

- `order_items` has `complex_product_metadata` JSONB intended to store rich data for complex products like packages.
- During order creation, this field was **never populated** for packages.
- `PrintableReceipt.tsx` expected package details in `complex_product_metadata.package_items`.

### 5.3 Fix

- In `CreateOrder.ts`:
  - When creating an order item for a package, fetch the package with its items.
  - Build `complex_product_metadata = { package_items: [...] }` from those items.
- In `Order.ts` model:
  - Add proper TypeScript typings for `complex_product_metadata.package_items`.
- In `PrintableReceipt.tsx`:
  - If `item.package_id` and `complex_product_metadata.package_items` exist, render a sub-line for each included item.

**Result:**

- Online receipts show a full package breakdown:

  ```text
  1x Ultimate Beer Bucket  ₱800.00
    • 5x San Mig Light (Bottle)
  ```

### 5.4 Optional Backfill

- Provide an SQL script to backfill `complex_product_metadata` for historical `order_items` with `package_id` set.
- This is optional and used only if old receipts need to show package breakdown.

---

## 6. Offline Package Receipts

File: `BUGFIX_POS_OFFLINE_PACKAGE_RECEIPT.md`

### 6.1 Symptom

In **offline** POS mode when printing receipts for packages:

- Item name was blank or just "1x".
- Line total showed `₱0.00`, although order totals were correct.
- Individual (non-package) products worked fine.

### 6.2 Root Cause

- Offline order snapshots lacked the package metadata that receipts require.

Issues in offline structures:

- `OfflineOrderItemSnapshot` (in `PaymentPanel.tsx`) did **not** include:
  - `packageId` and `productId` fields.
  - `packageItems` array for package contents.
- `transformOfflineSnapshotToReceipt()` (in `POSInterface.tsx`) had no way to map package contents into `complex_product_metadata` for receipt rendering.

### 6.3 Fix

**1. Extend offline snapshot format**

- Add fields to `OfflineOrderItemSnapshot`:
  - `packageId?: string | null`
  - `productId?: string | null`
  - `packageItems?: { product_id, product_name, quantity, is_choice_item, choice_group }[]`

**2. Populate snapshot from cart**

- In `buildOfflineOrderSnapshot()`:
  - For package items in cart, map `item.package.items` into `snapshot.packageItems` in a standardized format.

**3. Map snapshot → receipt format**

- In `transformOfflineSnapshotToReceipt()`:
  - When `localOrder.items` exists, map each offline item to a receipt item including:
    - `product_id`, `package_id`.
    - `complex_product_metadata = { package_items: item.packageItems }` for packages.
  - Also handle a fallback path using the current live cart if no snapshot is present.

**Result:**

- Offline receipts for packages now match online receipts:

  ```text
  Bucket Special    1x  ₱400.00
    • 6x San Miguel Beer
    • 1x Peanuts
  ```

- Implementation follows **Single Responsibility Principle**:
  - Snapshot: capture all required data.
  - Builder: build snapshot from cart.
  - Transformer: convert snapshot to receipt format.

---

## 7. Overall Benefits

- **Stock**:
  - Immediate local deduction in IndexedDB keeps on-screen stock realistic.
  - Server remains source of truth; sync reconciles any discrepancies.

- **Packages**:
  - Cache fixes ensure packages include their items and avoid stale configurations.
  - Receipts (online and offline) now clearly show package contents.

- **User Experience**:
  - Cashiers see up-to-date stock and clear package breakdowns.
  - Kitchen and customers get transparent, itemized information.

- **Technical**:
  - Clear separation between online and offline flows, but with consistent data structures.
  - Stronger guarantees that offline behavior matches online semantics.
