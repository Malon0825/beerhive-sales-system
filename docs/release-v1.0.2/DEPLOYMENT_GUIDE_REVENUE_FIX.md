# Deployment Guide: Revenue Tripling Bug Fix

**Version:** v1.0.2  
**Date:** October 17, 2025  
**Issue:** Revenue reports showing 3x inflated values  
**Urgency:** HIGH - Critical financial accuracy issue

---

## Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Review diagnostic queries
- [ ] Notify stakeholders of maintenance window
- [ ] Prepare rollback plan
- [ ] Test timezone fix in staging environment

---

## Issue Summary

### Problem
1. **Revenue inflated 3x**: Cashier reported ₱5,529 actual sales, system shows ₱16,697
2. **1-hour difference causes tripling**: 
   - 9pm-3am: ₱5,260 (11 orders)
   - 8pm-3am: ₱16,697 (27 orders) - **3x inflation!**

### Root Causes
1. **Data migration not executed**: Old Tab orders still have duplicate `amount_tendered` values
2. **Timezone conversion bug**: Custom date range converts local time to UTC, causing 8-hour shift

---

## Deployment Steps

### STEP 1: Database Backup

```bash
# Create backup before any changes
pg_dump -h [host] -U [user] -d beerhive_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file exists and has reasonable size
ls -lh backup_*.sql
```

### STEP 2: Run Diagnostic Queries

**File:** `docs/release-v1.0.2/DIAGNOSTIC_REVENUE_ISSUE.sql`

```sql
-- Connect to database
psql -h [host] -U [user] -d beerhive_production

-- Run STEP 1: Check for duplicate payments
SELECT 
    COUNT(*) as orders_with_duplicate_payments,
    COUNT(DISTINCT session_id) as affected_sessions
FROM orders
WHERE 
    session_id IS NOT NULL 
    AND amount_tendered IS NOT NULL;
```

**Expected Result:** Should show > 0 (confirming the issue exists)

**Record the numbers for comparison after migration.**

### STEP 3: Execute Data Migration

**File:** `docs/release-v1.0.2/data_migration_tab_payment_cleanup.sql`

Execute each step carefully:

```sql
-- STEP 1: Verify the issue
SELECT 
    o.id,
    o.order_number,
    o.session_id,
    o.total_amount,
    o.amount_tendered,
    o.change_amount
FROM orders o
LEFT JOIN order_sessions os ON o.session_id = os.id
WHERE 
    o.session_id IS NOT NULL 
    AND o.amount_tendered IS NOT NULL
ORDER BY o.session_id, o.created_at
LIMIT 20;

-- STEP 2: Count affected records
SELECT 
    COUNT(*) as affected_orders,
    COUNT(DISTINCT session_id) as affected_sessions
FROM orders
WHERE 
    session_id IS NOT NULL 
    AND amount_tendered IS NOT NULL;

-- STEP 3: Create backup table
CREATE TABLE IF NOT EXISTS orders_payment_backup_20251017 AS
SELECT 
    id,
    order_number,
    session_id,
    amount_tendered,
    change_amount,
    total_amount,
    payment_method,
    status,
    updated_at
FROM orders
WHERE 
    session_id IS NOT NULL 
    AND amount_tendered IS NOT NULL;

-- Verify backup created
SELECT COUNT(*) FROM orders_payment_backup_20251017;

-- STEP 4: Execute the fix (THIS IS THE CRITICAL STEP)
UPDATE orders 
SET 
    amount_tendered = NULL,
    change_amount = NULL,
    updated_at = NOW()
WHERE 
    session_id IS NOT NULL 
    AND status = 'completed';

-- Check how many rows were updated
-- Should match the count from STEP 2

-- STEP 5: Verify the fix
SELECT 
    o.id,
    o.order_number,
    o.session_id,
    o.amount_tendered,
    o.change_amount
FROM orders o
WHERE 
    o.session_id IS NOT NULL 
    AND o.amount_tendered IS NOT NULL;

-- Expected: 0 rows (all cleaned up)

-- STEP 6: Verify sales totals are still correct
SELECT 
    os.id as session_id,
    os.session_number,
    os.total_amount as session_total,
    SUM(o.total_amount) as sum_of_orders,
    os.total_amount - SUM(o.total_amount) as difference
FROM order_sessions os
LEFT JOIN orders o ON o.session_id = os.id
WHERE os.status = 'closed'
GROUP BY os.id, os.session_number, os.total_amount
HAVING ABS(os.total_amount - SUM(o.total_amount)) > 0.01
ORDER BY os.closed_at DESC
LIMIT 20;

-- Expected: 0 rows (all sessions have correct totals)
```

### STEP 4: Deploy Code Changes

**File:** `src/views/reports/DateRangeFilter.tsx`

Changes made:
- Fixed `handlePeriodChange()` to use local datetime strings (lines 29-97)
- Fixed `handleCustomDateChange()` to preserve local timezone (lines 99-116)
- Added `formatLocalDateTime()` helper function

**Deployment:**
```bash
# Build the application
npm run build

# Deploy to production (adjust based on your deployment method)
# Example for Netlify:
netlify deploy --prod

# Example for manual server:
pm2 restart beerhive-app
```

### STEP 5: Verification Testing

#### Test 1: Verify Migration Success
```sql
-- Should return 0
SELECT COUNT(*) FROM orders 
WHERE session_id IS NOT NULL AND amount_tendered IS NOT NULL;
```

#### Test 2: Revenue Calculation (Oct 12-13, 2025)
In the UI:
1. Go to Reports Dashboard
2. Select Custom Range
3. **Test A**: Oct 12, 8:00 PM - Oct 13, 3:00 AM
4. **Test B**: Oct 12, 9:00 PM - Oct 13, 3:00 AM

**Expected Results:**
- Both should show **similar** revenue (difference should be only orders in 8pm-9pm window)
- Revenue should be close to ₱5,529 (cashier's reported total)
- No more 3x inflation

#### Test 3: Timezone Verification
1. Open browser DevTools > Network tab
2. Select Custom Range: Oct 12, 2025, 8:00 PM
3. Check the API request URL
4. **Verify**: `startDate=2025-10-12T20:00:00` (not converted to UTC)

#### Test 4: Quick Period Buttons
1. Click "Today" button
2. Verify results show current day's sales
3. Click "Yesterday", "Last 7 Days", "Last 30 Days"
4. Verify each shows correct date ranges

### STEP 6: Reconciliation with Physical Records

1. **Get cashier's physical sales records** for Oct 12, 8pm - Oct 13, 3am
2. **Run system report** for same period
3. **Compare totals** - should match within ₱50 (accounting for rounding)
4. **Document any discrepancies** for investigation

### STEP 7: Monitor for 48 Hours

- [ ] Check daily sales reports match cashier reconciliation
- [ ] Monitor error logs for any timezone-related issues
- [ ] Verify all date range filters work correctly
- [ ] Watch for customer complaints or data inconsistencies

---

## Rollback Plan

### If Migration Needs Rollback (within 24 hours)

```sql
-- Restore from backup table
UPDATE orders o
SET 
    amount_tendered = b.amount_tendered,
    change_amount = b.change_amount,
    updated_at = NOW()
FROM orders_payment_backup_20251017 b
WHERE o.id = b.id;

-- Verify restoration
SELECT COUNT(*) FROM orders 
WHERE session_id IS NOT NULL AND amount_tendered IS NOT NULL;
-- Should match original count from STEP 2
```

### If Code Needs Rollback

```bash
# Revert to previous version
git revert [commit-hash]
npm run build
netlify deploy --prod
```

### If Complete Rollback Needed

```bash
# Restore database from backup
psql -h [host] -U [user] -d beerhive_production < backup_[timestamp].sql

# Revert code changes
git checkout [previous-commit]
npm run build
netlify deploy --prod
```

---

## Success Criteria

- [ ] **Data migration**: 0 orders with `session_id IS NOT NULL AND amount_tendered IS NOT NULL`
- [ ] **Revenue accuracy**: Oct 12-13 report matches cashier's ₱5,529 (±₱50)
- [ ] **Consistency**: 8pm-3am and 9pm-3am ranges show logical values
- [ ] **Timezone**: Custom date queries use local time (not UTC-converted)
- [ ] **No errors**: No JavaScript console errors or API failures
- [ ] **Reconciliation**: Daily sales match physical cash/card for next 3 days

---

## Post-Deployment Tasks

### Immediate (within 24 hours)
- [ ] Verify revenue reports for last 7 days
- [ ] Check Tab payment receipts print correctly
- [ ] Reconcile daily sales with cashier reports
- [ ] Clean up backup table (after 7 days of verification)

### Short-term (within 1 week)
- [ ] Add automated test for timezone handling
- [ ] Document timezone best practices for team
- [ ] Review all other date-time handling in codebase
- [ ] Create monitoring alert for revenue anomalies

### Long-term
- [ ] Add database constraint: `CHECK (session_id IS NULL OR amount_tendered IS NULL)`
- [ ] Implement automated daily reconciliation reports
- [ ] Add validation in API layer for payment data
- [ ] Create regression test suite for financial calculations

---

## Cleanup (After 7 Days of Successful Operation)

```sql
-- Drop the backup table
DROP TABLE IF EXISTS orders_payment_backup_20251017;

-- Vacuum to reclaim space
VACUUM ANALYZE orders;
```

---

## Contact Information

**Technical Lead:** [Name]  
**Database Admin:** [Name]  
**Deployment Engineer:** [Name]  
**Business Stakeholder:** [Name]

**Emergency Rollback Authorization:** [Name], [Phone]

---

## Documentation References

- `TAB_PAYMENT_DUPLICATION_FIX.md` - Original bug fix documentation
- `REVENUE_TRIPLING_BUG_ANALYSIS.md` - Root cause analysis
- `data_migration_tab_payment_cleanup.sql` - Migration script
- `DIAGNOSTIC_REVENUE_ISSUE.sql` - Diagnostic queries
- `DEPLOYMENT_GUIDE_REVENUE_FIX.md` - This document

---

## Approval Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Database Admin | | | |
| Business Manager | | | |
| QA Lead | | | |

---

**Deployment Window:** [Date/Time]  
**Estimated Downtime:** None (data migration can run while system is live)  
**Rollback Decision Point:** 2 hours after deployment
