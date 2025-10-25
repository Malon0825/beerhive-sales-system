# Reports Module Fixes and Enhancements (v1.0.2)

## Scope
- All improvements apply to Reports & Analytics → ReportsDashboard and All Products Sold table.
- Export All (Excel) updated to reflect UI state and data semantics.

## UI/UX Improvements
- All Products Sold: Standalone vs Combined toggle
  - Standalone: shows products and packages as standalone items; includes revenue.
  - Combined: merges package component consumption into product quantities; revenue hidden.
- Smooth transitions
  - Directional slide: Combined slides in from left; Standalone from right.
  - Header excluded from animation; only table body animates.
  - Inline package details: smooth grid row expand/collapse with fade/slide.
- Visual polish
  - Subtle border on expand button with hover state.
  - Rank column fixed width for consistent alignment across modes.
  - Sticky table header remains visible while scrolling.

## Data & Export
- Export All (Excel)
  - Removed Top Products sheet.
  - All Products Sold sheet reflects toggle state:
    - Standalone → includes revenue with headers: Product, Quantity, Revenue, Orders.
    - Combined → excludes revenue with headers: Product, Quantity, Orders.
  - Sheet name indicates mode: "All Products Sold (Standalone)" or "All Products Sold (Combined)".

## Backend & Queries
- getSalesByPaymentMethod: lint fixes and robustness around null values and parsing.
- Reused existing aggregation endpoints for standalone and combined datasets.

## Accessibility
- Added aria-labels to expand/collapse control.

## QA Checklist
- Toggle between Standalone and Combined: verify directional slide and sticky header.
- Confirm revenue column hidden in Combined and present in Standalone.
- Export All: verify sheet name and headers reflect the active toggle.
- Ensure Top Products sheet is removed from export.
- Verify inline package expand/collapse animation and button border.
