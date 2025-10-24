# 🆓 Deploy Intelekt to Render - FREE Tier

## ✅ Best FREE Hosting Option for Intelekt

**Render.com offers:**
- ✅ **Completely FREE** - No credit card required
- ✅ **512MB RAM** - Sufficient for Intelekt
- ✅ **1GB Persistent Disk** - For ChromaDB storage
- ✅ **Automatic SSL** - HTTPS included
- ✅ **Easy Deployment** - GitHub integration
- ✅ **No Time Limits** - Runs indefinitely

**Trade-off:** Service sleeps after 15 minutes of inactivity (wakes in ~30 seconds)

---

## 🚀 Deploy in 10 Minutes

### Step 1: Sign Up for Render (1 minute)

1. Go to: **https://render.com/**
2. Click **"Get Started"**
3. Sign up with GitHub (easiest)
4. No credit card required!

### Step 2: Create Web Service (2 minutes)

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub account
3. Select repository: **`Lyvena/Intelekt-app`**
4. Click **"Connect"**

### Step 3: Configure Service (3 minutes)

**Basic Settings:**
- **Name**: `intelekt-backend`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`

**Build & Deploy:**
- **Build Command**: 
  ```bash
  pip install -r requirements.txt && pip install 'numpy<2.0'
  ```
- **Start Command**:
  ```bash
  uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

**Instance Type:**
- Select: **Free** (512MB RAM)

### Step 4: Add Environment Variables (3 minutes)

Click **"Advanced"** → **"Add Environment Variable"**

Add these variables:

```
ANTHROPIC_API_KEY=your_claude_key_if_you_have_it
XAI_API_KEY=xai-KDSYUdGhqJkdJtNicJCIslKPjiS3XQM3MH8W7jE1HB1dbPxOQgtHSRbe5HZmpLPezsg0ChlTGeb41EAc
CHROMADB_PATH=/data/chromadb
PROJECTS_PATH=/data/generated_projects
PYTHON_VERSION=3.10
```

### Step 5: Add Persistent Disk (2 minutes)

1. Scroll down to **"Disks"** section
2. Click **"Add Disk"**
3. Configure:
   - **Name**: `intelekt-data`
   - **Mount Path**: `/data`
   - **Size**: 1GB (free tier limit)
4. Click **"Save"**

### Step 6: Deploy! (1 minute)

1. Click **"Create Web Service"**
2. Wait 3-5 minutes for build
3. Your app will be live!

### Step 7: Get Your URL (30 seconds)

1. Once deployed, you'll see your URL
2. Format: `https://intelekt-backend.onrender.com`
3. Test it:
   - Health: `https://your-url.onrender.com/health`
   - API Docs: `https://your-url.onrender.com/docs`

---

## 🌐 Deploy Frontend (Optional)

### Option 1: Render (Another Free Service)

1. Create another **"Static Site"**
2. Repository: `Lyvena/Intelekt-app`
3. Root Directory: `frontend`
4. Build Command: `npm install && npm run build`
5. Publish Directory: `dist`

### Option 2: Vercel (Recommended for Frontend)

```bash
cd frontend
npm install -g vercel
vercel
```

### Option 3: Netlify

```bash
cd frontend
npm install -g netlify-cli
netlify deploy
```

**Important:** Update `frontend/src/services/api.ts` with your Render backend URL:
```typescript
const API_BASE_URL = 'https://your-backend.onrender.com';
```

---

## ⚠️ Free Tier Limitations

### What You Get:
- ✅ 512MB RAM
- ✅ 1GB persistent disk
- ✅ Automatic SSL
- ✅ Unlimited bandwidth
- ✅ Custom domains

### Limitations:
- ⚠️ **Sleeps after 15 minutes** of inactivity
- ⚠️ **30-second wake time** on first request
- ⚠️ **Build time limit**: 15 minutes
- ⚠️ **No auto-scaling**

### Solutions:
1. **Keep-alive service**: Use a free uptime monitor (UptimeRobot)
2. **Upgrade to paid**: $7/month removes sleep
3. **Accept sleep**: Fine for demos/testing

---

## 💰 Upgrade Options

### Starter Plan ($7/month):
- ✅ No sleep
- ✅ 512MB RAM
- ✅ Faster builds
- ✅ Priority support

### Standard Plan ($25/month):
- ✅ 2GB RAM
- ✅ Faster performance
- ✅ More disk space

---

## 🔧 Troubleshooting

### Issue: Build Fails
**Solution:**
- Check build logs in Render dashboard
- Verify `requirements.txt` is correct
- Ensure NumPy version is pinned

### Issue: Service Won't Start
**Solution:**
- Check start command uses `$PORT`
- Verify environment variables are set
- Check application logs

### Issue: ChromaDB Errors
**Solution:**
- Verify disk is mounted to `/data`
- Check `CHROMADB_PATH=/data/chromadb`
- Ensure disk has write permissions

### Issue: Service Keeps Sleeping
**Solution:**
- Set up UptimeRobot to ping every 5 minutes
- Or upgrade to Starter plan ($7/mo)

---

## 🆚 Render vs Railway

| Feature | Render (Free) | Railway ($5-10/mo) |
|---------|---------------|-------------------|
| **Cost** | FREE | $5-10/month |
| **RAM** | 512MB | 512MB-8GB |
| **Storage** | 1GB | Flexible |
| **Sleep** | Yes (15min) | No |
| **Wake Time** | ~30 seconds | N/A |
| **Setup** | 10 minutes | 5 minutes |
| **Best For** | Testing/Demo | Production |

---

## 🎯 Recommendation

### **Use Render FREE if:**
- ✅ You're testing/prototyping
- ✅ Budget is $0
- ✅ Sleep time is acceptable
- ✅ Low traffic expected

### **Use Railway ($5-10/mo) if:**
- ✅ You need 24/7 availability
- ✅ No sleep time acceptable
- ✅ Higher traffic expected
- ✅ Production deployment

---

## 📊 Keep-Alive Setup (Optional)

To prevent sleeping, use **UptimeRobot** (free):

1. Sign up: https://uptimerobot.com/
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://your-app.onrender.com/health`
   - Interval: 5 minutes
3. Your app will stay awake!

---

## ✅ Post-Deployment Checklist

- [ ] Service deployed successfully
- [ ] Health check passes
- [ ] API docs accessible
- [ ] Environment variables set
- [ ] Persistent disk mounted
- [ ] Grok API tested
- [ ] Frontend deployed (optional)
- [ ] Custom domain added (optional)
- [ ] Keep-alive monitor set up (optional)

---

## 🔗 Quick Links

- **Render Dashboard**: https://dashboard.render.com/
- **Your Service**: Check dashboard after deployment
- **Documentation**: https://render.com/docs
- **Support**: https://render.com/support

---

## 💡 Pro Tips

1. **Use Keep-Alive**: Set up UptimeRobot to prevent sleep
2. **Monitor Logs**: Check logs regularly for errors
3. **Upgrade When Ready**: $7/month removes sleep
4. **Use CDN**: Render includes CDN for static files
5. **Custom Domain**: Add your own domain (free)

---

## 🎉 Success!

Once deployed, your Intelekt app will be:
- ✅ Live on the internet (FREE!)
- ✅ Accessible via HTTPS
- ✅ Backed by persistent storage
- ✅ Ready for testing and demos

**Your app is now live for FREE! 🚀**

---

## 📞 Need Help?

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com/
- **Support**: Contact via dashboard

---

**Deploy now and have your app live in 10 minutes - completely FREE! 🎊**
