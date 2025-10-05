# Fix: Restart Development Server

## The Problem
You're experiencing an import error:
```
Attempted import error: 'Notification' is not exported from '@/models/entities/Notification' (imported as 'Notification').
```

This is a **Next.js build cache issue**. The export exists, but the build cache is stale.

---

## Solution: Restart Dev Server

### Step 1: Stop the Server
Press `Ctrl + C` in your terminal to stop the development server.

### Step 2: Clear Build Cache
Run this command to delete the `.next` folder:
```powershell
Remove-Item -Recurse -Force .next
```

Or on Linux/Mac:
```bash
rm -rf .next
```

### Step 3: Restart Server
```bash
npm run dev
```

---

## Alternative: Force Rebuild

If the above doesn't work, try:

```powershell
# Stop server (Ctrl+C)

# Clear all caches
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache

# Restart
npm run dev
```

---

## Verify the Fix

After restarting, check:
1. ✅ No import errors in terminal
2. ✅ Can access dashboard pages
3. ✅ No "Notification is not exported" errors

---

## Why This Happens

Next.js caches compiled files in the `.next` folder. When you:
- Add/modify exports
- Change TypeScript interfaces
- Update imports

The cache can become stale, causing "module not found" or "not exported" errors even when the export exists.

**Solution:** Always clear `.next` folder when you encounter import errors after making changes.
