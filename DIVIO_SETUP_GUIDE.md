# 🚀 Deploy Intelekt to Divio - Complete Guide

## ✅ You've Made the Right Choice!

Divio provides fully managed hosting with:
- ✅ Automatic backups
- ✅ Managed PostgreSQL database
- ✅ S3-compatible storage
- ✅ Professional support
- ✅ Zero DevOps required

**Cost:** €49/month (Standard plan)

---

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ Divio account (sign up at https://www.divio.com/)
- ✅ Your API keys:
  - Anthropic API key (for Claude)
  - xAI API key: `xai-KDSYUdGhqJkdJtNicJCIslKPjiS3XQM3MH8W7jE1HB1dbPxOQgtHSRbe5HZmpLPezsg0ChlTGeb41EAc`
- ✅ Git installed on your computer
- ✅ Docker installed (for local testing - optional)

---

## 🚀 Method 1: Deploy via Divio Control Panel (EASIEST)

### Step 1: Create Divio Account (2 minutes)

1. Go to **https://www.divio.com/**
2. Click **"Sign Up"** or **"Start Free Trial"**
3. Choose **Standard Plan** (€49/month)
4. Complete registration

### Step 2: Create New Project (3 minutes)

1. Log into **Divio Control Panel**: https://control.divio.com/
2. Click **"Create New Project"**
3. Fill in details:
   - **Project Name**: `intelekt`
   - **Project Type**: Custom (Docker)
   - **Region**: Choose closest to your users (EU or US)
   - **Python Version**: 3.10

4. Click **"Create Project"**

### Step 3: Connect Your GitHub Repository (2 minutes)

1. In your project dashboard, go to **"Repository"** tab
2. Click **"Connect to GitHub"**
3. Authorize Divio to access your GitHub
4. Select repository: **`Lyvena/Intelekt-app`**
5. Branch: **`main`**

### Step 4: Configure Build Settings (3 minutes)

1. Go to **"Settings"** → **"Build"**
2. Set **Dockerfile**: `Dockerfile.divio`
3. Set **Build Context**: `.` (root directory)
4. Click **"Save"**

### Step 5: Add Environment Variables (5 minutes)

1. Go to **"Environment Variables"** tab
2. Click **"Add Variable"** for each:

```
ANTHROPIC_API_KEY=your_claude_api_key_here
XAI_API_KEY=xai-KDSYUdGhqJkdJtNicJCIslKPjiS3XQM3MH8W7jE1HB1dbPxOQgtHSRbe5HZmpLPezsg0ChlTGeb41EAc
CHROMADB_PATH=/data/chromadb
PROJECTS_PATH=/data/generated_projects
PORT=80
PYTHONUNBUFFERED=1
```

3. Click **"Save"** after each variable

### Step 6: Configure Storage Volumes (3 minutes)

1. Go to **"Storage"** tab
2. Click **"Add Volume"**
3. Create volume for persistent data:
   - **Name**: `intelekt-data`
   - **Mount Path**: `/data`
   - **Size**: 5GB (adjust as needed)
4. Click **"Create Volume"**

### Step 7: Configure Database (Optional - 2 minutes)

Divio automatically provisions PostgreSQL, but you can configure it:

1. Go to **"Addons"** tab
2. PostgreSQL should be listed (automatically added)
3. Database credentials are automatically set in `DATABASE_URL` environment variable

### Step 8: Deploy! (5 minutes)

1. Go to **"Deploy"** tab
2. Click **"Deploy Test Environment"** first (for testing)
3. Wait 3-5 minutes for build to complete
4. Once successful, click **"Deploy Live Environment"**
5. Wait another 3-5 minutes

### Step 9: Verify Deployment (2 minutes)

1. Go to **"Environments"** tab
2. Click on **"Live"** environment
3. Copy your live URL (e.g., `https://intelekt-live.eu.aldryn.io/`)
4. Test endpoints:
   - Health check: `https://your-url/health`
   - API docs: `https://your-url/docs`

### Step 10: Configure Custom Domain (Optional - 5 minutes)

1. Go to **"Domains"** tab
2. Click **"Add Domain"**
3. Enter your domain (e.g., `intelekt.yourdomain.com`)
4. Follow DNS configuration instructions
5. Divio automatically provisions SSL certificate

---

## 🚀 Method 2: Deploy via Divio CLI (For Developers)

### Step 1: Install Divio CLI

```bash
# Install via pip
pip install divio-cli

# Or via Homebrew (Mac)
brew install divio-cli
```

### Step 2: Login to Divio

```bash
divio login
```

Follow the prompts to authenticate.

### Step 3: Clone Your Project

```bash
# Navigate to your local directory
cd "/home/the-computer/Products/Intelekt app"

# Link to Divio project (you'll need project slug from Control Panel)
divio project setup <project-slug>
```

### Step 4: Configure Environment Variables

```bash
# Set environment variables
divio project env-vars --set ANTHROPIC_API_KEY=your_key
divio project env-vars --set XAI_API_KEY=xai-KDSYUdGhqJkdJtNicJCIslKPjiS3XQM3MH8W7jE1HB1dbPxOQgtHSRbe5HZmpLPezsg0ChlTGeb41EAc
divio project env-vars --set CHROMADB_PATH=/data/chromadb
divio project env-vars --set PROJECTS_PATH=/data/generated_projects
```

### Step 5: Deploy

```bash
# Deploy to test environment
divio project deploy test

# Once verified, deploy to live
divio project deploy live
```

### Step 6: View Logs

```bash
# View live logs
divio project logs live

# View test logs
divio project logs test
```

---

## 🧪 Local Development with Divio

### Setup Local Environment

```bash
# Pull database from Divio
divio project pull db

# Pull media files
divio project pull media

# Start local development server
divio project up
```

### Access Local App

- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📊 Post-Deployment Configuration

### 1. Monitor Your Application

1. Go to **"Monitoring"** tab in Control Panel
2. View metrics:
   - CPU usage
   - Memory usage
   - Request rate
   - Error rate

### 2. Set Up Backups

Divio automatically backs up:
- ✅ Database (daily)
- ✅ Media files (daily)
- ✅ Retention: 30 days

To manually trigger backup:
1. Go to **"Backups"** tab
2. Click **"Create Backup"**

### 3. Configure Alerts

1. Go to **"Settings"** → **"Alerts"**
2. Add email for notifications:
   - Deployment failures
   - High error rates
   - Resource limits

### 4. Scale Resources (If Needed)

1. Go to **"Settings"** → **"Resources"**
2. Adjust:
   - Memory: 512MB → 1GB → 2GB
   - CPU: 1 core → 2 cores → 4 cores
3. Click **"Apply Changes"**

---

## 🌐 Deploy Frontend to Divio (Optional)

### Option 1: Separate Frontend Service

1. Create another Divio project for frontend
2. Use Node.js/React build
3. Point API calls to backend URL

### Option 2: Use Vercel/Netlify for Frontend

**Recommended:** Deploy frontend separately:

```bash
# Deploy to Vercel
cd frontend
npm install -g vercel
vercel

# Or deploy to Netlify
npm install -g netlify-cli
netlify deploy
```

**Update API URL** in `frontend/src/services/api.ts`:
```typescript
const API_BASE_URL = 'https://your-divio-url.eu.aldryn.io';
```

---

## 🔧 Troubleshooting

### Issue: Build Fails

**Solution:**
1. Check build logs in Control Panel
2. Verify `Dockerfile.divio` is correct
3. Ensure all dependencies in `requirements.txt`

### Issue: Application Won't Start

**Solution:**
1. Check application logs: `divio project logs live`
2. Verify environment variables are set
3. Check PORT is set to 80

### Issue: ChromaDB Errors

**Solution:**
1. Verify volume is mounted to `/data`
2. Check `CHROMADB_PATH=/data/chromadb`
3. Ensure write permissions

### Issue: API Keys Not Working

**Solution:**
1. Double-check environment variables in Control Panel
2. Redeploy after adding variables
3. Check logs for authentication errors

### Issue: Out of Memory

**Solution:**
1. Upgrade to Business plan (1GB RAM)
2. Or optimize ChromaDB usage
3. Monitor memory in Control Panel

---

## 💰 Pricing & Plans

### Standard Plan (€49/month)
- 512MB RAM
- 1 CPU core
- 5GB storage
- PostgreSQL database
- Automatic backups
- SSL certificate
- Professional support

### Business Plan (€99/month)
- 1GB RAM
- 2 CPU cores
- 20GB storage
- Everything in Standard
- Priority support

### Professional Plan (€199/month)
- 2GB RAM
- 4 CPU cores
- 50GB storage
- Everything in Business
- Dedicated support

---

## 📞 Support Resources

### Divio Support
- **Email**: support@divio.com
- **Documentation**: https://docs.divio.com/
- **Community**: https://community.divio.com/
- **Status**: https://status.divio.com/

### Response Times
- Standard: 24 hours
- Business: 12 hours
- Professional: 4 hours

---

## ✅ Deployment Checklist

Before going live:

- [ ] Project created in Divio
- [ ] GitHub repository connected
- [ ] Environment variables set (API keys)
- [ ] Storage volume configured
- [ ] Test environment deployed successfully
- [ ] Health check passes (`/health`)
- [ ] API documentation accessible (`/docs`)
- [ ] Grok API tested
- [ ] Claude API tested (if you have key)
- [ ] Live environment deployed
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Monitoring enabled
- [ ] Backup schedule verified
- [ ] Frontend deployed (separate service)
- [ ] Frontend connected to backend API

---

## 🎉 Success!

Once deployed, your Intelekt app will be:
- ✅ Live at your Divio URL
- ✅ Fully managed (backups, monitoring, scaling)
- ✅ Secured with SSL
- ✅ Backed up daily
- ✅ Professionally supported

**Your app is now production-ready! 🚀**

---

## 🔗 Quick Links

- **Divio Control Panel**: https://control.divio.com/
- **Your Project**: https://control.divio.com/control/project/<your-project-id>/
- **Documentation**: https://docs.divio.com/
- **GitHub Repo**: https://github.com/Lyvena/Intelekt-app

---

## 💡 Pro Tips

1. **Use Test Environment First** - Always deploy to test before live
2. **Monitor Logs** - Check logs regularly for errors
3. **Set Up Alerts** - Get notified of issues immediately
4. **Regular Backups** - Divio does this automatically, but verify
5. **Scale Gradually** - Start with Standard, upgrade as needed
6. **Use CDN** - Divio includes CDN for static files
7. **Custom Domain** - Add your own domain for branding
8. **SSL Included** - Automatic SSL certificate management

---

**Need help? Contact Divio support at support@divio.com or check the documentation at https://docs.divio.com/**

**Happy deploying! 🎉**
