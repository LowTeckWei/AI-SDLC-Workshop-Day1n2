# Railway Deployment - Simple Setup Guide

**⚠️ Important:** Railway's GitHub Actions integration is complex and problematic. This guide shows you the **much simpler** approach using Railway's built-in GitHub integration.

## Why Not GitHub Actions?

The Railway CLI has limitations that make GitHub Actions deployment difficult:
- ❌ Requires interactive project linking
- ❌ Needs project-specific tokens (not just API tokens)
- ❌ Can't create projects non-interactively
- ❌ "Project Token not found" errors in CI/CD
- ❌ Complex configuration that often breaks

**Railway's built-in GitHub integration is 10x simpler!**

## ✅ Recommended Approach: Railway's Built-in Deployment

### Step 1: Create Railway Project (One-Time, 5 Minutes)

1. **Go to [Railway Dashboard](https://railway.app/dashboard)**

2. **Click "New Project"**

3. **Select "Deploy from GitHub repo"**
   - Railway will ask for GitHub access
   - Grant access to your repositories

4. **Choose your repository:**
   - Select your fork/copy of this repo (e.g. `<your-github-username>/AI-SDLC-Workshop-Day1n2`)
   - Choose branch: `main` (or whichever branch you deploy from)
   - This repo ships a `railway.json` that pins the builder to `DOCKERFILE`, so Railway will build the multi-stage `Dockerfile` at the repo root instead of auto-detecting Nixpacks — no build/start command configuration needed.

5. **Railway automatically configures everything from `railway.json` + `Dockerfile`:**
   - ✅ Builds via Docker (`node:20-bookworm-slim`, matches `better-sqlite3`'s native binary ABI)
   - ✅ Runs the Next.js standalone server (`node server.js`)
   - ✅ Restarts on failure (up to 10 retries)
   - ✅ Generates public URL

### Step 2: Configure Settings (Required)

1. **In Railway project, click on your service**

2. **Go to "Settings" tab**

3. **Set Root Directory (only if needed):**
   ```
   Root Directory: /todo-app
   ```
   (Only if your Next.js app is in a subdirectory — this repo's app is at the root, so leave it blank)

4. **Environment Variables (required) — go to the "Variables" tab and add:**

   | Variable | Required? | Value |
   |---|---|---|
   | `JWT_SECRET` | **Yes** | A long random string, e.g. generate with `openssl rand -base64 32`. Session signing breaks without this. |
   | `RP_ID` | Recommended for prod | Your Railway domain without protocol, e.g. `your-app.up.railway.app`. Falls back to the request hostname if unset, but set it explicitly once you have a stable domain. |
   | `ORIGIN` | Recommended for prod | Full origin URL, e.g. `https://your-app.up.railway.app`. Falls back to the request's origin header if unset. |
   | `RAILWAY_VOLUME_MOUNT_PATH` | **Yes, if you attach a volume** | Set automatically by Railway once a volume is mounted (see step 5 below) — don't set it by hand. |

   These are the same variables documented in `.env.example`; see `lib/webauthn.ts` (`RP_ID`/`ORIGIN`) and `lib/db.ts` (`RAILWAY_VOLUME_MOUNT_PATH`) for exactly how each is consumed.

5. **Attach a persistent Volume (required for SQLite to survive redeploys):**
   - Go to your service → **"Volumes"** tab → **"New Volume"**
   - Set **Mount Path** to `/app/data`
   - Railway injects `RAILWAY_VOLUME_MOUNT_PATH=/app/data` automatically; `lib/db.ts` reads it and stores `todos.db` there instead of the ephemeral container filesystem
   - Without this step, every redeploy wipes the database

6. **Custom Domain (Optional):**
   - Go to "Settings" → "Networking"
   - Click "Generate Domain" for a Railway subdomain
   - Or add your own custom domain
   - If you change domains later, update `RP_ID`/`ORIGIN` to match — WebAuthn ties credentials to the origin they were registered on

### Step 3: Deploy!

**That's it!** Railway will now automatically:
- ✅ Deploy on every push to `main` branch
- ✅ Show deployment status in GitHub PR checks
- ✅ Provide deployment logs
- ✅ Give you a live URL
- ✅ Handle rollbacks if deployment fails

## 🎯 What Happens Next

### Automatic Deployments

Every time you push code:

```bash
git push origin main
```

Railway automatically:
1. Detects the push via GitHub webhook
2. Pulls the latest code
3. Runs `npm install`
4. Runs `npm run build`
5. Deploys the new version
6. Updates your live URL

**No GitHub Actions needed!**

### Monitor Deployments

1. **In Railway Dashboard:**
   - See deployment status
   - View build logs
   - Check deployment history

2. **In GitHub:**
   - See Railway check status on commits
   - Get deployment notifications

3. **Deployment URL:**
   - Railway provides: `https://your-app-name.up.railway.app`
   - Or use your custom domain

## 🚀 Benefits of This Approach

✅ **Zero Configuration** - Railway auto-detects everything
✅ **No Secrets Management** - Railway handles auth automatically
✅ **No Workflow Files** - No YAML to maintain
✅ **Automatic Deployments** - Push to deploy
✅ **Preview Deployments** - Automatic for PRs
✅ **Rollback Support** - Click to rollback to previous version
✅ **Build Logs** - Full visibility into deployments
✅ **Always Works** - No CLI token issues

## 🔧 Troubleshooting

### Build Fails

**Check Railway logs:**
1. Go to Railway Dashboard
2. Click on your service
3. Go to "Deployments" tab
4. Click on failed deployment
5. View build logs

**Common issues:**
- Missing dependencies in `package.json`
- Build errors (fix locally first: `npm run build`)
- Incorrect root directory setting

### App Crashes After Deploy

**Check runtime logs:**
1. Railway Dashboard → Your service
2. "Deployments" → Click active deployment
3. View runtime logs

**Common issues:**
- Missing environment variables
- Database connection issues
- Port configuration (Railway sets `PORT` automatically)

### Deployment Takes Too Long

Railway has generous build timeouts, but if needed:
- Optimize `package.json` (remove unused dependencies)
- Use `npm ci` instead of `npm install` (already default)
- Check for slow build steps

## 📝 Project Structure for Railway

Railway works best with this structure:

```
your-repo/
├── package.json          ← Railway looks here by default
├── next.config.js
├── app/
├── lib/
└── ...
```

If your Next.js app is in a subdirectory:
```
your-repo/
└── todo-app/            ← Set this as Root Directory in Railway
    ├── package.json
    ├── next.config.js
    └── ...
```

## 🎓 Advanced: Preview Deployments

Railway automatically creates preview deployments for Pull Requests!

**How it works:**
1. Create a PR in GitHub
2. Railway automatically deploys a preview
3. Get a unique URL for testing
4. Merge PR → deploys to production

**Enable in Railway:**
- Project Settings → GitHub Integration
- Enable "PR Deploys"

## 💡 Tips

1. **First deployment takes longer** - Railway installs all dependencies
2. **Subsequent deploys are faster** - Railway caches dependencies
3. **Watch first deployment** - Check logs to catch any issues early
4. **Test locally first** - Always run `npm run build` locally before pushing
5. **Use Railway CLI locally** - For debugging: `npm install -g @railway/cli && railway login`

## 📚 Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Next.js Guide](https://docs.railway.app/guides/nextjs)
- [Railway Discord](https://discord.gg/railway) - Great community support

## ❓ FAQ

### Q: Can I use GitHub Actions with Railway?

**A:** Technically yes, but it's complex and error-prone. Railway's built-in integration is much better.

### Q: How much does Railway cost?

**A:** Free tier includes $5 of usage per month. Next.js apps typically use ~$2-3/month.

### Q: Can I rollback deployments?

**A:** Yes! Railway Dashboard → Deployments → Click previous deployment → "Redeploy"

### Q: How do I see deployment logs?

**A:** Railway Dashboard → Your service → Deployments → Click deployment → View logs

### Q: Can I deploy from multiple branches?

**A:** Yes! Create separate Railway services for different branches (staging, production, etc.)

---

## 🎉 Summary

**You don't need the GitHub Actions workflow!**

1. ✅ Connect Railway to GitHub (one-time setup)
2. ✅ Push code to repository
3. ✅ Railway deploys automatically
4. ✅ Done!

It's that simple. Railway's built-in integration is the easiest way to deploy your Next.js app.
