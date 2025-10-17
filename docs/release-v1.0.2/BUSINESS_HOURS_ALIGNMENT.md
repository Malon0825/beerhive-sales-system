# Business Hours Alignment - Date Range Filters

**Date:** October 17, 2025  
**Version:** 1.0.2  
**Module:** Reports Dashboard - Date Range Filters  
**Critical Change:** All date filters now align with actual business operation hours (5pm - 5pm)

---

## Overview

Updated all date range filters to align with the actual business operating hours. The business operates from **5:00 PM to 5:00 PM the next day**, so each "business day" spans across two calendar days.

---

## Business Day Definition

### Old Logic (Calendar Day)
- Day starts: 12:00 AM (midnight)
- Day ends: 11:59 PM (same day)

### New Logic (Business Day)
- Day starts: 5:00 PM (previous calendar day)
- Day ends: 5:00 PM (current calendar day)

**Example:**
- Business Day "October 17" = Oct 16 at 5:00 PM → Oct 17 at 5:00 PM

---

## Date Range Changes

### 1. Today
**Meaning:** Current business day

**Old Behavior:**
- Start: Today 12:00 AM
- End: Today 11:59 PM

**New Behavior:**
- Start: Yesterday 5:00 PM (17:00)
- End: Today 5:00 PM (17:00)

**Example (October 17, 2025):**
```
Start: 2025-10-16T17:00:00
End:   2025-10-17T17:00:00
```

---

### 2. Yesterday
**Meaning:** Previous business day

**Old Behavior:**
- Start: Yesterday 12:00 AM
- End: Yesterday 11:59 PM

**New Behavior:**
- Start: 2 days ago 5:00 PM
- End: Yesterday 5:00 PM

**Example (October 17, 2025):**
```
Start: 2025-10-15T17:00:00
End:   2025-10-16T17:00:00
```

---

### 3. Last 7 Days
**Meaning:** Last 7 complete business days

**Old Behavior:**
- Start: 7 days ago 12:00 AM
- End: Today 11:59 PM

**New Behavior:**
- Start: 8 days ago 5:00 PM
- End: Today 5:00 PM

**Example (October 17, 2025):**
```
Start: 2025-10-09T17:00:00 (Oct 9, 5pm)
End:   2025-10-17T17:00:00 (Oct 17, 5pm)

Complete business days covered:
- Oct 9 (5pm) → Oct 10 (5pm)
- Oct 10 (5pm) → Oct 11 (5pm)
- Oct 11 (5pm) → Oct 12 (5pm)
- Oct 12 (5pm) → Oct 13 (5pm)
- Oct 13 (5pm) → Oct 14 (5pm)
- Oct 14 (5pm) → Oct 15 (5pm)
- Oct 15 (5pm) → Oct 16 (5pm)
- Oct 16 (5pm) → Oct 17 (5pm) ← Current day
```

---

### 4. Last 30 Days
**Meaning:** Last 30 complete business days

**Old Behavior:**
- Start: 30 days ago 12:00 AM
- End: Today 11:59 PM

**New Behavior:**
- Start: 31 days ago 5:00 PM
- End: Today 5:00 PM

**Example (October 17, 2025):**
```
Start: 2025-09-16T17:00:00 (Sept 16, 5pm)
End:   2025-10-17T17:00:00 (Oct 17, 5pm)

Covers 30 complete business days from Sept 16 to Oct 17
```

---

### 5. Custom Range
**Meaning:** User-defined range

**Default Values (when clicking Custom Range):**
- Start: Yesterday 5:00 PM
- End: Today 5:00 PM

**Note:** Users can still modify to any date/time they need.

---

## Technical Implementation

### Files Modified

#### 1. `src/views/reports/DateRangeFilter.tsx`

**Changes:**
```typescript
case 'today':
  // Current business day: 5pm yesterday to 5pm today
  start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(17, 0, 0, 0); // 5pm yesterday
  end = new Date();
  end.setHours(17, 0, 0, 0); // 5pm today
  break;

case 'yesterday':
  // Previous business day: 5pm 2 days ago to 5pm yesterday
  start = new Date();
  start.setDate(start.getDate() - 2);
  start.setHours(17, 0, 0, 0); // 5pm 2 days ago
  end = new Date();
  end.setDate(end.getDate() - 1);
  end.setHours(17, 0, 0, 0); // 5pm yesterday
  break;

case 'week':
  // Last 7 business days: 5pm 8 days ago to 5pm today
  start = new Date();
  start.setDate(start.getDate() - 8);
  start.setHours(17, 0, 0, 0); // 5pm 8 days ago
  end = new Date();
  end.setHours(17, 0, 0, 0); // 5pm today
  break;

case 'month':
  // Last 30 business days: 5pm 31 days ago to 5pm today
  start = new Date();
  start.setDate(start.getDate() - 31);
  start.setHours(17, 0, 0, 0); // 5pm 31 days ago
  end = new Date();
  end.setHours(17, 0, 0, 0); // 5pm today
  break;
```

#### 2. `src/views/reports/ReportsDashboard.tsx`

**Initial Load Updated:**
```typescript
// Default to Last 7 Days on page load
const endDate = new Date();
endDate.setHours(17, 0, 0, 0); // 5pm today

const startDate = new Date();
startDate.setDate(startDate.getDate() - 8);
startDate.setHours(17, 0, 0, 0); // 5pm 8 days ago
```

---

## SQL Query Examples

### Today (October 17, 2025)
```sql
SELECT SUM(total_amount) as total_revenue
FROM (
  -- POS Orders
  SELECT total_amount FROM orders 
  WHERE session_id IS NULL 
    AND completed_at >= '2025-10-16T17:00:00'
    AND completed_at <= '2025-10-17T17:00:00'
    AND status = 'completed'
  
  UNION ALL
  
  -- Tab Sessions
  SELECT total_amount FROM order_sessions
  WHERE status = 'closed'
    AND closed_at >= '2025-10-16T17:00:00'
    AND closed_at <= '2025-10-17T17:00:00'
) combined;
```

---

## Benefits

### 1. Accurate Business Reporting
✅ **Aligned with operations:** Reports match actual business day cycles  
✅ **No split data:** Each business day captured as a complete unit  
✅ **Consistent metrics:** Daily sales numbers reflect actual operating periods

### 2. Better Decision Making
✅ **True daily comparisons:** Compare complete business days, not arbitrary calendar days  
✅ **Accurate trends:** Weekly/monthly reports show real business patterns  
✅ **Clearer insights:** Revenue numbers match what staff experiences

### 3. User Experience
✅ **Intuitive:** "Today" means current business shift, not calendar day  
✅ **Less confusion:** No more "why does today show yesterday's sales?"  
✅ **Predictable:** Matches how staff think about the business day

---

## Impact on Existing Reports

### Before This Change
If you clicked "Today" at 10pm on October 17:
- Would show: Oct 17 12am → Oct 17 10pm
- **Missing:** Oct 16 5pm → Oct 17 12am (part of current business day)

### After This Change
If you click "Today" at 10pm on October 17:
- Shows: Oct 16 5pm → Oct 17 5pm
- **Includes:** Complete current business day

---

## Time-Based Behavior

### Before 5pm
When viewing "Today" before 5pm:
- Shows: Yesterday 5pm → Today 5pm
- Includes: Complete previous night's operations

### After 5pm
When viewing "Today" after 5pm:
- Shows: Yesterday 5pm → Today 5pm
- Includes: All of today's operations so far

**Note:** The end time is fixed at 5pm, so after 5pm you'll need to use Custom Range to see ongoing operations, or wait for the next calendar day to use "Today" filter.

---

## User Training Notes

### Key Points to Communicate

1. **"Today" = Current 24-hour business cycle (5pm-5pm)**
   - Not the calendar day
   - Includes last night's operations

2. **Times are fixed at 5:00 PM**
   - Start: Always 5:00 PM
   - End: Always 5:00 PM
   - Consistent across all filters

3. **Calendar vs Business Day**
   - Calendar "October 17" = 12am to 11:59pm
   - Business "October 17" = Oct 16 at 5pm to Oct 17 at 5pm

4. **Custom Range Still Available**
   - For specific hours (e.g., 5pm to 9pm)
   - For non-standard periods
   - Defaults to current business day

---

## Testing Scenarios

### Test 1: Today Filter
**Date/Time:** October 17, 2025, 3:00 PM

**Expected:**
- Start: 2025-10-16T17:00:00
- End: 2025-10-17T17:00:00
- Shows complete business day including last night

### Test 2: Yesterday Filter
**Date/Time:** October 17, 2025, 3:00 PM

**Expected:**
- Start: 2025-10-15T17:00:00
- End: 2025-10-16T17:00:00
- Shows complete previous business day

### Test 3: Last 7 Days
**Date/Time:** October 17, 2025, 3:00 PM

**Expected:**
- Start: 2025-10-09T17:00:00
- End: 2025-10-17T17:00:00
- Shows 8 complete business days (7 past + current)

### Test 4: Midnight Transition
**Date/Time:** October 17, 2025, 12:30 AM (past midnight)

**Expected behavior for "Today":**
- Start: 2025-10-16T17:00:00
- End: 2025-10-17T17:00:00
- Correctly includes operations that started last evening

### Test 5: Revenue Comparison
**Scenario:** Staff reports ₱5,529 total sales for the night

**Before Fix:**
- "Today" might show ₱2,000 (missing evening hours)
- "Yesterday" might show ₱3,529 (other part of same night)

**After Fix:**
- "Today" shows ₱5,529 (complete business day)

---

## Timezone Considerations

- All times are in **Philippines local time (UTC+8)**
- No UTC conversion applied
- 5:00 PM means 17:00 local time
- Database queries use local datetime strings

---

## Rollback Plan

If this change causes issues:

1. Revert `DateRangeFilter.tsx`:
   - Change all `setHours(17, 0, 0, 0)` back to original midnight/11:59pm
   - Restore original date calculations

2. Revert `ReportsDashboard.tsx`:
   - Restore original useEffect initialization

3. Clear browser cache for affected users

---

## Future Considerations

### Potential Enhancements

1. **Dynamic Business Hours**
   - Allow configuring start time (currently hardcoded 5pm)
   - Support different hours for different days

2. **Business Day Calendar**
   - Visual calendar showing business days vs calendar days
   - Color coding for clarity

3. **Real-time Cutoff**
   - "Today" includes up to current time if after 5pm
   - Requires end time calculation logic change

---

## Related Documentation

- `CUSTOM_RANGE_DEFAULT_FIX.md` - Custom range defaults
- `REPORTS_MODULE_IMPROVEMENTS.md` - Overall improvements summary
- `CHART_TYPE_TOGGLE_FEATURE.md` - Bar/Line chart toggle

---

## Support FAQs

**Q: Why does "Today" show yesterday's date?**  
A: Because your business day starts at 5pm. "Today" means the current business day, which began yesterday evening.

**Q: Can I still view calendar days?**  
A: Yes, use Custom Range and set times to 12:00 AM and 11:59 PM.

**Q: What if operations sometimes start earlier/later?**  
A: Use Custom Range to specify exact times. The quick filters are standardized to 5pm.

**Q: Does this affect historical data?**  
A: No, the data itself hasn't changed. Only how we filter and display it.

---

## Version History

### v1.0.2 (October 17, 2025)
- ✅ All filters aligned to 5pm-5pm business day
- ✅ Today: 5pm yesterday → 5pm today
- ✅ Yesterday: 5pm 2 days ago → 5pm yesterday
- ✅ Last 7 Days: 5pm 8 days ago → 5pm today
- ✅ Last 30 Days: 5pm 31 days ago → 5pm today
- ✅ Custom Range: Defaults to current business day

---

## Summary

This change ensures that all report date ranges accurately reflect your business operations that run from 5:00 PM to 5:00 PM. Sales, revenue, and performance metrics now align with how you actually operate, making reports more intuitive and decision-making more accurate.
