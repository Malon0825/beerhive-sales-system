# Release Notes - v1.0.2 (Receipt Standardization & Thermal B/W Design)

## Overview
- **Unify receipt format** across POS, Order Board (orders and sessions), and server-generated HTML.
- **Monochrome, high-contrast thermal layout** using a new black-and-white logo for clear printing on 58/80mm paper.
- **Prevent cut-off at bottom** by adding extra bottom padding in all print paths.
- **Deprecate old tab bill receipt** to avoid future inconsistency.

## Key Changes
- **Black & White design**:
  - Switched to `/receipt-logo.png` with grayscale and increased contrast for crisp thermal rendering.
  - Removed colored text/backgrounds; all borders and dividers are solid/double black.
  - Strengthened headings and labels with bold/uppercase; monospace font for alignment.

- **Bottom padding to prevent truncation**:
  - Added extra space at the end of print outputs so timestamps and final lines are not cut by thermal printers.

- **Single source of truth for receipts**:
  - Reused `PrintableReceipt` component across Order Board (per-order and session receipts), ensuring consistent format with POS.

- **Deprecated legacy Tab Bill component**:
  - `TabBillReceipt` is now hard-deprecated to prevent misuse.

## Files Updated
- UI receipts (POS):
  - `src/views/pos/PrintableReceipt.tsx` — B/W theme, strong dividers, logo filters, extra bottom padding.
  - `src/views/pos/SalesReceipt.tsx` — default `matchDialogStyles = true` to ensure print window inherits active styles.

- Server-generated receipts:
  - `src/core/utils/generators/receiptGenerator.ts` — monochrome styling, logo filter, solid borders, added bottom padding.

- Order Board (standardization to POS receipt):
  - `src/app/(dashboard)/order-sessions/[sessionId]/receipt/page.tsx` — replaced `TabBillReceipt` with a mapped list of `PrintableReceipt` (one per order) with page breaks.
  - `src/views/orders/BillPreviewModal.tsx` — replaced `TabBillReceipt` in both preview and print portal with `PrintableReceipt` instances.
  - `src/views/pos/PrintReceiptButton.tsx` — fetch order data, render hidden `PrintableReceipt`, inject active styles, and print (instead of loading HTML API directly).

- Deprecated to prevent misuse:
  - `src/views/orders/TabBillReceipt.tsx` — throws on render with a clear deprecation message. Consider full deletion in a follow-up.

## Behavior Notes
- **Logo**: now `/receipt-logo.png`; filters applied for clearer dot density on thermal paper: `grayscale` + higher `contrast`.
- **Typography**: monospace font, bold labels, uppercase section titles improve legibility.
- **Dividers**: double lines for major separators; dashed/solid black for minor sections.
- **Padding**: increased bottom padding on all print paths to avoid cut-off (also visible via `mb-20` where added in containers).

## Testing Checklist
- **POS receipt**: open print modal, verify B/W layout and crisp logo; print on 80mm and 58mm.
- **Order Board — order-level**: use the “Print Receipt” button; confirm it renders the same `PrintableReceipt`.
- **Order Board — session**: open session receipt page; verify it prints one `PrintableReceipt` per order with proper page breaks.
- **Server HTML**: `/api/orders/[orderId]/receipt?format=html` prints using monochrome theme and new logo.
- **Check bottom**: verify timestamps and last lines are not cut off.

## Known Notes
- **Browser extension console warning**: Some Chrome extensions may show “Attempting to use a disconnected port object” in print windows. It’s harmless and printing still works. If noisy, disable extensions for localhost or avoid auto-closing the print window.

## Next Steps
- **Delete deprecated file**: remove `src/views/orders/TabBillReceipt.tsx` after ensuring no imports remain, to eliminate lint noise and prevent regressions.
- **Optional**: Disable print window auto-close if extension noise is distracting; close manually instead.
