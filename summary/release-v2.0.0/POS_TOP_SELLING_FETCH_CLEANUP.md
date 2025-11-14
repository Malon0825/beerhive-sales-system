---
description: POS top-selling API call removal summary
---

# POS Top-Selling Fetch Cleanup

## Overview
- Removed the unused top-selling popularity map from the POS product grid to align with the new alphabetical sorting.
- Eliminated the `/api/reports/sales?type=top-products` request on POS load, preventing unnecessary reads on `order_items` and `orders`.

## Technical Changes
- Deleted `topSellingMap` state and the `fetchTopSelling` helper (plus its invocation) from `POSInterface`, leaving only the product, package, and category fetches required for the UI to render. @src/views/pos/POSInterface.tsx#55-267
- Removed the matching top-selling state and fetch logic from `SessionProductSelector`, keeping the component focused on alphabetical filters and stock tracking. @src/views/pos/SessionProductSelector.tsx#89-321

## Impact
- Reduces load on reporting tables when staff opens the POS, cutting one heavy query per session.
- Keeps the POS data flow consistent with the current sort order while retaining existing stock-tracking behavior.

## Testing
- Not run (UI-only cleanup).
