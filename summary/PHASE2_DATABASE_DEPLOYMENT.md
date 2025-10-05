# Phase 2: Database Deployment Guide

## Overview

Phase 2 focuses on deploying the database schema to Supabase and setting up TypeScript types. Most of the code structure was already created in Phase 1, so this phase is primarily about executing the database migration.

## Prerequisites

Before starting Phase 2, ensure you have completed:
- ✅ Phase 1.1 - Project initialization
- ✅ Phase 1.2 - Supabase project created
- ✅ Environment variables configured in `.env.local`

## Phase 2.1: Database Deployment

### Step 1: Access Supabase SQL Editor

1. Log in to your Supabase dashboard
2. Select your `beerhive-pos` project
3. Click **SQL Editor** in the left sidebar
4. Click **New query** button

### Step 2: Execute Database Migration

1. Open `docs/Database Structure.sql` in your code editor
2. Copy the **entire file** (916 lines)
3. Paste into the Supabase SQL Editor
4. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
5. Wait for execution to complete (~10-30 seconds)

**What this creates**:
- ✅ 7 ENUM types (user_role, customer_tier, order_status, etc.)
- ✅ 24 database tables (users, customers, products, orders, etc.)
- ✅ 40+ indexes for query performance
- ✅ Triggers for automatic timestamp updates
- ✅ Row Level Security (RLS) policies
- ✅ 2 useful views for reporting
- ✅ Default admin user (username: admin, password: admin123)
- ✅ System settings with defaults

### Step 3: Verify Database Creation

**Option A: Use Verification Script**

1. Open `scripts/verify-database.sql`
2. Copy entire contents
3. Paste in Supabase SQL Editor (new query)
4. Run the script
5. Check that all results show ✅ PASS

**Option B: Manual Verification**

1. Go to **Table Editor** in Supabase
2. Verify you see all these tables:
   - users
   - customers
   - restaurant_tables
   - products
   - product_categories
   - product_addons
   - packages
   - package_items
   - orders
   - order_items
   - order_item_addons
   - kitchen_orders
   - split_payments
   - happy_hour_pricing
   - happy_hour_products
   - customer_events
   - inventory_movements
   - suppliers
   - product_suppliers
   - purchase_orders
   - purchase_order_items
   - discounts
   - price_history
   - audit_logs
   - system_settings

3. Click on any table to verify its structure

### Step 4: Seed Sample Data (Optional)

For testing and development, you can load sample data:

1. Open `scripts/seed-sample-data.sql`
2. Copy entire contents
3. Paste in Supabase SQL Editor (new query)
4. Run the script
5. Verify success message

**Sample data includes**:
- 5 product categories
- 17 products (beers, cocktails, food, appetizers)
- 10 restaurant tables
- 5 sample customers (various VIP tiers)
- 2 happy hour promotions
- 2 VIP packages

### Step 5: Verify RLS Policies

1. Go to **Authentication** → **Policies** in Supabase
2. Select a table (e.g., `orders`)
3. Verify policies exist
4. Check that RLS is enabled (toggle should be ON)

**Key policies to verify**:
- `users` - Users can view their own data, admins manage all
- `customers` - Staff can view and manage
- `products` - All authenticated can view, managers modify
- `orders` - Staff can view all, cashiers create/update
- `kitchen_orders` - Kitchen staff can update status

## Phase 2.2: TypeScript Types Generation

### Step 1: Choose Your Method

You have two options to generate types:

#### **Option A: Using npx (Recommended - No Installation)**

The simplest method, uses npx directly:

```bash
# Navigate to project root
cd d:\Projects\beerhive-sales-system

# Generate types (replace YOUR_PROJECT_REF with your actual project reference ID)
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/models/database.types.ts
```

**Finding your project reference ID**:
1. Go to Supabase dashboard
2. Click **Settings** → **General**
3. Copy the **Reference ID** (e.g., `abcdefghijklmnop`)

**Example**:
```bash
npx supabase gen types typescript --project-id abcdefghijklmnop > src/models/database.types.ts
```

#### **Option B: Install Supabase CLI (Windows)**

If you want the CLI installed permanently:

**Using Scoop** (Recommended):
```powershell
# Install Scoop first (if not installed)
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

**Then use the CLI**:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase gen types typescript --linked > src/models/database.types.ts
```

### Step 2: Verify Types Generated

This replaces the placeholder file with actual types from your database schema.

### Step 5: Verify Types Generated

Open `src/models/database.types.ts` and verify:
- File is not empty (should be 500+ lines)
- Contains `Database` interface
- Has `public` schema with `Tables` object
- Lists all your tables (users, customers, products, etc.)

**Example of what you should see**:
```typescript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          // ... more fields
        }
        Insert: { ... }
        Update: { ... }
      }
      // ... more tables
    }
  }
}
```

### Step 6: Verify Entity Models

The following entity models were already created in Phase 1 and are ready to use:

**Core Entities** (✅ Already Created):
- `User.ts` - System users with role-based access
- `Customer.ts` - Customer profiles with VIP tiers
- `Product.ts` - Product catalog with pricing
- `Order.ts` - Order transactions and items
- `Table.ts` - Restaurant table management
- `KitchenOrder.ts` - Kitchen/bartender routing

**Additional Entities** (✅ Created in Phase 2):
- `HappyHour.ts` - Happy hour pricing rules
- `CustomerEvent.ts` - Birthday/anniversary offers
- `Category.ts` - Product categories
- `Package.ts` - VIP packages and bundles
- `InventoryMovement.ts` - Stock tracking
- `Supplier.ts` - Supplier management
- `PurchaseOrder.ts` - Purchase order management

**Enums** (✅ Already Created):
- `UserRole.ts`
- `OrderStatus.ts`
- `TableStatus.ts`
- `KitchenOrderStatus.ts`
- `EventType.ts`
- `PaymentMethod.ts`
- `CustomerTier.ts`

**DTOs** (✅ Already Created):
- `CreateOrderDTO.ts`
- `CreateProductDTO.ts`
- `CreateCustomerDTO.ts`
- `PaymentDTO.ts`

## Testing Database Connection

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Test Supabase Connection

Create a test file: `src/app/api/test-db/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .limit(5);

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Database connection successful!' 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
```

### Step 3: Test the Endpoint

Open in browser: `http://localhost:3000/api/test-db`

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "key": "business_name",
      "value": "BeerHive PUB",
      // ... more settings
    }
  ],
  "message": "Database connection successful!"
}
```

## Verification Checklist

Before proceeding to Phase 3, verify:

- [ ] Database migration executed successfully
- [ ] All 24+ tables visible in Supabase Table Editor
- [ ] Verification script shows all ✅ PASS results
- [ ] RLS policies are enabled and active
- [ ] Sample data loaded (optional)
- [ ] TypeScript types generated successfully
- [ ] `src/models/database.types.ts` contains actual schema types
- [ ] All entity models exist in `src/models/entities/`
- [ ] All enums exist in `src/models/enums/`
- [ ] All DTOs exist in `src/models/dtos/`
- [ ] Development server starts without errors
- [ ] Test API endpoint returns successful response

## Troubleshooting

### Issue: SQL execution fails

**Solution**:
- Ensure you copied the entire SQL file
- Try running in smaller chunks (create enums first, then tables)
- Check for any syntax errors in the SQL editor

### Issue: Types generation fails

**Solution**:
```bash
# Re-login
supabase login

# Verify project link
supabase projects list

# Try with explicit project ref
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/models/database.types.ts
```

### Issue: "Cannot find module" errors

**Solution**:
```bash
# Install dependencies
npm install

# Restart dev server
npm run dev
```

### Issue: Test endpoint returns 500 error

**Solution**:
- Verify `.env.local` has correct credentials
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set
- Restart dev server after changing env variables

## Default Admin Credentials

After migration, you can test login with:

```
Username: admin
Email: admin@beerhive.com
Password: admin123
```

⚠️ **IMPORTANT**: Change this password immediately after first login!

## Next Steps

Once Phase 2 is complete:

✅ **Phase 2 Complete!** - Database and types ready
🚀 **Ready for Phase 3** - Authentication & Infrastructure

Refer to `docs/IMPLEMENTATION_GUIDE.md` for Phase 3 tasks.

---

**Phase 2 Status**: Ready for execution  
**Estimated Time**: 15-25 minutes  
**Prerequisites**: Phase 1 complete, Supabase project created
