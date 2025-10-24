# 🚀 Deploy Intelekt to Render NOW - Quick Guide

## ✅ Everything is Ready!

Your code is configured for Render and pushed to GitHub. Deploy in 10 minutes!

---

## 🎯 **Two Deployment Methods**

### **Method 1: One-Click Deploy (EASIEST)** ⭐

Click this button to deploy instantly:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Lyvena/Intelekt-app)

**Or use this URL:**
```
https://render.com/deploy?repo=https://github.com/Lyvena/Intelekt-app
```

This uses the `render.yaml` blueprint for automatic configuration!

---

### **Method 2: Manual Setup (10 minutes)**

Follow these steps if one-click doesn't work:

#### **Step 1: Sign Up (1 minute)**
1. Go to: https://render.com/
2. Click "Get Started"
3. Sign up with GitHub (easiest)
4. No credit card required!

#### **Step 2: Create Web Service (2 minutes)**
1. Click "New +" → "Web Service"
2. Connect GitHub
3. Select: `Lyvena/Intelekt-app`
4. Click "Connect"

#### **Step 3: Configure (3 minutes)**

**Basic Settings:**
- Name: `intelekt-backend`
- Region: Choose closest to you
- Branch: `main`
- Root Directory: `backend`
- Runtime: `Python 3`

**Build & Deploy:**
- Build Command:
  ```bash
  pip install -r requirements.txt && pip install 'numpy<2.0'
  ```
- Start Command:
  ```bash
  uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

**Instance Type:**
- Select: **Free** (512MB RAM)

#### **Step 4: Environment Variables (2 minutes)**

Click "Advanced" → Add these variables:

```
ANTHROPIC_API_KEY=your_claude_key_if_you_have_it
XAI_API_KEY=xai-KDSYUdGhqJkdJtNicJCIslKPjiS3XQM3MH8W7jE1HB1dbPxOQgtHSRbe5HZmpLPezsg0ChlTGeb41EAc
CHROMADB_PATH=/data/chromadb
PROJECTS_PATH=/data/generated_projects
PYTHON_VERSION=3.10
```

#### **Step 5: Add Persistent Disk (2 minutes)**

1. Scroll to "Disks"
2. Click "Add Disk"
3. Configure:
   - Name: `intelekt-data`
   - Mount Path: `/data`
   - Size: 1GB
4. Click "Save"

#### **Step 6: Deploy! (1 minute)**

1. Click "Create Web Service"
2. Wait 3-5 minutes for build
3. Your app will be live!

---

## 🌐 **Your App URLs**

After deployment:
- **Backend API**: `https://intelekt-backend.onrender.com`
- **Health Check**: `https://intelekt-backend.onrender.com/health`
- **API Docs**: `https://intelekt-backend.onrender.com/docs`

---

## 💤 **Prevent Sleeping (Optional)**

Your app sleeps after 15 minutes. Keep it awake for FREE:

### **Use UptimeRobot:**

1. Sign up: https://uptimerobot.com/ (FREE)
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://your-app.onrender.com/health`
   - Interval: 5 minutes
3. Done! App stays awake 24/7

**Cost: Still $0!** 🎉

---

## 🌐 **Deploy Frontend (Optional)**

### **Option 1: Vercel (Recommended)**

```bash
cd frontend
npm install -g vercel
vercel
```

### **Option 2: Netlify**

```bash
cd frontend
npm install -g netlify-cli
netlify deploy
```

### **Option 3: Render Static Site**

1. Create new "Static Site" in Render
2. Repository: `Lyvena/Intelekt-app`
3. Root Directory: `frontend`
4. Build: `npm install && npm run build`
5. Publish: `dist`

**Update API URL** in `frontend/src/services/api.ts`:
```typescript
const API_BASE_URL = 'https://your-backend.onrender.com';
```

---

## ✅ **Verification Checklist**

After deployment:

- [ ] Backend deployed successfully
- [ ] Health check passes: `/health`
- [ ] API docs accessible: `/docs`
- [ ] Environment variables set
- [ ] Persistent disk mounted
- [ ] Grok API tested
- [ ] UptimeRobot configured (optional)
- [ ] Frontend deployed (optional)

---

## 🔗 **Important Links**

| Resource | URL |
|----------|-----|
| **Render Dashboard** | https://dashboard.render.com/ |
| **GitHub Repo** | https://github.com/Lyvena/Intelekt-app |
| **One-Click Deploy** | https://render.com/deploy?repo=https://github.com/Lyvena/Intelekt-app |
| **UptimeRobot** | https://uptimerobot.com/ |
| **Full Guide** | See `RENDER_FREE_DEPLOY.md` |

---

## 💰 **Cost**

**FREE Forever!**
- Backend: FREE (with sleep)
- Frontend: FREE (Vercel/Netlify)
- Keep-Alive: FREE (UptimeRobot)
- **Total: $0/month** 🎉

---

## 🆘 **Troubleshooting**

### **Build Fails:**
- Check build logs in Render dashboard
- Verify `requirements.txt` is correct
- Ensure NumPy version is pinned

### **App Won't Start:**
- Check start command uses `$PORT`
- Verify environment variables
- Check application logs

### **ChromaDB Errors:**
- Verify disk mounted to `/data`
- Check `CHROMADB_PATH=/data/chromadb`
- Ensure write permissions

---

## 🎉 **Success!**

Once deployed:
- ✅ Your app is live on the internet (FREE!)
- ✅ Accessible via HTTPS
- ✅ Persistent storage for ChromaDB
- ✅ Ready for testing and demos

---

## 📞 **Need Help?**

- **Full Guide**: `RENDER_FREE_DEPLOY.md`
- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com/

---

## 🚀 **Deploy NOW!**

**One-Click Deploy:**
https://render.com/deploy?repo=https://github.com/Lyvena/Intelekt-app

**Or follow Method 2 above for manual setup.**

**Your Intelekt app will be live in 10 minutes! 🎊**
