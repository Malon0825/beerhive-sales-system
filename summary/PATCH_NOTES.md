# Patch Notes - Version 1.1.0
**Released:** November 6, 2025

---

## 🎯 What's Fixed

### Shared PIN Authorization on Order Voids
Managers using the same PIN were blocked because the Supabase lookup enforced a strict single match. The handler now uses `limit(1).maybeSingle()`, returning the first active manager/admin and logging the authorizer for traceability.

### Package Inventory Rollback Gaps
Voiding packages previously skipped inventory reconciliation. The service now explodes package contents and restores each component product based on the voided quantity.

---

## ✨ What's New

### 📦 Package-Aware Inventory Restock
`VoidOrderService` sends returned stock updates for both standalone items and packaged bundles, ensuring inventory counts stay accurate after voids.

### 🔔 Rich Success Notifications
Toast notifications were upgraded so staff immediately see:
- **Order voids:** confirmation that inventory was restocked (with package awareness).
- **Package deletions:** permanent removal confirmation.

### 🗑️ Permanent Package Deletion Flow
`PackageRepository.delete()` now performs a hard delete. The UI uses the shared `ConfirmDialog` with irreversible-action messaging, and toast feedback confirms results.

---

## 🔧 Technical Updates

### API & Services
- `POST /api/orders/[orderId]/void` returns an `inventoryRestocked` flag so clients can display accurate success messaging.
- `VoidOrderService.returnInventoryForOrder()` routes through helper methods for product vs. package stock updates and emits structured logs.

### Data Layer
- `PackageRepository.delete()` deletes all `package_items` before removing the package record to keep Supabase clean.

### Frontend
- `ReturnOrderDialog` integrates the toast system to highlight inventory restock results.
- `PackageManager` and `PackageList` leverage the shared confirmation dialog and toast system for hard deletions.

---

## 💡 How to Use

### Voiding an Order
1. Open the order board.
2. Submit the void form with any valid manager PIN (duplicates allowed).
3. Watch for the success toast confirming inventory restock.

### Deleting a Package
1. Go to **Packages** and click the trash icon.
2. Confirm the destructive dialog (cannot be undone).
3. Toast confirms the package and all linked items are removed.

---

## ⚠️ Important Notes

- No database migration required for this release.
- Package deletions are permanent—double-check before confirming.

---

## 🐛 Bug Fixes Summary

- Manager PIN validation restored for shared PIN scenarios.
- Package voids now restock all component products.
- Package deletions clean up related Supabase rows automatically.

---

## ✅ Smoke Test Checklist

1. Void an order using a manager PIN shared between accounts. Confirm success toast appears.
2. Void an order containing a package. Verify each product's stock increases accordingly.
3. Delete a package from the Packages view. Ensure confirmation dialog appears and the toast confirms permanent removal.
4. Check Supabase tables (`packages`, `package_items`) to confirm hard delete.

---

**Questions or issues?** Contact your development team.
