# Supabase Setup Guide - Phase 1.2

This guide walks you through setting up Supabase for the BeerHive POS system.

## Step 1: Create Supabase Project

### 1.1 Sign Up / Sign In
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign In"
3. Sign in with GitHub, GitLab, or email

### 1.2 Create New Project
1. Click "New Project" button
2. Fill in the project details:
   - **Name**: `beerhive-pos` (or your preferred name)
   - **Database Password**: Choose a strong password (save this securely!)
   - **Region**: Select the closest region to your location for better performance
   - **Pricing Plan**: Free tier is sufficient for development

3. Click "Create new project"
4. Wait 2-3 minutes for the project to be provisioned

### 1.3 Get Your API Keys
1. Once the project is ready, go to **Settings** → **API**
2. You'll see the following credentials:

   **Project URL**:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **API Keys**:
   - `anon` `public` - Safe to use in browser
   - `service_role` `secret` - ⚠️ NEVER expose to browser, server-side only

3. Copy these values - you'll need them in the next step

## Step 2: Configure Environment Variables

### 2.1 Create .env.local File
```bash
cp .env.local.example .env.local
```

### 2.2 Add Your Credentials
Open `.env.local` and replace the placeholder values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key_here

# Application Configuration
NEXT_PUBLIC_APP_NAME=BeerHive POS
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **Security Notes**:
- Never commit `.env.local` to Git (already in `.gitignore`)
- The `service_role` key has admin privileges - keep it secret
- Only use `service_role` in server-side code, never in client components

## Step 3: Run Database Migrations

### 3.1 Open Supabase SQL Editor
1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query** button

### 3.2 Execute Migration Script
1. Open the file `docs/Database Structure.sql` in your code editor
2. Copy the **entire contents** (all 916 lines)
3. Paste into the Supabase SQL Editor
4. Click **Run** or press `Ctrl + Enter` (Windows) / `Cmd + Enter` (Mac)

### 3.3 Verify Success
You should see a success message. The script creates:
- ✅ 7 ENUM types
- ✅ 20+ tables
- ✅ Indexes for performance
- ✅ Triggers for timestamps
- ✅ Row Level Security policies
- ✅ Initial seed data (admin user, system settings)
- ✅ Useful views for reporting

### 3.4 Verify Tables Created
1. Go to **Table Editor** in the sidebar
2. You should see all these tables:
   - `users`
   - `customers`
   - `restaurant_tables`
   - `products`
   - `product_categories`
   - `product_addons`
   - `packages`
   - `package_items`
   - `orders`
   - `order_items`
   - `order_item_addons`
   - `kitchen_orders`
   - `split_payments`
   - `happy_hour_pricing`
   - `happy_hour_products`
   - `customer_events`
   - `inventory_movements`
   - `suppliers`
   - `product_suppliers`
   - `purchase_orders`
   - `purchase_order_items`
   - `discounts`
   - `price_history`
   - `audit_logs`
   - `system_settings`

## Step 4: Enable Row Level Security (RLS)

### 4.1 Verify RLS is Enabled
RLS should already be enabled by the migration script. To verify:

1. Go to **Authentication** → **Policies** in Supabase
2. Check that policies exist for key tables:
   - `users` - Users can view their own data, admins can manage all
   - `customers` - Staff can view and manage customers
   - `products` - All authenticated users can view, managers can modify
   - `orders` - Staff can view all orders, cashiers can create/update

### 4.2 Test RLS (Optional)
You can test RLS by:
1. Going to **SQL Editor**
2. Running test queries to ensure policies work correctly

**Example Test Query**:
```sql
-- This should work (viewing products)
SELECT * FROM products WHERE is_active = true LIMIT 5;

-- This should be restricted based on role
SELECT * FROM users;
```

### 4.3 Customize Policies (If Needed)
If you need to adjust policies:
1. Go to **Authentication** → **Policies**
2. Select the table
3. Edit the policy or create new ones

## Step 5: Configure Supabase Realtime

### 5.1 Enable Realtime for Key Tables
Realtime allows the app to receive live updates when data changes.

1. Go to **Database** → **Replication** in Supabase
2. Scroll to the **Supabase Realtime** section
3. Enable Realtime for these tables:
   - ✅ `orders` - For live order updates in POS
   - ✅ `kitchen_orders` - For kitchen/bartender displays
   - ✅ `restaurant_tables` - For live table status
   - ✅ `inventory_movements` - For inventory alerts
   - ✅ `products` - For product availability updates

4. Click the toggle switch next to each table to enable

### 5.2 Configure Realtime Settings (Optional)
Default settings should work, but you can customize:

**Realtime Broadcast**: 
- Allows broadcasting custom messages
- Default: Enabled

**Realtime Presence**:
- Track which users are online
- Default: Enabled

**Realtime Postgres Changes**:
- Listen to database changes (INSERT, UPDATE, DELETE)
- Default: Enabled

## Step 6: Generate TypeScript Types

### 6.1 Install Supabase CLI (if not installed)
```bash
npm install -g supabase
```

### 6.2 Login to Supabase
```bash
supabase login
```
This will open a browser for authentication.

### 6.3 Link Your Project
```bash
supabase link --project-ref xxxxxxxxxxxxx
```
Replace `xxxxxxxxxxxxx` with your project reference ID from **Settings** → **General** → **Reference ID**

### 6.4 Generate Types
```bash
npx supabase gen types typescript --linked > src/models/database.types.ts
```

This generates TypeScript types from your database schema, replacing the placeholder file.

### 6.5 Verify Types Generated
Open `src/models/database.types.ts` and verify it contains your database schema types.

## Step 7: Test the Connection

### 7.1 Start Development Server
```bash
npm run dev
```

### 7.2 Test Supabase Connection
The app should start without errors. Check the browser console for any Supabase connection issues.

### 7.3 Verify Environment Variables
If you see errors like "Missing Supabase environment variables":
1. Make sure `.env.local` exists and has the correct values
2. Restart the development server after changing `.env.local`
3. Check for typos in variable names

## Troubleshooting

### Error: "Invalid API key"
- Double-check that you copied the correct keys from Supabase dashboard
- Ensure no extra spaces in `.env.local`
- Verify the `NEXT_PUBLIC_SUPABASE_URL` format is correct

### Error: "Failed to execute SQL"
- Check that you copied the entire SQL file
- Make sure you're using the correct SQL Editor (not the RLS policy editor)
- Try running in smaller chunks if there's a timeout

### Realtime Not Working
- Verify Realtime is enabled for the specific tables
- Check that your Supabase plan includes Realtime (Free tier has limits)
- Ensure the client code is properly subscribed to channels

### Types Not Generated
- Make sure Supabase CLI is installed: `supabase --version`
- Verify you're logged in: `supabase projects list`
- Check that the project reference ID is correct

## Default Credentials

The migration script creates a default admin user:

**Username**: `admin`  
**Email**: `admin@beerhive.com`  
**Password**: `admin123` (change this immediately!)

⚠️ **Security**: Change the default password after first login!

## Next Steps

After completing Phase 1.2:
1. ✅ Verify all tables are created
2. ✅ Test Supabase connection
3. ✅ Generate TypeScript types
4. 🚀 Ready to proceed to Phase 2

## Useful Supabase Resources

- **Documentation**: https://supabase.com/docs
- **JavaScript Client**: https://supabase.com/docs/reference/javascript
- **Realtime**: https://supabase.com/docs/guides/realtime
- **RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **CLI**: https://supabase.com/docs/guides/cli

---

**Phase 1.2 Status**: Ready to execute  
**Estimated Time**: 15-20 minutes
