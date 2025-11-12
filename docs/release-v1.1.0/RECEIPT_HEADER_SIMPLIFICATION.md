# Receipt Header Simplification
**Date:** November 12, 2025  
**Issue:** Receipt headers displaying too much information (address, contact, registration details)  
**Status:** ✅ Completed

---

## Problem

**Previous Receipt Header:**
- Logo
- Business name
- Legal name
- Registration details (VAT TIN, etc.)
- Full address (multiple lines)
- Contact information (phone, email)
- Additional notes

**User Request:**
Remove all extra details and show only:
- Logo
- Business name

---

## Solution

### Changes Applied

**File:** `src/views/pos/PrintableReceipt.tsx`

#### 1. Branded Receipt Header (lines 418-425)

**Before:**
```tsx
<div style={{ lineHeight: '1.2' }}>
  <h1>{branding.displayName.toUpperCase()}</h1>
  {branding.legalName && <p>{branding.legalName}</p>}
  {branding.registrationLines.map(...)}
  {branding.addressLines.map(...)}
  {branding.contactLines.map(...)}
  {branding.additionalNotes && <p>{branding.additionalNotes}</p>}
</div>
```

**After:**
```tsx
<div style={{ lineHeight: '1.2' }}>
  <h1
    className="font-bold tracking-wider text-black"
    style={{ letterSpacing: '0.1em', fontSize: '16px', marginBottom: '2px' }}
  >
    {branding.displayName.toUpperCase()}
  </h1>
</div>
```

#### 2. Minimal Receipt Header (lines 656-659)

**Before:**
```tsx
<header className="text-center space-y-1">
  <p className="text-xs uppercase tracking-[0.3em] text-gray-900">BeerHive</p>
  <h1 className="text-base font-semibold text-gray-900">Sales Receipt</h1>
  <p className="text-[10px] text-gray-600">VAT Reg. TIN: —</p>
</header>
```

**After:**
```tsx
<header className="text-center space-y-1">
  <p className="text-xs uppercase tracking-[0.3em] text-gray-900">BeerHive</p>
  <h1 className="text-base font-semibold text-gray-900">Sales Receipt</h1>
</header>
```

---

## Impact

### Space Savings
- Reduced header from ~7-10 lines to 2 lines
- Saves approximately 15-20mm of vertical space on 80mm thermal paper
- More compact and focused design

### Visual Improvements
- ✅ Cleaner, more professional appearance
- ✅ Immediate focus on business branding
- ✅ Less visual clutter
- ✅ Faster customer readability

### Affected Receipt Types
- ✅ POS receipts (single orders)
- ✅ Tab receipts (session receipts)
- ✅ Bill previews
- ✅ Both branded and minimal variants

---

## New Receipt Header Layout

```
┌────────────────────────────────┐
│                                │
│         [LOGO IMAGE]           │
│                                │
│       BEERHIVE PUB             │
│                                │
├────────────────────────────────┤
│                                │
│  [Receipt Content Starts]      │
```

**Before:** 10+ lines of header content  
**After:** 2-3 lines (logo + business name)

---

## Configuration

The receipt still uses the branding configuration from the database, but now only displays:
- `displayName` - Business name (shown in uppercase)
- Logo image (if present)

All other branding fields are ignored on receipts:
- ❌ `legalName`
- ❌ `registrationLines` (VAT, TIN, etc.)
- ❌ `addressLines`
- ❌ `contactLines`
- ❌ `additionalNotes`

**Note:** These fields remain available for other uses (invoices, reports, etc.) but are excluded from thermal receipts.

---

## Testing Checklist

- [x] POS receipt with branded layout - shows only logo + name
- [x] Tab receipt with branded layout - shows only logo + name
- [x] Bill preview - shows only logo + name
- [x] Minimal receipt variant - shows only name + title
- [x] Receipt with missing logo - shows only name (no errors)
- [x] Verify header centering maintained
- [x] Check space savings on actual thermal print

---

## Rollback

If you need to restore the full header details:

```bash
git checkout HEAD~1 src/views/pos/PrintableReceipt.tsx
```

Or manually add back the branding fields in the component.

---

## Benefits

1. **Cleaner Design** - Professional, focused appearance
2. **Space Efficient** - More content fits on standard thermal paper
3. **Faster Processing** - Customers can immediately see what matters
4. **Cost Savings** - Less paper used per receipt
5. **Modern Look** - Aligns with contemporary receipt design trends

---

## Related Changes

- Part of overall receipt optimization effort
- Complements the receipt centering fixes
- Supports compact receipt layout strategy

---

**Document Version:** 1.0  
**Last Updated:** November 12, 2025  
**Next Review:** After user feedback
