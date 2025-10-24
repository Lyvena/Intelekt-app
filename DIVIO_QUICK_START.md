# 🚀 Divio Quick Start - Deploy in 15 Minutes

## ✅ Everything is Ready!

Your code is configured for Divio and pushed to GitHub. Now just follow these steps:

---

## 📋 Step-by-Step (15 minutes total)

### 1️⃣ Create Divio Account (2 min)
- Go to: **https://www.divio.com/**
- Click **"Sign Up"**
- Choose **Standard Plan** (€49/month)

### 2️⃣ Create Project (3 min)
- Login to: **https://control.divio.com/**
- Click **"Create New Project"**
- Name: `intelekt`
- Type: Custom (Docker)
- Python: 3.10
- Region: Choose closest to you

### 3️⃣ Connect GitHub (2 min)
- Go to **"Repository"** tab
- Click **"Connect to GitHub"**
- Select: **`Lyvena/Intelekt-app`**
- Branch: **`main`**

### 4️⃣ Configure Build (2 min)
- Go to **"Settings"** → **"Build"**
- Dockerfile: `Dockerfile.divio`
- Build Context: `.`
- Save

### 5️⃣ Add Environment Variables (3 min)
Go to **"Environment Variables"** and add:

```
ANTHROPIC_API_KEY=your_claude_key_if_you_have_it
XAI_API_KEY=xai-KDSYUdGhqJkdJtNicJCIslKPjiS3XQM3MH8W7jE1HB1dbPxOQgtHSRbe5HZmpLPezsg0ChlTGeb41EAc
CHROMADB_PATH=/data/chromadb
PROJECTS_PATH=/data/generated_projects
PORT=80
PYTHONUNBUFFERED=1
```

### 6️⃣ Add Storage Volume (2 min)
- Go to **"Storage"** tab
- Click **"Add Volume"**
- Name: `intelekt-data`
- Mount Path: `/data`
- Size: 5GB

### 7️⃣ Deploy! (1 min + 5 min build time)
- Go to **"Deploy"** tab
- Click **"Deploy Test Environment"**
- Wait 5 minutes for build
- Then **"Deploy Live Environment"**

### 8️⃣ Verify (1 min)
Test your deployment:
- Health: `https://your-url/health`
- API Docs: `https://your-url/docs`

---

## ✅ Done!

Your Intelekt app is now:
- ✅ Live on Divio
- ✅ Fully managed
- ✅ Automatically backed up
- ✅ SSL secured
- ✅ Production-ready

---

## 🔗 Important Links

- **Control Panel**: https://control.divio.com/
- **Your GitHub**: https://github.com/Lyvena/Intelekt-app
- **Full Guide**: See `DIVIO_SETUP_GUIDE.md`
- **Support**: support@divio.com

---

## 💰 Cost

**€49/month** includes:
- Hosting
- PostgreSQL database
- 5GB storage
- Automatic backups
- SSL certificate
- Professional support

---

## 🆘 Need Help?

See the complete guide: **`DIVIO_SETUP_GUIDE.md`**

Or contact Divio support: **support@divio.com**

---

**🎉 Your app will be live in 15 minutes! Let's go! 🚀**
