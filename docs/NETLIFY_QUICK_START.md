# Netlify Quick Start Guide

Quick reference for deploying BeerHive POS System to Netlify.

---

## 🚀 One-Minute Deploy

1. **Connect Repository**
   ```
   Go to: https://app.netlify.com
   Click: Add new site → Import an existing project
   Choose: GitHub (or your Git provider)
   Select: beerhive-sales-system repository
   ```

2. **Set Environment Variables**
   ```
   Site Settings → Environment Variables → Add variables
   
   Required:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_APP_NAME
   - NEXT_PUBLIC_APP_URL
   ```

3. **Deploy**
   ```
   Click: Deploy site
   Wait: 2-5 minutes
   Done: Visit your site URL
   ```

---

## 📋 Essential Commands

### Deploy via CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy to production
netlify deploy --prod

# View live logs
netlify logs --watch
```

### Local Testing

```bash
# Build for production
npm run build

# Start production server
npm start

# Test locally with Netlify Dev
netlify dev
```

---

## 🔧 Configuration Files

### `netlify.toml`
Main configuration file - build settings, redirects, headers.

### `public/_redirects`
Client-side routing for Next.js SPA.

### `.env.local`
Local environment variables (not committed to Git).

---

## 🌍 Environment Variables

Copy these from your Supabase project:

| Variable | Location | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | Service key (keep secret!) |
| `NEXT_PUBLIC_APP_URL` | Manual | Your Netlify site URL |

---

## ✅ Post-Deploy Checklist

- [ ] Site loads without errors
- [ ] Login functionality works
- [ ] Database connection successful
- [ ] Real-time features active
- [ ] Images load correctly
- [ ] API routes respond
- [ ] Mobile responsive
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled and forced

---

## 🐛 Common Issues

### Build Fails

**Problem:** TypeScript errors during build

**Solution:**
```bash
# Run type check locally first
npm run type-check

# Fix any errors before deploying
```

**Problem:** Missing environment variables

**Solution:**
```
Site Settings → Environment Variables
Add all required variables from .env.local.example
```

### Site Not Loading

**Problem:** Blank page or 404 errors

**Solution:**
```
Check: public/_redirects file exists
Check: netlify.toml has correct publish directory (.next)
Check: Build logs for errors
```

### Supabase Connection Failed

**Problem:** Can't connect to database

**Solution:**
```
Verify: Environment variables are correct
Check: Supabase project is active
Update: Supabase allowed origins to include Netlify domain
```

---

## 🔄 Continuous Deployment

Once connected to Git:

- **Push to `main`** → Auto-deploys to production
- **Push to other branches** → Creates preview deployment
- **Open Pull Request** → Generates preview URL

---

## 📊 Monitoring

### View Deployment Status
```
Netlify Dashboard → Deploys tab
```

### Check Build Logs
```
Click on any deploy → View deploy log
```

### Real-time Logs
```bash
netlify logs --watch
```

---

## 🔐 Security Checklist

- [ ] All secrets stored in Netlify environment variables
- [ ] HTTPS forced on custom domain
- [ ] Supabase RLS policies enabled
- [ ] CSP headers configured in netlify.toml
- [ ] Service role key never exposed to client

---

## 📞 Need Help?

- **Full Guide:** See `docs/NETLIFY_DEPLOYMENT_GUIDE.md`
- **Netlify Docs:** https://docs.netlify.com
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs

---

## 💡 Pro Tips

1. **Use Preview Deployments:** Test changes before merging to main
2. **Enable Deploy Notifications:** Get Slack/email alerts on deploy status
3. **Set Up Custom Domain Early:** DNS propagation takes 24-48 hours
4. **Monitor Build Minutes:** Free tier has 300 minutes/month limit
5. **Optimize Images:** Use Next.js Image component for automatic optimization

---

**Deployment Time:** ~5 minutes ⏱️  
**Automatic Deployments:** ✅ Enabled on Git push  
**HTTPS:** ✅ Free SSL certificate included  
**Global CDN:** ✅ Automatic worldwide distribution
