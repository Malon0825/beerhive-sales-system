# BeerHive Sales System – Release v1.1.0

**Release Date:** November 6, 2025  \
**Status:** ✅ Ready for Production  \
**Type:** Minor Feature & Stability Update

---

## 📋 Overview

Version 1.1.0 focuses on tightening inventory integrity and improving operator feedback around order voids and package lifecycle management. The release ensures that package contents are accurately reconciled when orders are voided, hardens the package deletion flow, and delivers clear notifications so managers understand what actions completed behind the scenes.

---

## ✨ Key Enhancements

### Package-Aware Inventory Restock
- `VoidOrderService` now breaks package items into their component products and returns the correct quantities to inventory.
- Applies to both standard voids and return workflows.
- Structured logging captures which products were restocked and by how much.

### Rich Success Notifications
- `ReturnOrderDialog` now shows a toast confirming when inventory restock succeeds (including package details).
- Package deletion from the management UI now raises immediate toast feedback for both success and error cases.

### Permanent Package Deletion Flow
- `PackageRepository.delete()` performs a hard delete: it removes `package_items` first, then the package record.
- `PackageList` uses the shared `ConfirmDialog` with irreversible-action messaging to make the stakes clear before removal.
- `PackageManager` refreshes the list after deletion without manual reload.

---

## 🐛 Fixes

- Resolved the "Invalid manager PIN" regression caused by duplicate PINs—Supabase queries now return the first active manager/admin match without throwing errors.
- Package voids no longer skip inventory reconciliation; every component product is restocked based on the voided quantity.
- Package deletions clean up associated rows, preventing orphaned records inside Supabase.

---

## 🔧 Technical Notes

- `POST /api/orders/[orderId]/void` now returns an `inventoryRestocked` flag so clients can display accurate feedback.
- Added helper methods inside `VoidOrderService` to handle product vs. package stock adjustments cleanly.
- Toast system integrations were centralized via `useToast` to keep feedback consistent across the UI.

_No database migrations are required for this release._

---

## ✅ Smoke Test Checklist

1. Void an order using a manager PIN shared between two accounts. Confirm the success toast appears.
2. Void an order that contains a package; verify each component product’s stock increases proportionally.
3. Delete a package from the Packages view; ensure the confirmation dialog appears and that the success toast references permanent removal.
4. Inspect Supabase (`packages`, `package_items`) to confirm the records were fully deleted.

---

## 📎 References

- [Changelog Entry](../CHANGELOG.md#110---2025-11-06)
- [Patch Notes](../PATCH_NOTES.md)
- Source code updates in:
  - `src/app/api/orders/[orderId]/void/route.ts`
  - `src/core/services/orders/VoidOrderService.ts`
  - `src/data/repositories/PackageRepository.ts`
  - `src/views/order-board/ReturnOrderDialog.tsx`
  - `src/views/packages/PackageManager.tsx`
  - `src/views/packages/PackageList.tsx`
