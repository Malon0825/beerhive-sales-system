# Create Test Users - Quick Guide

## Option 1: Using PowerShell (Recommended for Windows)

Open PowerShell and run these commands to create test users:

### Create Admin User
```powershell
$body = @{
    username = "admin"
    email = "admin@beerhive.com"
    password = "Admin123!"
    full_name = "System Administrator"
    role = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $body -ContentType "application/json"
```

### Create Manager User
```powershell
$body = @{
    username = "manager"
    email = "manager@beerhive.com"
    password = "Manager123!"
    full_name = "Store Manager"
    role = "manager"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $body -ContentType "application/json"
```

### Create Cashier User
```powershell
$body = @{
    username = "cashier"
    email = "cashier@beerhive.com"
    password = "Cashier123!"
    full_name = "John Cashier"
    role = "cashier"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $body -ContentType "application/json"
```

### Create Kitchen Staff
```powershell
$body = @{
    username = "kitchen"
    email = "kitchen@beerhive.com"
    password = "Kitchen123!"
    full_name = "Kitchen Staff"
    role = "kitchen"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/users" -Method POST -Body $body -ContentType "application/json"
```

### Create Bartender
```powershell
$body = @{
    username = "bartender"
    email = "bartender@beerhive.com"
    password = "Bartender123!"
    full_name = "Bar Tender"
    role = "bartender"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $body -ContentType "application/json"
```

### Create Waiter
```powershell
$body = @{
    username = "waiter"
    email = "waiter@beerhive.com"
    password = "Waiter123!"
    full_name = "John Server"
    role = "waiter"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $body -ContentType "application/json"
```

---

## Option 2: Using Node Script

Run the automated script:

```bash
node scripts/create-test-user.js
```

---

## Option 3: Direct Supabase SQL

If API isn't working, run this SQL in your Supabase SQL Editor:

```sql
-- Note: You'll need to create these users in Supabase Auth first, then insert into users table
-- For now, use Option 1 or 2 which handles both Auth and database table automatically
```

---

## Test User Credentials

After creating users, login with these credentials:

| Username | Password | Role | Access Level |
|----------|----------|------|--------------|
| `admin` | `Admin123!` | Admin | Full system access |
| `manager` | `Manager123!` | Manager | Reports, inventory, orders |
| `cashier` | `Cashier123!` | Cashier | POS, customers, tables |
| `kitchen` | `Kitchen123!` | Kitchen | Kitchen display only |
| `bartender` | `Bartender123!` | Bartender | Bartender display only |
| `waiter` | `Waiter123!` | Waiter | Waiter display - ready orders |

---

## Prerequisites

1. ✅ Next.js dev server running (`npm run dev`)
2. ✅ Supabase project configured
3. ✅ Environment variables set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## Troubleshooting

### Error: "Failed to create user"
- Check that your Supabase project is running
- Verify environment variables in `.env.local`
- Check Supabase service role key has admin permissions

### Error: "User already exists"
- User was already created - try logging in directly
- Or use a different username/email

### Error: Connection refused
- Make sure Next.js dev server is running: `npm run dev`
- Check server is on port 3000

---

## Testing Login

After creating users, test the login:

1. Navigate to `http://localhost:3000/login`
2. Enter credentials (e.g., admin / Admin123!)
3. You should be redirected to the dashboard

### Test Each Role:

**Admin** - Can access:
- `/` - Dashboard
- `/pos` - Point of Sale
- `/kitchen` - Kitchen Display
- `/bartender` - Bartender Display
- `/settings/users` - User Management (once frontend is built)

**Cashier** - Can access:
- `/pos` - Point of Sale
- `/customers` - Customer Management
- `/tables` - Table Management

**Kitchen** - Can access:
- `/kitchen` - Kitchen Display

**Bartender** - Can access:
- `/bartender` - Bartender Display

---

## Next Steps

Once logged in, you can:

1. **Test POS Features** - Navigate to `/pos` and try creating orders
2. **Test Kitchen Display** - Navigate to `/kitchen` to see routed orders
3. **Test Bartender Display** - Navigate to `/bartender` for beverage orders
4. **Create More Users** - Use user management when frontend is built

---

Happy Testing! 🍺
