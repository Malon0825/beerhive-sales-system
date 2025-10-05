# Phase 2 Quick Start Guide

## ⚠️ Important: Manual Steps Required

Phase 2 requires you to manually execute SQL in your Supabase project. I've created all the code and documentation, but **you need to complete these steps yourself**.

## Prerequisites Checklist

Before starting Phase 2:
- [ ] Node.js installed (v18+)
- [ ] Dependencies installed (`npm install` completed)
- [ ] Supabase project created at https://supabase.com
- [ ] Environment variables set in `.env.local`

## Step-by-Step Completion

### ✅ Step 1: Install Dependencies (if not done)

```bash
npm install
```

**Expected Result**: No errors, all packages installed

---

### ✅ Step 2: Verify Environment Variables

Check that `.env.local` exists and contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**How to get these values**:
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy the values

---

### ✅ Step 3: Run Database Migration

**You must do this manually in Supabase:**

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New query**
4. Open `docs/Database Structure.sql` in your code editor
5. Copy **ALL 916 lines**
6. Paste into Supabase SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Wait for completion (~10-30 seconds)

**Expected Result**: 
```
Success. No rows returned
```

**If you get an error**:
- Make sure you copied the entire file
- Check for any copy/paste issues
- Try running in smaller sections

---

### ✅ Step 4: Verify Database

Run the verification script:

1. In Supabase SQL Editor, click **New query**
2. Open `scripts/verify-database.sql`
3. Copy entire contents
4. Paste and run

**Expected Results**:
```
✅ Tables Created: 24+ tables
✅ Enums Created: 7+ enums
✅ RLS Enabled: 5+ tables
✅ Triggers Created: 10+ triggers
✅ System Settings: 6 settings
✅ Admin User: 1 user
```

**If checks fail**, re-run the migration script.

---

### ✅ Step 5: Seed Sample Data (Optional but Recommended)

For testing purposes:

1. In Supabase SQL Editor, click **New query**
2. Open `scripts/seed-sample-data.sql`
3. Copy entire contents
4. Paste and run

**Expected Result**:
```
✅ Sample data seeded successfully!
```

**What this adds**:
- 17 products (beers, cocktails, food)
- 10 tables
- 5 customers
- 2 happy hour promotions
- 2 VIP packages

---

### ✅ Step 6: Generate TypeScript Types

You have **two options** to generate types:

#### **Option A: Using npx (Recommended - No Installation Required)**

This is the easiest method and doesn't require installing anything:

```bash
# Navigate to project root (not src folder)
cd d:\Projects\beerhive-sales-system

# Generate types using npx
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/models/database.types.ts
```

**Get your project ref**:
1. Go to your Supabase dashboard
2. Click **Settings** → **General**  
3. Copy **Reference ID** (e.g., `abcdefghijklmnop`)

**Example**:
```bash
npx supabase gen types typescript --project-id nqyaugvpcuebpdrjjuqx > src/models/database.types.ts
```

#### **Option B: Install Supabase CLI (Windows)**

If you want to install the CLI permanently:

**Using Scoop** (Recommended for Windows):
```powershell
# Install Scoop (if not installed)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Using Chocolatey**:
```powershell
choco install supabase
```

**After installing with Scoop/Chocolatey**:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase gen types typescript --linked > src/models/database.types.ts
```

**Expected Result**: `src/models/database.types.ts` is updated with your schema (500+ lines)

**Verify the file**:
- File should NOT be empty
- Should contain `export interface Database`
- Should have your table definitions

---

### ✅ Step 7: Start Development Server

```bash
npm run dev
```

**Expected Result**:
```
- ready started server on 0.0.0.0:3000
- Local: http://localhost:3000
```

---

### ✅ Step 8: Test Database Connection

**Open in browser**:
```
http://localhost:3000/api/test-db
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Database connection successful!",
  "checks": {
    "connection": "✅ Connected to Supabase",
    "settings": "✅ System settings table accessible",
    "tables": "✅ All core tables exist",
    "adminUser": "✅ Admin user exists: admin"
  },
  "recommendations": [
    "Database is ready!",
    "You can proceed to Phase 3"
  ]
}
```

**If you get errors**, check:
- Environment variables in `.env.local`
- Restart dev server after changing `.env.local`
- Database migration completed successfully

---

### ✅ Step 9: Test Health Endpoint

```
http://localhost:3000/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "message": "BeerHive POS API is running",
  "phase": "Phase 2 - Database Setup"
}
```

---

## Verification Checklist

Mark these as you complete them:

- [ ] Dependencies installed (`npm install` succeeded)
- [ ] `.env.local` file exists with Supabase credentials
- [ ] Database migration executed in Supabase
- [ ] Verification script shows all ✅ PASS
- [ ] Sample data loaded (optional)
- [ ] TypeScript types generated
- [ ] Dev server starts without errors
- [ ] `/api/health` returns healthy status
- [ ] `/api/test-db` returns success
- [ ] No errors in terminal or browser console

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution**:
1. Create `.env.local` file in project root
2. Add Supabase credentials
3. Restart dev server: `Ctrl+C`, then `npm run dev`

### Issue: "/api/test-db returns 500 error"

**Solution**:
1. Check database migration ran successfully
2. Verify environment variables are correct
3. Check Supabase project is active
4. Restart dev server

### Issue: "Cannot find module errors"

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Table does not exist"

**Solution**:
- Database migration not run yet
- Run `docs/Database Structure.sql` in Supabase SQL Editor
- Verify with `scripts/verify-database.sql`

## What Happens Next?

Once all checks pass:

✅ **Phase 2 Complete!**
- Database deployed and verified
- TypeScript types generated
- Connection tested
- Ready for Phase 3

🚀 **Next: Phase 3 - Authentication & Infrastructure**
- Login page
- Authentication service
- Protected routes
- Shared UI components

## Need Help?

**Documentation**:
- `docs/SUPABASE_SETUP_GUIDE.md` - Complete Supabase setup
- `docs/PHASE2_DATABASE_DEPLOYMENT.md` - Detailed deployment guide
- `PHASE2_SUMMARY.md` - What was built in Phase 2
- `docs/IMPLEMENTATION_GUIDE.md` - Full roadmap

**Test Endpoints**:
- `http://localhost:3000/api/health` - App health
- `http://localhost:3000/api/test-db` - Database connection

**Scripts**:
- `docs/Database Structure.sql` - Main migration
- `scripts/verify-database.sql` - Verification
- `scripts/seed-sample-data.sql` - Test data

---

**Status**: Ready for your action  
**Time Required**: ~15-20 minutes  
**Difficulty**: Easy (just copy/paste SQL)
