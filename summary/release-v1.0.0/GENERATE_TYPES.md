# Generate TypeScript Types from Supabase

## Quick Command (Recommended)

**No installation needed!** Just use npx:

```bash
# Make sure you're in the project root directory
cd d:\Projects\beerhive-sales-system

# Replace YOUR_PROJECT_REF with your actual Supabase project reference ID
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/models/database.types.ts
```

## Get Your Project Reference ID

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon in sidebar)
3. Click **General** tab
4. Find **Reference ID** under "General settings"
5. Copy the ID (looks like: `abcdefghijklmnop`)

## Example

If your project reference ID is `xyzabc123456`:

```bash
npx supabase gen types typescript --project-id xyzabc123456 > src/models/database.types.ts
```

## Verify Success

After running the command:

1. Open `src/models/database.types.ts`
2. File should be 500+ lines
3. Should start with `export type Json = ...`
4. Should contain `export interface Database`
5. Should list all your tables under `Tables`

**Example of what you should see**:

```typescript
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          email: string
          // ... more fields
        }
        Insert: { ... }
        Update: { ... }
      }
      customers: {
        // ... customer fields
      }
      products: {
        // ... product fields
      }
      // ... more tables
    }
  }
}
```

## If You Get an Error

### Error: "Project not found"
- Double-check your project reference ID
- Make sure you copied the full ID
- Try accessing your Supabase dashboard to verify the project exists

### Error: "Unauthorized"
- The project reference ID might be wrong
- Try using the direct API endpoint method (see below)

### Error: "Command not found"
- Make sure you have Node.js installed
- Try closing and reopening your terminal
- Make sure you're in the project root directory

## Alternative: Using Supabase REST API

If npx doesn't work, you can also generate types by:

1. Getting your database schema from Supabase
2. Using the online TypeScript generator at: https://supabase.com/docs/guides/api/generating-types

## Do I Need to Run This Again?

**Run this command again when**:
- You add new tables to your database
- You modify existing table structures
- You add/remove columns
- You change column types

**You don't need to run it again when**:
- You add data (rows) to tables
- You're just developing the frontend
- No database schema changes

## Troubleshooting

### Issue: File is empty or very small
**Solution**: 
- Check that database migration ran successfully
- Verify tables exist in Supabase Table Editor
- Make sure project reference ID is correct

### Issue: "ENOENT: no such file or directory"
**Solution**:
```bash
# Make sure the src/models directory exists
mkdir -p src/models

# Then run the command again
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/models/database.types.ts
```

### Issue: Types are outdated
**Solution**:
Just run the command again to regenerate:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/models/database.types.ts
```

## Next Steps

After generating types successfully:

1. ✅ Restart your development server: `npm run dev`
2. ✅ Test database connection: `http://localhost:3000/api/test-db`
3. ✅ Verify no TypeScript errors in your IDE
4. ✅ You're ready for Phase 3!

---

**Quick Reference**:
```bash
# The one command you need:
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/models/database.types.ts
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference ID.
