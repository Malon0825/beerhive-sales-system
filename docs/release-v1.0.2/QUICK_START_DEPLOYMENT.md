# Quick Start: Revenue Bug Fix Deployment

**Estimated Time:** 15 minutes  
**Downtime:** None  
**Difficulty:** Low

---

## Overview

Fix for revenue tripling bug (₱5,529 actual → ₱16,697 shown).

**Two fixes required:**
1. ✅ **Code fix** - Already implemented in `DateRangeFilter.tsx`
2. 🔧 **Database migration** - Must be executed manually

---

## Quick Deployment (5 Steps)

### 1️⃣ Backup Database (2 min)
```bash
pg_dump -h [host] -U [user] -d beerhive_production > backup_revenue_fix.sql
```

### 2️⃣ Check Issue Exists (30 sec)
```sql
-- Should return > 0 (confirming issue exists)
SELECT COUNT(*) FROM orders 
WHERE session_id IS NOT NULL AND amount_tendered IS NOT NULL;
```

### 3️⃣ Run Migration (2 min)
```sql
-- Create backup table
CREATE TABLE IF NOT EXISTS orders_payment_backup_20251017 AS
SELECT id, order_number, session_id, amount_tendered, change_amount, total_amount
FROM orders
WHERE session_id IS NOT NULL AND amount_tendered IS NOT NULL;

-- Fix the data
UPDATE orders 
SET amount_tendered = NULL, change_amount = NULL, updated_at = NOW()
WHERE session_id IS NOT NULL AND status = 'completed';
```

### 4️⃣ Deploy Code (5 min)
```bash
npm run build
netlify deploy --prod
```

### 5️⃣ Verify Fix (2 min)
```sql
-- Should return 0 (issue fixed)
SELECT COUNT(*) FROM orders 
WHERE session_id IS NOT NULL AND amount_tendered IS NOT NULL;
```

**Test in UI:**
- Reports → Custom Range → Oct 12, 8pm - Oct 13, 3am
- Should show ~₱5,529 (matching cashier report)

---

## Success Criteria

- ✅ Migration count = 0
- ✅ Revenue ~₱5,529 for Oct 12-13
- ✅ No console errors
- ✅ Date picker uses local time (not UTC)

---

## Rollback (if needed)

```sql
UPDATE orders o
SET amount_tendered = b.amount_tendered, change_amount = b.change_amount
FROM orders_payment_backup_20251017 b
WHERE o.id = b.id;
```

---

## Full Documentation

📖 **DEPLOYMENT_GUIDE_REVENUE_FIX.md** - Complete step-by-step guide  
📖 **REVENUE_TRIPLING_BUG_ANALYSIS.md** - Root cause analysis  
📖 **DIAGNOSTIC_REVENUE_ISSUE.sql** - Diagnostic queries

---

## Support

**Issue:** Revenue reports showing 3x inflated values  
**Fixed by:** Data migration + timezone handling  
**Risk:** Low (has rollback capability)
