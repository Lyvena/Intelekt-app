# Intelekt - Deployment Guide

## 🚀 Recommended Hosting Options

### ⭐ **Option 1: Railway.app (RECOMMENDED)**

**Best for:** Quick deployment, development, small-to-medium projects

#### Why Railway?
- ✅ One-click deployment from GitHub
- ✅ Automatic HTTPS and custom domains
- ✅ Persistent storage for ChromaDB
- ✅ Native Python/FastAPI support
- ✅ Free tier ($5 credit/month)
- ✅ Easy environment variables
- ✅ Auto-deploy on git push

#### Deployment Steps:

1. **Push to GitHub** (already done!)
   ```bash
   # Your code is at: https://github.com/Lyvena/Intelekt-app
   ```

2. **Sign up for Railway**
   - Visit: https://railway.app/
   - Sign in with GitHub

3. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `Lyvena/Intelekt-app`

4. **Configure Service**
   - Railway will auto-detect Python
   - Set root directory: `backend`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

5. **Add Environment Variables**
   ```
   ANTHROPIC_API_KEY=your_claude_key
   XAI_API_KEY=your_grok_key
   CHROMADB_PATH=./data/chromadb
   PROJECTS_PATH=./generated_projects
   ```

6. **Add Persistent Volume**
   - Go to "Variables" tab
   - Add volume mount: `/app/backend/data`
   - This persists ChromaDB data

7. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your API will be live!

8. **Deploy Frontend**
   - Create another service for frontend
   - Or use Vercel/Netlify (see below)

**Pricing:** Free tier, then ~$5-10/month

---

### ⭐ **Option 2: Render.com**

**Best for:** Free hosting, hobby projects

#### Deployment Steps:

1. **Create Web Service**
   - Go to: https://render.com/
   - Click "New +" → "Web Service"
   - Connect GitHub: `Lyvena/Intelekt-app`

2. **Configure Build**
   - Name: `intelekt-backend`
   - Root Directory: `backend`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Add Environment Variables**
   - Same as Railway (see above)

4. **Add Disk**
   - Go to "Disks" section
   - Add disk at `/app/backend/data`
   - Size: 1GB (free tier)

5. **Deploy**
   - Click "Create Web Service"
   - Free tier: Service sleeps after 15 min inactivity

**Pricing:** Free tier available, paid starts at $7/month

---

### ⭐ **Option 3: Fly.io**

**Best for:** Global edge deployment, low latency

#### Deployment Steps:

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Create Dockerfile** (already included below)

4. **Launch App**
   ```bash
   cd backend
   fly launch
   ```

5. **Set Secrets**
   ```bash
   fly secrets set ANTHROPIC_API_KEY=your_key
   fly secrets set XAI_API_KEY=your_key
   ```

6. **Create Volume**
   ```bash
   fly volumes create intelekt_data --size 1
   ```

7. **Deploy**
   ```bash
   fly deploy
   ```

**Pricing:** Free tier (3 shared-cpu-1x VMs), then pay-as-you-go

---

### ⭐ **Option 4: DigitalOcean App Platform**

**Best for:** Scalability, managed services

#### Deployment Steps:

1. **Create App**
   - Go to: https://cloud.digitalocean.com/apps
   - Click "Create App"
   - Connect GitHub: `Lyvena/Intelekt-app`

2. **Configure**
   - Detect Python app automatically
   - Set source directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Run command: `uvicorn main:app --host 0.0.0.0 --port 8080`

3. **Add Environment Variables**
   - Same as above

4. **Deploy**
   - Click "Create Resources"

**Pricing:** Starts at $5/month

---

## 🌐 **Frontend Deployment Options**

### **Option 1: Vercel (RECOMMENDED for Frontend)**

```bash
cd frontend
npm install -g vercel
vercel
```

- ✅ Free tier
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Perfect for React/Vite

### **Option 2: Netlify**

```bash
cd frontend
npm install -g netlify-cli
netlify deploy
```

- ✅ Free tier
- ✅ Continuous deployment
- ✅ Form handling

### **Option 3: Cloudflare Pages**

- ✅ Free unlimited bandwidth
- ✅ Fast global CDN
- ✅ Good for static sites

**Note:** Update `frontend/src/services/api.ts` with your backend URL after deployment.

---

## ❌ **Why NOT Cloudflare Workers?**

Cloudflare Workers is **NOT suitable** for Intelekt because:

1. **No Persistent Storage** - Can't store generated projects or ChromaDB
2. **30-second Timeout** - AI API calls take longer
3. **128MB Memory Limit** - Too small for ChromaDB
4. **No Native Python** - FastAPI won't run
5. **Stateless** - Loses data between requests

**Cloudflare Workers is great for:**
- Serverless functions
- Edge computing
- API proxies
- Static site serving

**But NOT for:**
- Full-stack applications with databases
- Long-running processes
- File storage
- Python applications like Intelekt

---

## 🐳 **Docker Deployment (Advanced)**

For maximum control, use Docker:

### Dockerfile (Backend)

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

RUN mkdir -p data/chromadb generated_projects

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Deploy to:
- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Instances**
- **Your own VPS**

---

## 📊 **Comparison Table**

| Platform | Cost | Setup Time | Scalability | Best For |
|----------|------|------------|-------------|----------|
| **Railway** | $5-10/mo | 5 min | Good | Quick start |
| **Render** | Free-$7/mo | 10 min | Good | Free hosting |
| **Fly.io** | Free-$10/mo | 15 min | Excellent | Global edge |
| **DigitalOcean** | $5-20/mo | 15 min | Excellent | Production |
| **AWS/GCP/Azure** | $20-50/mo | 30+ min | Excellent | Enterprise |
| **Cloudflare Workers** | ❌ Not suitable | - | - | - |

---

## 🎯 **My Recommendation**

### For Development/Testing:
**Render.com** (Free tier)

### For Production:
**Railway.app** (Best balance of ease and features)

### For Scale:
**Fly.io** or **DigitalOcean**

### For Enterprise:
**AWS/GCP/Azure** with managed services

---

## 🔧 **Post-Deployment Checklist**

After deploying:

- [ ] Test API endpoints (`/health`, `/docs`)
- [ ] Verify environment variables are set
- [ ] Test AI providers (Claude and Grok)
- [ ] Create a test project
- [ ] Generate test code
- [ ] Export a project
- [ ] Check persistent storage
- [ ] Set up monitoring
- [ ] Configure custom domain (optional)
- [ ] Set up SSL certificate (usually automatic)

---

## 📞 **Support**

- **Railway**: https://railway.app/help
- **Render**: https://render.com/docs
- **Fly.io**: https://fly.io/docs
- **DigitalOcean**: https://docs.digitalocean.com/

---

## 🚀 **Quick Start Command**

For Railway (fastest):
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

For Render (free):
1. Go to https://render.com/
2. Connect GitHub
3. Deploy!

---

**Choose Railway for the easiest deployment experience! 🎉**
