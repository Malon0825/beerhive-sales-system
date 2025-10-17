# Custom Range Default Time Fix

**Date:** October 17, 2025  
**Version:** 1.0.2  
**Module:** Reports Dashboard  
**Issue:** Custom Range filter needed to default to business hours (6pm previous day to 5am current day)

---

## Problem

The reports module's Custom Range filter required users to manually select dates and times each time. For a business operating from evening to early morning (6pm-5am), users needed a quick way to view the current business day's revenue.

---

## Solution

Modified the `DateRangeFilter` component to automatically set the custom range to:
- **Start:** 6:00 PM (18:00) of the previous day
- **End:** 5:00 AM (05:00) of the current day

### Changes Made

#### File: `src/views/reports/DateRangeFilter.tsx`

1. **Moved `formatLocalDateTime` function** to the top of `handlePeriodChange` for reusability
2. **Updated the 'custom' case** to set default business hours:
   ```typescript
   case 'custom':
     // Default custom range: 6pm yesterday to 5am today
     start = new Date();
     start.setDate(start.getDate() - 1);
     start.setHours(18, 0, 0, 0); // 6pm yesterday
     end = new Date();
     end.setHours(5, 0, 0, 0); // 5am today
   ```

3. **Auto-populate date/time fields** when Custom Range button is clicked
4. **Auto-apply the range** immediately so data loads without requiring "Apply" button click

---

## Usage

1. Navigate to **Reports & Analytics** dashboard
2. Click **"Custom Range"** button
3. The system automatically:
   - Sets start date/time to 6:00 PM yesterday
   - Sets end date/time to 5:00 AM today
   - Loads the report data immediately
4. Users can still adjust the dates/times manually if needed

---

## Technical Details

### Default Time Range Logic

```typescript
// Start: Yesterday at 6pm
start = new Date();
start.setDate(start.getDate() - 1);
start.setHours(18, 0, 0, 0);

// End: Today at 5am
end = new Date();
end.setHours(5, 0, 0, 0);
```

### Date Format
- **Local datetime format:** `YYYY-MM-DDTHH:mm:ss`
- **No UTC conversion** - preserves Philippines timezone (UTC+8)

---

## SQL Query Example

For October 17, 2025, the custom range would query:

```sql
-- Start: 2025-10-16 18:00:00 (6pm Oct 16)
-- End:   2025-10-17 05:00:00 (5am Oct 17)

SELECT 
  COALESCE(
    (SELECT SUM(total_amount) 
     FROM orders 
     WHERE session_id IS NULL 
       AND completed_at >= '2025-10-16T18:00:00' 
       AND completed_at <= '2025-10-17T05:00:00' 
       AND status = 'completed'),
    0
  ) +
  COALESCE(
    (SELECT SUM(total_amount) 
     FROM order_sessions 
     WHERE status = 'closed' 
       AND closed_at >= '2025-10-16T18:00:00' 
       AND closed_at <= '2025-10-17T05:00:00'),
    0
  ) as total_revenue;
```

---

## Benefits

1. **Faster workflow** - One click to view current business day revenue
2. **Accurate business day reporting** - Aligns with actual operating hours (6pm-5am)
3. **User-friendly** - Pre-populated values can still be customized
4. **Timezone-aware** - Uses local time (Philippines UTC+8)

---

## Testing

### Test Cases

1. ✅ Click "Custom Range" button
   - Verify start date = yesterday
   - Verify start time = 18:00 (6pm)
   - Verify end date = today
   - Verify end time = 05:00 (5am)

2. ✅ Data loads automatically without clicking "Apply"

3. ✅ User can modify dates/times and click "Apply Custom Range" to update

4. ✅ Revenue calculation matches the time range

---

## Related Files

- `src/views/reports/DateRangeFilter.tsx` - Date filter component
- `src/views/reports/ReportsDashboard.tsx` - Main reports dashboard
- `src/data/queries/reports.queries.ts` - Revenue SQL queries

---

## Impact

- **User Experience:** Improved - faster access to business day reports
- **Performance:** No impact - same query execution
- **Data Accuracy:** Improved - aligns with business hours
