# GitHub Actions Setup for Netlify Deployment

This guide explains how to set up GitHub Actions for automated testing and deployment to Netlify.

---

## Overview

The GitHub Actions workflow automates:
- 🧪 Type checking and linting on every push
- 🏗️ Building the application
- 🚀 Deploying to Netlify on main branch pushes
- 💬 Commenting deployment URLs on pull requests

---

## Setup Steps

### 1. Enable GitHub Actions

GitHub Actions is enabled by default for all repositories. The workflow file is located at:
```
.github/workflows/netlify-deploy.yml
```

### 2. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

**Navigate to:** Repository → Settings → Secrets and variables → Actions → New repository secret

#### Required Secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard → Settings → API (keep secret!) |
| `NEXT_PUBLIC_APP_URL` | Production app URL | e.g., `https://beerhive-pos.netlify.app` |
| `NETLIFY_AUTH_TOKEN` | Netlify personal access token | See instructions below |
| `NETLIFY_SITE_ID` | Netlify site ID | See instructions below |

---

### 3. Get Netlify Credentials

#### Get Netlify Auth Token:

1. Go to https://app.netlify.com
2. Click your profile icon → **User settings**
3. Navigate to **Applications** → **Personal access tokens**
4. Click **New access token**
5. Name it: "GitHub Actions"
6. Copy the token and add to GitHub secrets as `NETLIFY_AUTH_TOKEN`

#### Get Netlify Site ID:

1. Go to your Netlify site dashboard
2. Navigate to **Site settings**
3. Under **Site information**, copy the **Site ID**
4. Add to GitHub secrets as `NETLIFY_SITE_ID`

---

## Workflow Behavior

### On Push to `main` branch:
1. ✅ Runs type checking
2. ✅ Runs linting
3. ✅ Builds application
4. ✅ Deploys to Netlify production
5. ✅ Notifies status

### On Pull Request:
1. ✅ Runs type checking
2. ✅ Runs linting
3. ✅ Builds application
4. ⚠️ Does NOT deploy (Netlify auto-creates preview)
5. 💬 Comments preview URL on PR

---

## Customization

### Change Trigger Branches

Edit `.github/workflows/netlify-deploy.yml`:

```yaml
on:
  push:
    branches:
      - main
      - staging  # Add more branches
  pull_request:
    branches:
      - main
      - develop
```

### Add Testing Step

Add before the build step:

```yaml
- name: Run tests
  run: npm test
```

### Add Slack Notifications

Add to the end of deploy job:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Troubleshooting

### Build Fails in GitHub Actions

**Problem:** Build succeeds locally but fails in CI

**Solutions:**
1. Check environment variables are set correctly in GitHub secrets
2. Ensure Node.js version matches (`18.17.0`)
3. Try `npm ci` instead of `npm install` locally
4. Check build logs for specific errors

### Deployment Fails

**Problem:** Build succeeds but deployment fails

**Solutions:**
1. Verify `NETLIFY_AUTH_TOKEN` is valid
2. Verify `NETLIFY_SITE_ID` is correct
3. Check Netlify build logs
4. Ensure Netlify site is active

### Pull Request Previews Not Working

**Problem:** PR comments don't show preview URLs

**Solutions:**
1. Ensure GitHub Actions has write permissions
2. Go to: Repository → Settings → Actions → General → Workflow permissions
3. Select **Read and write permissions**
4. Save changes

---

## Monitoring Workflow

### View Workflow Runs

1. Go to your GitHub repository
2. Click **Actions** tab
3. View all workflow runs and their status

### Workflow Status Badge

Add to README.md:

```markdown
![Deploy Status](https://github.com/yourusername/beerhive-sales-system/actions/workflows/netlify-deploy.yml/badge.svg)
```

---

## Disabling Workflow

If you prefer Netlify's built-in deployment:

1. Delete `.github/workflows/netlify-deploy.yml`
2. Or rename it to `.github/workflows/netlify-deploy.yml.disabled`
3. Netlify will handle deployments automatically

---

## Alternative: Netlify Auto-Deploy

GitHub Actions is **optional**. Netlify has built-in Git integration:

### Pros of Netlify Auto-Deploy:
- ✅ Zero configuration
- ✅ Automatic build on push
- ✅ Automatic preview deployments

### Pros of GitHub Actions:
- ✅ Run tests before deploy
- ✅ Custom build steps
- ✅ More control over CI/CD
- ✅ Can deploy to multiple platforms

**Recommendation:** Use GitHub Actions only if you need custom CI/CD logic. Otherwise, Netlify auto-deploy is simpler.

---

## Cost

GitHub Actions is **free** for public repositories.

**Free tier for private repositories:**
- 2,000 build minutes/month
- Unlimited storage

**Typical usage for BeerHive POS:**
- Build time: ~3-5 minutes per deploy
- Expected deploys: ~50-100/month
- Total minutes: ~150-500/month
- **Verdict:** Within free tier ✅

---

## Best Practices

1. **Use GitHub Secrets** for all sensitive data
2. **Don't commit** `.env` files to Git
3. **Test locally** before pushing to main
4. **Use branch protection** to require status checks
5. **Review logs** after each deployment
6. **Enable email notifications** for failed builds

---

## Next Steps

After setup:
1. ✅ Push code to trigger first workflow run
2. ✅ Monitor workflow in Actions tab
3. ✅ Verify deployment to Netlify
4. ✅ Test deployed application
5. ✅ Add status badge to README (optional)

---

## Support

- **GitHub Actions Docs:** https://docs.github.com/actions
- **Netlify CLI:** https://docs.netlify.com/cli/get-started/
- **Netlify Actions:** https://github.com/netlify/actions

---

**Setup Time:** ~15 minutes ⏱️  
**Maintenance:** Zero (automated) ✅  
**Cost:** Free for most projects 💰
