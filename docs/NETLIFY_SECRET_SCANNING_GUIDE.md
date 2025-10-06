# Netlify Secret Scanning Guide

**Issue:** Netlify's secret scanning detected potential secrets in your build  
**Status:** ℹ️ Informational - Usually safe if properly configured

---

## Understanding Netlify Secret Scanning

### What Is It?

Netlify automatically scans all builds for potential secrets (API keys, tokens, passwords) to prevent accidental exposure. This is a **security feature** designed to protect you.

### Why It Triggers

The scanner looks for patterns that resemble:
- JWT tokens (`eyJ...`)
- API keys (long alphanumeric strings)
- Private keys
- OAuth tokens
- Database connection strings

---

## Common Causes in BeerHive POS

### 1. Example Files ✅ SAFE

**Files that may trigger scanner:**
- `.env.netlify.example` - Contains placeholder values
- `docs/*.md` - Documentation with example credentials
- `README.md` - Setup instructions

**Why it's safe:**
- These are **example values**, not real secrets
- They're clearly marked as placeholders
- Real secrets are in Netlify environment variables (not in code)

### 2. Build Output ⚠️ CHECK

**What to verify:**
- Environment variables with `NEXT_PUBLIC_` prefix are bundled into client code (expected)
- `SUPABASE_SERVICE_ROLE_KEY` should NOT appear in client bundle
- Check build logs for any exposed secrets

**How to verify:**
```bash
# After build, check the client bundle
grep -r "SUPABASE_SERVICE_ROLE_KEY" .next/static/
# Should return no results or only in server chunks
```

---

## How We've Fixed It

### 1. Updated Placeholder Values

**File:** `.env.netlify.example`

```bash
# ❌ Before (triggers scanner)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# ✅ After (scanner-friendly)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
```

### 2. Added `.netlifyignore`

Created `.netlifyignore` to exclude documentation and example files from the build:

```
# Exclude documentation
*.md
!README.md
docs/
summary/

# Exclude example files
*.example
*.template
```

### 3. Updated `.gitignore`

Added Netlify-specific entries:

```gitignore
# netlify
.netlify
```

---

## Verifying Your Secrets Are Safe

### ✅ Checklist

Run through this checklist to ensure your deployment is secure:

#### Environment Variables
- [ ] All secrets are in **Netlify Dashboard** → **Environment Variables**
- [ ] No `.env` or `.env.local` files committed to Git
- [ ] No hardcoded secrets in source code
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is NOT prefixed with `NEXT_PUBLIC_`

#### Code Review
- [ ] Search codebase for any hardcoded credentials:
  ```bash
  grep -r "eyJ" src/
  grep -r "supabase.*key.*=" src/
  grep -r "password.*=" src/
  ```
- [ ] All API calls use environment variables
- [ ] Server-side code uses `process.env.SUPABASE_SERVICE_ROLE_KEY`
- [ ] Client-side code only uses `NEXT_PUBLIC_` variables

#### Build Output
- [ ] Check `.next/static/` doesn't contain service role key
- [ ] Verify no secrets in build logs
- [ ] Test that API routes work (secrets loaded correctly)

---

## What To Do If Scanner Triggers

### Step 1: Identify What Triggered It

Netlify's error message will show which file or pattern triggered the scanner. Common patterns:

```
Secrets scanning found secrets in build.
Pattern: JWT token
File: .env.netlify.example
```

### Step 2: Determine If It's Safe

**Safe scenarios:**
- Example/template files (`.example`, `.template`)
- Documentation files (`.md`, `README`)
- Placeholder values clearly marked as fake
- Test data in development files

**Unsafe scenarios:**
- Real API keys in source code
- Actual credentials in committed files
- Production secrets in build logs
- Service role key in client bundle

### Step 3: Take Action

#### If Safe (False Positive):

**Option A: Ignore the Warning**
- If you've verified the secrets are fake/examples, you can proceed
- Netlify will still deploy (it's just a warning)

**Option B: Exclude Files**
- Add triggering files to `.netlifyignore`
- Update placeholder values to be more obviously fake

**Option C: Disable Secret Scanning** (Not Recommended)
- Contact Netlify support to disable (requires Business plan)
- Only do this if you're 100% certain it's safe

#### If Unsafe (Real Secret Exposed):

**Immediate Actions:**
1. **DO NOT deploy** - cancel the build
2. **Rotate the exposed secret immediately:**
   - Supabase: Dashboard → Settings → API → Reset keys
3. **Remove secret from code:**
   - Delete the file from Git history
   - Use `git filter-branch` or BFG Repo-Cleaner
4. **Move to environment variables:**
   - Add to Netlify Dashboard → Environment Variables
   - Reference in code via `process.env.SECRET_NAME`
5. **Update Supabase RLS policies** if service role key was exposed
6. **Review audit logs** for any unauthorized access

---

## Best Practices

### 1. Never Commit Secrets

```bash
# ❌ Bad
const apiKey = "sk_live_1234567890abcdef";

# ✅ Good
const apiKey = process.env.SECRET_API_KEY;
```

### 2. Use Environment Variables

**In Netlify:**
- Dashboard → Site Settings → Environment Variables
- Add all secrets here, not in code

**In Next.js:**
- Server-side: `process.env.SECRET_NAME`
- Client-side: `process.env.NEXT_PUBLIC_VAR_NAME`

### 3. Separate Public and Private

```typescript
// ✅ Safe to expose (prefixed with NEXT_PUBLIC_)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 🔒 Server-only (NO NEXT_PUBLIC_ prefix)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

### 4. Use Example Files Correctly

**File naming:**
- ✅ `.env.example` - Committed to Git
- ❌ `.env` - Never commit (in `.gitignore`)

**Content:**
```bash
# .env.example
SUPABASE_URL=your-supabase-url-here
API_KEY=your-api-key-here

# NOT real values:
# ❌ SUPABASE_URL=https://abc123.supabase.co
# ❌ API_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 5. Review Before Committing

**Pre-commit checklist:**
```bash
# Check for common secret patterns
git diff --staged | grep -i "key"
git diff --staged | grep -i "secret"
git diff --staged | grep -i "password"

# Use git-secrets (optional tool)
git secrets --scan
```

---

## Debugging Secret Exposure

### Check Build Logs

1. Go to Netlify Dashboard → Deploys
2. Click on failed/warning deploy
3. Review "Deploy log"
4. Search for:
   - Your actual Supabase project ID
   - Part of your service role key
   - Any credentials

### Check Client Bundle

After local build:

```bash
# Build locally
npm run build

# Search for secrets in client code
cd .next
grep -r "your-actual-project-id" static/
grep -r "service.role.key" static/

# If found in static/, you have a leak!
```

### Use Next.js Bundle Analyzer

Add to `package.json`:
```json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  },
  "devDependencies": {
    "@next/bundle-analyzer": "^15.0.0"
  }
}
```

Then:
```bash
npm install @next/bundle-analyzer
npm run analyze
```

Review the bundle to ensure no secrets are included.

---

## Environment Variable Security

### Server-Side Variables (Secure)

**How they work:**
- Only available during build and server-side execution
- NOT included in client JavaScript bundle
- Can access via API routes, Server Components, middleware

**Example:**
```typescript
// app/api/admin/route.ts
export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ✅ Secure
  // This runs on server, key never sent to client
}
```

### Client-Side Variables (Public)

**How they work:**
- Must be prefixed with `NEXT_PUBLIC_`
- Included in JavaScript bundle sent to browser
- Anyone can see these values (inspect element)

**Example:**
```typescript
// app/login/page.tsx
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; // ⚠️ Public
// This is OK - anon key is meant to be public
```

### Common Mistake

```typescript
// ❌ WRONG - This leaks the service key to client!
// components/SomeClientComponent.tsx
'use client';

const BadComponent = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // 🚨 DANGER!
  // Even without NEXT_PUBLIC_, this gets bundled if in client component
};

// ✅ RIGHT - Use API route
// app/api/secure-action/route.ts
export async function POST() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // ✅ Safe
  // Server-only code
}
```

---

## Testing Your Configuration

### Manual Test

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Search for secrets:**
   ```bash
   # Should return nothing
   grep -r "REPLACE_WITH_YOUR_ACTUAL_KEY" .next/

   # Should only appear in server chunks
   grep -r "SUPABASE_SERVICE_ROLE_KEY" .next/server/
   ```

3. **Check environment variables in browser:**
   - Open DevTools → Console
   - Type: `console.log(process.env)`
   - Verify service role key is NOT there

### Automated Test

Create a test script:

```typescript
// scripts/check-secrets.ts
/**
 * Checks that sensitive environment variables are not exposed in client bundle
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const FORBIDDEN_PATTERNS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'PRIVATE_KEY',
];

const checkDirectory = (dir: string) => {
  const files = readdirSync(dir, { recursive: true });
  
  for (const file of files) {
    if (file.endsWith('.js')) {
      const content = readFileSync(join(dir, file), 'utf-8');
      
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (content.includes(pattern)) {
          console.error(`❌ Found ${pattern} in ${file}`);
          process.exit(1);
        }
      }
    }
  }
};

checkDirectory('.next/static');
console.log('✅ No secrets found in client bundle');
```

Run after build:
```bash
npm run build
npx tsx scripts/check-secrets.ts
```

---

## FAQ

### Q: Is the warning blocking my deployment?

**A:** No, it's informational. Netlify will still deploy, but you should investigate.

### Q: I'm sure my example files are safe. Can I ignore the warning?

**A:** Yes, if you've verified:
1. The files are `.example` or documentation
2. No real secrets are committed
3. All production secrets are in Netlify environment variables

### Q: How do I remove secrets from Git history?

**A:** Use BFG Repo-Cleaner:
```bash
# Install BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Remove secrets
bfg --replace-text passwords.txt  # List of secrets to remove
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

### Q: What if I accidentally deployed with a real secret?

**A:** Follow the "Unsafe" procedure above:
1. Stop/rollback deployment immediately
2. Rotate all exposed secrets
3. Remove from Git history
4. Monitor for unauthorized access

---

## Conclusion

Netlify's secret scanning is a helpful security feature. In most cases for BeerHive POS, the warnings are triggered by example files and documentation, which is safe.

**Key Takeaways:**
- ✅ Example files with placeholder values are safe
- ✅ Environment variables in Netlify Dashboard are secure
- ✅ Client-side variables (`NEXT_PUBLIC_`) are meant to be public
- ❌ Never commit real secrets to Git
- ❌ Service role key should never reach the client

**Status:** The placeholder values have been updated to be more obviously fake, and `.netlifyignore` has been configured to reduce false positives.

---

**Last Updated:** 2025-10-06  
**Deployment Status:** ✅ Safe to deploy
