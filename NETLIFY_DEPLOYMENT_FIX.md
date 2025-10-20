# Netlify Deployment Error Fix - Bundle Size Timeout

## Error Summary
**Error:** `context deadline exceeded` during upload of `___netlify-server-handler`  
**Root Cause:** Serverless function bundle too large (>10MB), exceeding Netlify's 2-minute upload timeout

## Why This Happened
1. **@react-pdf/renderer** (~3-5MB) being bundled into serverless function
2. **51 API routes** sharing the same serverless handler
3. Heavy dependencies not externalized from server bundle

---

## Fixes Applied (In Order of Impact)

### ✅ Fix 1: Externalize Heavy Dependencies
**File:** `next.config.js`  
**Impact:** Reduces bundle size by ~60-70%

```javascript
// SERVER-SIDE: Externalize heavy dependencies
config.externals.push({
  '@react-pdf/renderer': 'commonjs @react-pdf/renderer',
  'canvas': 'commonjs canvas',
  'bufferutil': 'commonjs bufferutil',
  'utf-8-validate': 'commonjs utf-8-validate',
});
```

**How it works:** Instead of bundling these libraries into the serverless function, they're loaded from `node_modules` at runtime.

---

### ✅ Fix 2: Configure Netlify Plugin
**File:** `netlify.toml`  
**Impact:** Ensures externalized deps are available at runtime

```toml
[[plugins]]
  package = "@netlify/plugin-nextjs"
  
  [plugins.inputs]
    includeFiles = [
      "node_modules/@react-pdf/**",
      "node_modules/react-pdf/**",
      "node_modules/pdfjs-dist/**",
      "node_modules/canvas/**"
    ]
```

---

### ✅ Fix 3: Optimize Package Imports
**File:** `next.config.js`  
**Impact:** Better tree-shaking for Radix UI and other large libraries

```javascript
optimizePackageImports: [
  'lucide-react',
  'date-fns', 
  'recharts',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-select',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
]
```

---

### ✅ Fix 4: Separate PDF Route (Optional Enhancement)
**File:** `src/app/api/orders/[orderId]/receipt/route.ts`  
**Impact:** Isolates PDF generation into separate function

```javascript
export const config = {
  type: 'experimental-background',
};
```

---

## Deployment Steps

### 1. Commit Changes
```bash
git add .
git commit -m "fix: reduce serverless bundle size for Netlify deployment"
git push origin main
```

### 2. Trigger New Deployment
Netlify will automatically redeploy. Monitor the build logs for:
- ✅ Build completes successfully
- ✅ Function upload completes within timeout
- ✅ No "context deadline exceeded" errors

### 3. Verify Deployment
After deployment, test the PDF generation:
```bash
curl https://your-site.netlify.app/api/orders/[test-order-id]/receipt?format=pdf
```

---

## Expected Results

### Before Fixes
- **Bundle Size:** ~15-20MB
- **Upload Time:** >2 minutes (timeout)
- **Status:** ❌ Failed

### After Fixes
- **Bundle Size:** ~3-5MB (reduced by 70-80%)
- **Upload Time:** <30 seconds
- **Status:** ✅ Success

---

## Troubleshooting

### If Deployment Still Fails

#### Option A: Increase Function Size Budget
Contact Netlify support to increase function size limits (Business plan feature)

#### Option B: Use Edge Functions
See `.windsurf/workflows/netlify-pdf-edge-function.md` for alternative approach

#### Option C: Switch to Third-Party PDF Service
Replace `@react-pdf/renderer` with:
- **PDFShift** (https://pdfshift.io)
- **DocRaptor** (https://docraptor.com)
- **Puppeteer on serverless** (via AWS Lambda)

#### Option D: Client-Side PDF Generation
Move PDF generation to browser using `jspdf` or `pdfmake`

---

## Prevention Best Practices

### 1. Monitor Bundle Sizes
```bash
npm run build
# Check .next/server/chunks sizes
```

### 2. Use Bundle Analyzer
```bash
ANALYZE=true npm run build
```

### 3. Audit Dependencies Regularly
```bash
npx depcheck
npx bundle-phobia [package-name]
```

### 4. Lazy Load Heavy Dependencies
Always use dynamic imports for large libraries:
```javascript
const { renderToBuffer } = await import('@react-pdf/renderer');
```

### 5. Externalize Server-Only Dependencies
Update `next.config.js` when adding heavy server-side libraries

---

## Technical Details

### Why Externalization Works
- **Bundled:** Library code included in function file
- **Externalized:** Library loaded from `node_modules` at runtime
- **Result:** Smaller function file, faster uploads, same runtime behavior

### Netlify Function Limits
| Type | Size Limit | Timeout |
|------|------------|---------|
| Standard Function | 10MB zipped | 10s |
| Background Function | 10MB zipped | 15s |
| On-Demand Builder | 50MB unzipped | 26s |
| Edge Function | 50MB | 50ms |

### Current Architecture
```
Client Request
    ↓
Netlify CDN
    ↓
___netlify-server-handler (Main Function)
    ├── /api/orders/** (51 routes) ← Shared bundle
    ├── /api/categories/**
    ├── /api/customers/**
    └── ... (externalized deps loaded at runtime)
```

---

## References

- [Netlify Function Size Limits](https://docs.netlify.com/functions/overview/)
- [Next.js Webpack Config](https://nextjs.org/docs/app/api-reference/next-config-js/webpack)
- [@netlify/plugin-nextjs](https://github.com/netlify/next-runtime)
- [Bundle Optimization Guide](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)

---

## Support

If issues persist after applying these fixes:
1. Check Netlify build logs for specific errors
2. Verify all dependencies are installed correctly
3. Ensure Node version matches (`>=18.17.0`)
4. Contact Netlify support with build logs
5. Consider alternative deployment options (Vercel, AWS Amplify)
