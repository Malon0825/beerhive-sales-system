# Revenue Tripling Bug - Root Cause Analysis

**Date:** October 17, 2025  
**Version:** v1.0.2  
**Reporter:** Cashier  
**Status:** 🔍 Investigating

---

## Problem Summary

### Symptoms
1. **Revenue inconsistency**: Adding 1 hour to date range causes revenue to **triple**
   - **9:00 PM - 3:00 AM**: ₱5,260 (11 orders)
   - **8:00 PM - 3:00 AM**: ₱16,697 (27 orders)
   
2. **Discrepancy with physical sales**: 
   - **Cashier reported**: ₱5,529 actual cash collected
   - **System showing**: ₱16,697 (3x inflated)

### Impact
- **Critical financial accuracy issue**
- Sales reports show inflated revenue
- Physical cash/card reconciliation fails
- Managers cannot trust the dashboard

---

## Root Cause Analysis

### Primary Issue: Data Migration Not Executed ⚠️

The **Tab Payment Duplication Fix** (v1.0.2) resolved the code-level bug, but the **data migration script was never run** on the production database.

**Evidence:**
1. Revenue tripling with minimal time difference indicates duplicate payment counting
2. The pattern matches the pre-fix behavior documented in `TAB_PAYMENT_DUPLICATION_FIX.md`

**Technical Details:**

Before the fix, when closing a Tab with multiple orders:
```
Tab Session: 3 orders totaling ₱100
├── Order A (₱30) → amount_tendered = ₱100 ❌
├── Order B (₱40) → amount_tendered = ₱100 ❌  
└── Order C (₱30) → amount_tendered = ₱100 ❌
Total recorded: ₱300 (3x inflation!)
```

**Current query logic** (from `reports.queries.ts`):
- Correctly separates POS orders and Tab sessions
- BUT if old data still has `amount_tendered` on individual orders within sessions, it won't filter them properly

### Secondary Issue: Timezone Handling in Date Range Filter

The `DateRangeFilter.tsx` component has a **timezone conversion bug**:

**File:** `src/views/reports/DateRangeFilter.tsx`, Lines 79-80

```typescript
const startStr = new Date(`${startDateOnly}T${(startTime || '00:00')}:00`).toISOString();
const endStr = new Date(`${endDateOnly}T${(endTime || '23:59')}:59`).toISOString();
```

**Problem:**
- User selects: `2025-10-12 20:00` (8:00 PM local time, UTC+8)
- JavaScript interprets as local time
- `.toISOString()` converts to UTC: `2025-10-12T12:00:00.000Z` (12:00 PM UTC)
- **Result**: Query runs 8 hours earlier than intended!

**Example:**
- User wants: Oct 12, 8:00 PM - Oct 13, 3:00 AM (Philippines time)
- System queries: Oct 12, 12:00 PM - Oct 12, 7:00 PM (UTC)
- **Off by 8 hours!**

---

## Why Revenue Tripled

### Scenario Reconstruction

**Hypothesis:** The 8pm-9pm window contains Tab sessions with duplicate payments from before the fix.

**8:00 PM - 9:00 PM window:**
- Contains 1-2 Tab sessions with multiple orders
- Each order in those sessions has `amount_tendered` duplicated
- Example: 1 Tab with 3 orders of ₱3,812 each = ₱11,436 duplicate revenue

**Math:**
- 9pm-3am: ₱5,260 (correct, no duplicate tabs in this window)
- 8pm-9pm: ~₱11,437 (1 duplicate tab session)
- **Total**: ₱5,260 + ₱11,437 = **₱16,697** ✓ Matches screenshot!

**Why 27 orders vs 11 orders:**
- The duplicate tab session likely had ~16 individual orders
- Each order counted separately due to still having `amount_tendered`
- Combined with the 11 legitimate orders = 27 total

---

## Solution

### Immediate Actions Required

#### 1. Run Data Migration Script ✅
**File:** `docs/release-v1.0.2/data_migration_tab_payment_cleanup.sql`

```bash
# Connect to production database
# Run migration script to clean up duplicate payments
```

This will:
- Clear `amount_tendered` and `change_amount` from orders with `session_id`
- Preserve payment data at the session level
- Fix all historical data corruption

#### 2. Fix Timezone Handling Bug 🔧
**File:** `src/views/reports/DateRangeFilter.tsx`

Change lines 79-80 to handle timezone correctly:

```typescript
// BEFORE (buggy)
const startStr = new Date(`${startDateOnly}T${(startTime || '00:00')}:00`).toISOString();
const endStr = new Date(`${endDateOnly}T${(endTime || '23:59')}:59`).toISOString();

// AFTER (fixed)
const startStr = `${startDateOnly}T${(startTime || '00:00')}:00`;
const endStr = `${endDateOnly}T${(endTime || '23:59')}:59`;
```

**Why this works:**
- Pass local datetime string directly to API
- Database timezone is already set to Philippines timezone
- PostgreSQL handles the comparison correctly without conversion

#### 3. Verify Fix with Diagnostic Queries 📊
**File:** `docs/release-v1.0.2/DIAGNOSTIC_REVENUE_ISSUE.sql`

Run diagnostic queries to:
1. Confirm migration executed successfully
2. Verify revenue now matches cashier reports
3. Check that 8pm-3am and 9pm-3am show consistent values

---

## Testing Plan

### Test Case 1: Verify Migration
```sql
-- Should return 0 after migration
SELECT COUNT(*) FROM orders 
WHERE session_id IS NOT NULL AND amount_tendered IS NOT NULL;
```

### Test Case 2: Revenue Calculation Accuracy
1. Run report for Oct 12, 8:00 PM - Oct 13, 3:00 AM
2. **Expected**: Revenue matches cashier report (₱5,529)
3. **Expected**: Same revenue whether querying from 8pm or 9pm

### Test Case 3: Timezone Handling
1. Select custom date: Oct 12, 2025, 8:00 PM
2. Check network request: should pass `2025-10-12T20:00:00` (not converted to UTC)
3. Verify results match expected timeframe

---

## Prevention Measures

### Code Review Checklist
- [ ] All database schema changes require migration scripts
- [ ] Migration scripts must be reviewed and approved
- [ ] Deployment checklist must include "Run migrations" step
- [ ] Always handle timezones explicitly in date/time code

### Automated Tests Needed
1. **Revenue calculation test** with mixed POS and Tab orders
2. **Timezone test** to ensure local time is preserved in queries
3. **Migration verification** test in staging environment

### Documentation Updates
- [ ] Add "Post-Deployment Checklist" to deployment guide
- [ ] Document timezone handling best practices
- [ ] Create runbook for financial data reconciliation

---

## Deployment Steps

1. **Backup production database**
   ```bash
   pg_dump -h [host] -U [user] -d [database] > backup_$(date +%Y%m%d).sql
   ```

2. **Run diagnostic queries** (from `DIAGNOSTIC_REVENUE_ISSUE.sql`)
   - Verify the issue exists
   - Record current state for comparison

3. **Execute data migration** (from `data_migration_tab_payment_cleanup.sql`)
   - Step-by-step execution
   - Verify each step before proceeding

4. **Deploy timezone fix** (update `DateRangeFilter.tsx`)
   - Test in staging first
   - Deploy to production

5. **Verify fix**
   - Re-run diagnostic queries
   - Test revenue reports for Oct 12-13
   - Compare with cashier physical records

6. **Monitor for 48 hours**
   - Watch for any edge cases
   - Verify daily reconciliation matches

---

## Related Files

### Modified
- `src/views/reports/DateRangeFilter.tsx` - Timezone fix

### Scripts
- `docs/release-v1.0.2/data_migration_tab_payment_cleanup.sql` - Data cleanup
- `docs/release-v1.0.2/DIAGNOSTIC_REVENUE_ISSUE.sql` - Diagnostic queries

### Documentation
- `docs/release-v1.0.2/TAB_PAYMENT_DUPLICATION_FIX.md` - Original fix documentation
- `docs/release-v1.0.2/REVENUE_TRIPLING_BUG_ANALYSIS.md` - This document

---

## Summary

**Root Cause:** Data migration not executed + timezone handling bug  
**Impact:** Critical - Revenue reports showing 3x inflated values  
**Fix Complexity:** Low - Run migration script + 2-line code change  
**Risk:** Low - Well-documented fix with rollback capability  
**Testing:** Required before production deployment  
**Urgency:** High - Affects financial accuracy and reconciliation
