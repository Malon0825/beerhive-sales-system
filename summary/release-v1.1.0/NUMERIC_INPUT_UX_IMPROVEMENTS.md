---
description: Numeric input usability improvements
---

# Numeric Input UX Improvements

**Date:** November 10, 2025  
**Status:** ✅ Completed  
**Owner:** Cascade (paired with Malon0825)

---

## Overview

Users accidentally changed numeric values when scrolling over inputs, particularly in dialogs and high-traffic forms. We introduced safeguards at the shared input component layer to block scroll-driven increments while keeping typing behaviour intact. This work is now complemented by a full sweep of feature forms so numeric defaults can be cleared without fighting validation handlers.

---

## Problem Statement

- Mouse wheel events on `<input type="number">` were incrementing values, causing accidental quantity or pricing changes.
- Clearing a pre-filled numeric field was inconsistent because many downstream handlers forced fallback values immediately.
- Risk of incorrect transactional data when editing orders, packages, taxes, and inventory counts.

---

## Solution Summary

1. **Centralised Scroll Guard**  
   Updated the shared `Input` wrapper to intercept `wheel` events for number fields and call `preventDefault`, stopping the browser from auto-incrementing/decrementing values.  
   Source: @src/views/shared/ui/input.tsx#1-38

2. **Clearable Numbers Across Feature Forms**  
   Completed handler updates so users can temporarily clear numeric inputs when editing packages, general settings, events, order items, and other high-traffic flows. Numbers are parsed only on submit/blur once valid, preserving existing validation rules.

---

## Form-Level Updates (v1.1.0)

- **Packages** – Base/VIP pricing and per-item quantities now keep string drafts until confirmed, allowing blanks during editing. @src/views/packages/PackageForm.tsx#231-352
- **General Settings** – Tax rate and currency decimal precision accept empty states (saved as `undefined`) until the user re-enters a value. @src/views/settings/GeneralSettingsForm.tsx#429-605
- **Events** – Discount value input stores raw strings during typing and parses on submit, supporting full clearing. @src/views/events/EventForm.tsx#16-82 @src/views/events/EventForm.tsx#260-271
- **Orders** – Manage Order Items modal keeps cleared quantities during edits and validates on save instead of blur. @src/views/orders/ManageOrderItemsModal.tsx#307-338
- **POS / Inventory / Tables / Happy Hour** – Existing string-based handlers already tolerated blanks; verified no regressions required.

---

## Impacted Areas

- All screens using the shared `<Input type="number" />`, including Package, Inventory, POS, Orders, Tables, Events, and Settings modules.
- No API or database changes required.

---

## QA & Verification Checklist

1. Verify wheel scrolling no longer increments values in:
   - Package dialog price fields
   - POS discount amount/percentage fields
   - Inventory product pricing and stock fields
2. Confirm numeric inputs above can be cleared, focus away, and re-filled without auto-reverting.
3. Regression check for forms that rely on browser-side validation (min/max, step).

---

## Next Steps

1. Add automated UI tests (Playwright) covering scroll and clear behaviours on representative numeric inputs.
2. Socialise updated UX guidelines with feature teams (design system notes, code review checklist).

---

> ✅ Scroll-driven value changes are now blocked globally.  
> ✅ Numeric inputs across core flows now respect temporary empty entries while preserving validation rules.
