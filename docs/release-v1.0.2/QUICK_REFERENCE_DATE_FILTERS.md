# Quick Reference: Date Filters (5pm - 5pm Business Day)

**⚡ Quick Guide for Users**

---

## Business Day = 5pm to 5pm Next Day

Your business operates from **5:00 PM** to **5:00 PM** the next calendar day.  
All report filters now match this schedule.

---

## Filter Reference (Example: October 17, 2025)

### 📅 Today
**Shows:** Current business day  
**Time Range:** Oct 16 at 5pm → Oct 17 at 5pm  
**Includes:** Last night + today until 5pm

### 📅 Yesterday
**Shows:** Previous business day  
**Time Range:** Oct 15 at 5pm → Oct 16 at 5pm  
**Includes:** Complete previous business shift

### 📅 Last 7 Days
**Shows:** 7 complete business days  
**Time Range:** Oct 9 at 5pm → Oct 17 at 5pm  
**Includes:** 8 days worth of 5pm cutoffs

### 📅 Last 30 Days
**Shows:** 30 complete business days  
**Time Range:** Sept 16 at 5pm → Oct 17 at 5pm  
**Includes:** 31 days worth of 5pm cutoffs

### 📅 Custom Range
**Default:** Oct 16 at 5pm → Oct 17 at 5pm  
**Can modify:** Any date/time you want

---

## Visual Timeline

```
Calendar Days:           [Oct 16        |        Oct 17        ]
                         12am        11:59pm  12am        11:59pm

Business Day "Oct 17":   [--------|================|----------]
                              5pm                    5pm
                           (Oct 16)               (Oct 17)
                           
What "Today" shows:      [========================]
                         Complete business shift
```

---

## Key Points

✅ **"Today"** = Complete 24-hour shift (5pm-5pm)  
✅ **All times** = 5:00 PM sharp  
✅ **Includes overnight** = Last night's operations included  
✅ **Still customizable** = Use Custom Range for specific times  

---

## Example: Staff Report vs System

**Staff reports:** "We made ₱5,529 last night"

**Old System "Today" (at 10am):**
- Shows: Today 12am → 10am
- Result: ₱1,200 ❌ (missing most of shift)

**New System "Today" (at 10am):**
- Shows: Yesterday 5pm → Today 5pm
- Result: ₱5,529 ✅ (complete shift)

---

## When to Use Each Filter

| Filter | Use Case |
|--------|----------|
| **Today** | Check current shift performance |
| **Yesterday** | Review previous shift |
| **Last 7 Days** | Weekly performance trends |
| **Last 30 Days** | Monthly analysis |
| **Custom Range** | Specific hours (e.g., 5pm-9pm) |

---

## Important Notes

⚠️ **After 5pm:** "Today" still shows 5pm-5pm (current shift complete)  
⚠️ **Before 5pm:** "Today" includes last night (current shift in progress)  
⚠️ **Custom times:** Use Custom Range for non-standard periods  

---

## Need Help?

- See full documentation: `BUSINESS_HOURS_ALIGNMENT.md`
- For technical details: `REPORTS_MODULE_IMPROVEMENTS.md`
