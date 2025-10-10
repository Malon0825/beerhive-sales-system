# Netlify Deployment Guide for BeerHive POS System

This comprehensive guide walks you through deploying the BeerHive POS System to Netlify, a modern platform for hosting Next.js applications with automatic builds, edge functions, and global CDN.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Variables Configuration](#environment-variables-configuration)
4. [Deployment Steps](#deployment-steps)
5. [Custom Domain Setup](#custom-domain-setup)
6. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
7. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

Before deploying to Netlify, ensure you have:

- ✅ A GitHub/GitLab/Bitbucket account with your repository
- ✅ A Netlify account (sign up at https://netlify.com)
- ✅ A Supabase project with database configured
- ✅ All environment variables from `.env.local.example`
- ✅ Successful local build (`npm run build`)

---

## Initial Setup

### Step 1: Install Netlify CLI (Optional)

The Netlify CLI allows you to deploy from your terminal and test locally.

```bash
npm install -g netlify-cli

# Login to Netlify
netlify login
```

### Step 2: Verify Build Configuration

Ensure your project has the required files:

- ✅ `netlify.toml` - Main configuration file
- ✅ `public/_redirects` - Client-side routing configuration
- ✅ `package.json` - Contains `@netlify/plugin-nextjs` in devDependencies

### Step 3: Test Local Build

Before deploying, verify your build works locally:

```bash
# Clean install dependencies
npm ci

# Run production build
npm run build

# Test production build locally
npm start
```

If the build succeeds locally, you're ready to deploy!

---

## Environment Variables Configuration

### Required Environment Variables

Navigate to **Netlify Dashboard > Site Settings > Environment Variables** and add the following:

#### Supabase Configuration

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**How to get Supabase credentials:**
1. Go to your Supabase project dashboard
2. Click on **Settings** → **API**
3. Copy the **Project URL** for `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the **anon/public** key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy the **service_role** key for `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

#### Application Configuration

```env
NEXT_PUBLIC_APP_NAME=BeerHive POS
NEXT_PUBLIC_APP_URL=https://your-site-name.netlify.app
NODE_ENV=production
```

⚠️ **Important:** Replace `your-site-name.netlify.app` with your actual Netlify site URL.

#### Optional: Feature Flags

```env
NEXT_PUBLIC_ENABLE_VIP_PACKAGES=true
NEXT_PUBLIC_ENABLE_LOYALTY_POINTS=false
```

---

## Deployment Steps

### Method 1: Deploy via Netlify UI (Recommended for First-Time)

1. **Connect Repository**
   - Go to https://app.netlify.com
   - Click **Add new site** → **Import an existing project**
   - Choose your Git provider (GitHub/GitLab/Bitbucket)
   - Authorize Netlify to access your repositories
   - Select `beerhive-sales-system` repository

2. **Configure Build Settings**
   
   Netlify should auto-detect settings from `netlify.toml`, but verify:
   
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
   - **Node version:** `18.17.0`
   - **Functions directory:** `netlify/functions` (if using serverless functions)

3. **Add Environment Variables**
   
   - Click **Show advanced**
   - Click **New variable** and add all environment variables from above section
   - Double-check spelling and values

4. **Deploy Site**
   
   - Click **Deploy site**
   - Wait for build to complete (usually 2-5 minutes)
   - Check build logs for any errors

5. **Verify Deployment**
   
   - Once deployed, click the auto-generated URL (e.g., `random-name-12345.netlify.app`)
   - Test key functionality:
     - Login page loads
     - User can authenticate
     - POS interface works
     - Real-time features function

### Method 2: Deploy via Netlify CLI

```bash
# Initialize Netlify in your project
netlify init

# Follow prompts:
# - Choose "Create & configure a new site"
# - Select team
# - Enter site name (e.g., beerhive-pos)

# Set environment variables
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-anon-key"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-service-role-key"
netlify env:set NEXT_PUBLIC_APP_NAME "BeerHive POS"
netlify env:set NEXT_PUBLIC_APP_URL "https://your-site.netlify.app"

# Deploy to production
netlify deploy --prod
```

### Method 3: Continuous Deployment (Automatic)

Once connected to Git:

1. **Auto-Deploy on Push**
   - Every push to `main` branch triggers production deployment
   - Every push to other branches creates preview deployments

2. **Configure Branch Deploys**
   - Go to **Site Settings** → **Build & deploy** → **Continuous Deployment**
   - Set production branch to `main`
   - Enable branch deploys for `develop`, `staging`, etc.

3. **Deploy Previews**
   - Pull requests automatically get preview URLs
   - Test changes before merging to main

---

## Custom Domain Setup

### Add Custom Domain

1. **Purchase Domain** (from GoDaddy, Namecheap, etc.)

2. **Add to Netlify**
   - Go to **Site Settings** → **Domain management**
   - Click **Add custom domain**
   - Enter your domain (e.g., `beerhive-pos.com`)
   - Follow DNS configuration instructions

3. **Configure DNS**

   **Option A: Use Netlify DNS (Recommended)**
   - Update your domain's nameservers to Netlify's:
     ```
     dns1.p01.nsone.net
     dns2.p01.nsone.net
     dns3.p01.nsone.net
     dns4.p01.nsone.net
     ```

   **Option B: Use External DNS**
   - Add an A record pointing to Netlify's load balancer IP
   - Or add a CNAME record pointing to `your-site.netlify.app`

4. **Enable HTTPS**
   - Netlify provides free SSL via Let's Encrypt
   - Certificate is automatically provisioned (takes 24-48 hours)
   - Enable **Force HTTPS** in domain settings

5. **Update Environment Variable**
   ```env
   NEXT_PUBLIC_APP_URL=https://your-custom-domain.com
   ```

---

## Monitoring and Troubleshooting

### Build Logs

If deployment fails, check build logs:

1. Go to **Deploys** tab
2. Click on the failed deploy
3. View **Deploy log** for errors

**Common issues:**

- **Missing environment variables:** Ensure all required env vars are set
- **TypeScript errors:** Run `npm run type-check` locally to catch issues
- **Module not found:** Run `npm ci` to ensure dependencies are correct
- **Build timeout:** Optimize build or upgrade Netlify plan

### Function Logs

For serverless function errors:

1. Go to **Functions** tab
2. Click on the function
3. View **Function log**

### Analytics

Enable Netlify Analytics for traffic insights:

1. Go to **Site Settings** → **Analytics**
2. Click **Enable Analytics**
3. Monitor page views, bandwidth, form submissions

### Real-Time Debugging

Use Netlify's real-time log tail:

```bash
netlify logs --watch
```

---

## Post-Deployment Checklist

After successful deployment, verify:

- ✅ **Authentication:** Login works with Supabase
- ✅ **Database Connection:** Data loads from Supabase
- ✅ **Real-time Features:** Order updates, inventory changes sync
- ✅ **Image Loading:** Product images load from Supabase Storage
- ✅ **API Routes:** All API endpoints respond correctly
- ✅ **Responsive Design:** Test on mobile, tablet, desktop
- ✅ **Print Functionality:** Receipt printing works
- ✅ **Role-Based Access:** Different roles have correct permissions
- ✅ **Error Tracking:** Set up Sentry or error monitoring

### Performance Optimization

1. **Enable Asset Optimization**
   - Go to **Site Settings** → **Build & deploy** → **Post processing**
   - Enable **Bundle CSS** and **Minify JS**

2. **Configure Caching Headers**
   - Already configured in `netlify.toml`
   - Verify with browser DevTools Network tab

3. **Monitor Core Web Vitals**
   - Use Google PageSpeed Insights
   - Target scores: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## Advanced Configuration

### Serverless Functions

To add Netlify Functions for custom backend logic:

1. Create `netlify/functions` directory
2. Add function files (e.g., `netlify/functions/send-receipt.js`)
3. Deploy - Netlify automatically detects and builds functions

Example function:

```javascript
// netlify/functions/send-receipt.js
/**
 * Serverless function to send receipt emails
 * Triggered by POS system after order completion
 */
exports.handler = async (event, context) => {
  // Parse request body
  const { orderId, customerEmail } = JSON.parse(event.body);
  
  // Send email logic here
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Receipt sent' })
  };
};
```

### Edge Functions

For ultra-fast functions at edge locations:

1. Create `netlify/edge-functions` directory
2. Add Deno-based edge function
3. Configure in `netlify.toml`

### Split Testing

Test multiple versions of your app:

1. Go to **Site Settings** → **Split Testing**
2. Create branch deploys
3. Configure traffic split percentage

---

## Rollback Procedure

If deployment introduces issues:

1. **Via UI:**
   - Go to **Deploys** tab
   - Find previous working deploy
   - Click **Publish deploy** to rollback

2. **Via CLI:**
   ```bash
   netlify rollback
   ```

---

## CI/CD Integration

For advanced workflows, integrate with GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Netlify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets to Git
   - Use Netlify's environment variable UI
   - Rotate keys periodically

2. **Supabase RLS**
   - Verify Row Level Security policies are enabled
   - Test with different user roles

3. **HTTPS Only**
   - Force HTTPS in Netlify settings
   - Update Supabase allowed domains

4. **CSP Headers**
   - Already configured in `netlify.toml`
   - Adjust as needed for third-party scripts

---

## Cost Estimation

### Netlify Free Tier
- **Bandwidth:** 100GB/month
- **Build minutes:** 300 minutes/month
- **Team members:** 1
- **Suitable for:** Small to medium deployments

### Netlify Pro ($19/month)
- **Bandwidth:** 400GB/month
- **Build minutes:** 1000 minutes/month
- **Team members:** 3
- **Advanced features:** Password protection, role-based access

### Netlify Business ($99/month)
- **Bandwidth:** 1TB/month
- **Build minutes:** Unlimited
- **Team members:** 15
- **Enterprise features:** SSO, audit logs, SLA

---

## Support and Resources

- **Netlify Documentation:** https://docs.netlify.com
- **Netlify Community Forum:** https://answers.netlify.com
- **Next.js on Netlify:** https://docs.netlify.com/integrations/frameworks/next-js/
- **Supabase Integration:** https://supabase.com/docs/guides/hosting/netlify

---

## Conclusion

You've successfully deployed BeerHive POS System to Netlify! 🎉

For ongoing maintenance:
- Monitor build logs regularly
- Keep dependencies updated
- Review Netlify analytics
- Test new features in preview deployments before merging

**Need help?** Contact your development team or refer to the official Netlify documentation.
