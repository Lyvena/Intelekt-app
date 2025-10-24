# 🚀 Deployment Guide - Intelekt with Authentication

## ✅ **What's Ready to Deploy**

### **Backend:**
- ✅ Full authentication system
- ✅ User registration & login
- ✅ JWT tokens
- ✅ Protected API endpoints
- ✅ Database initialization
- ✅ User-specific projects

### **Frontend:**
- ✅ Login/Register UI
- ✅ Authentication context
- ✅ Protected routes
- ✅ User profile display
- ✅ Token management

---

## 🎯 **Deployment Steps**

### **Part 1: Deploy Backend to Render**

#### **Step 1: Prepare Environment Variables**

You'll need to add these to Render:

```
ANTHROPIC_API_KEY=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
XAI_API_KEY=xai-KDSYUdGhqJkdJtNicJCIslKPjiS3XQM3MH8W7jE1HB1dbPxOQgtHSRbe5HZmpLPezsg0ChlTGeb41EAc
SECRET_KEY=your-super-secret-key-change-this-to-something-random-and-long
```

**Generate a strong SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### **Step 2: Deploy to Render**

**Option A: Via Render Dashboard**

1. Go to: https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub: `Lyvena/Intelekt-app`
4. Configure:
   ```
   Name: intelekt-backend
   Region: Oregon (or closest to you)
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: python init_db.py && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

5. **Environment Variables:**
   - Add all three variables above
   - Click **"Add Environment Variable"** for each

6. **Advanced Settings:**
   - Plan: Free
   - Auto-Deploy: Yes

7. Click **"Create Web Service"**

**Option B: Via render.yaml (Already exists)**

The `render.yaml` file is already configured. Just:
1. Push to GitHub (already done ✅)
2. Render will auto-detect and deploy

#### **Step 3: Initialize Database**

The database will auto-initialize on first startup because of:
```python
# In main.py
Base.metadata.create_all(bind=engine)
```

And the start command runs `init_db.py` which creates the demo user.

#### **Step 4: Verify Backend**

After deployment (2-3 minutes):

```bash
# Check health
curl https://app1.theintelekt.xyz/health

# Should return:
{
  "status": "healthy",
  "anthropic_configured": true,
  "xai_configured": true
}

# Test demo login
curl -X POST https://app1.theintelekt.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo123"}'
```

---

### **Part 2: Deploy Frontend to Cloudflare Pages**

#### **Step 1: Configure Cloudflare Pages**

1. Go to: https://dash.cloudflare.com/
2. Click **"Pages"** → **"Create a project"**
3. Connect GitHub: `Lyvena/Intelekt-app`
4. Configure:
   ```
   Project name: intelekt-frontend
   Production branch: main
   Framework preset: None
   Build command: npm install && npm run build
   Build output directory: dist
   Root directory: frontend
   ```

5. **Environment Variables:**
   ```
   VITE_API_URL = https://app1.theintelekt.xyz
   ```

6. Click **"Save and Deploy"**

#### **Step 2: Add Custom Domain**

After deployment:

1. Go to **"Custom domains"** tab
2. Click **"Set up a custom domain"**
3. Enter: `app.theintelekt.xyz`
4. Cloudflare will auto-configure DNS
5. SSL is automatic

#### **Step 3: Verify Frontend**

Visit: `https://app.theintelekt.xyz`

You should see:
- ✅ Beautiful login form
- ✅ Can switch to register
- ✅ Demo credentials shown

---

## �� **Testing the Deployed App**

### **Test 1: Login with Demo User**

1. Visit: `https://app.theintelekt.xyz`
2. Use credentials:
   - Username: `demo`
   - Password: `demo123`
3. Should see main app with user header

### **Test 2: Register New User**

1. Click "Sign up"
2. Fill in:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `testpass123`
3. Should auto-login and see main app

### **Test 3: Create Project**

1. After login, click "New Project"
2. Create a test project
3. Should be saved to your account only

### **Test 4: Logout and Login**

1. Click logout
2. Login again
3. Should see your projects

---

## 🔧 **Render Configuration**

### **Current Setup:**

```yaml
services:
  - type: web
    name: intelekt-backend
    runtime: python
    region: oregon
    plan: free
    branch: main
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: python init_db.py && uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: XAI_API_KEY
        sync: false
      - key: SECRET_KEY
        sync: false
```

### **Database:**

- **Type:** SQLite (file-based)
- **Location:** `/data/intelekt.db` (on Render's persistent disk)
- **Backup:** Automatic with Render's disk snapshots

### **Persistent Storage:**

Add to render.yaml if needed:
```yaml
disk:
  name: intelekt-data
  mountPath: /data
  sizeGB: 1
```

---

## 🌐 **DNS Configuration**

### **Cloudflare DNS Records:**

| Type | Name | Target | Proxy | Purpose |
|------|------|--------|-------|---------|
| CNAME | app | intelekt-frontend.pages.dev | ☁️ On | Frontend |
| CNAME | app1 | intelekt-backend.onrender.com | ☁️ On | Backend |

Both should be **Proxied** (orange cloud) for:
- DDoS protection
- SSL/TLS
- Caching
- Analytics

---

## 🔒 **Security Checklist**

Before going live:

- [ ] Change SECRET_KEY to a strong random value
- [ ] Verify CORS origins in backend/config.py
- [ ] Enable HTTPS only (Cloudflare handles this)
- [ ] Set up Cloudflare firewall rules (optional)
- [ ] Enable rate limiting (optional)
- [ ] Set up monitoring/alerts
- [ ] Review user permissions
- [ ] Test authentication flow
- [ ] Test project isolation (users can't see each other's projects)

---

## 📊 **Monitoring**

### **Backend (Render):**
- Dashboard: https://dashboard.render.com/
- Logs: Real-time in dashboard
- Metrics: CPU, Memory, Requests
- Alerts: Email notifications

### **Frontend (Cloudflare):**
- Dashboard: https://dash.cloudflare.com/
- Analytics: Traffic, Performance
- Logs: Build logs and function logs
- Alerts: Build failures

### **UptimeRobot:**
- Monitor: `https://app1.theintelekt.xyz/health`
- Interval: 5 minutes
- Keeps backend awake 24/7

---

## 💰 **Cost Breakdown**

| Service | Plan | Cost |
|---------|------|------|
| Render (Backend) | Free | $0/month |
| Cloudflare Pages | Free | $0/month |
| Cloudflare DNS | Free | $0/month |
| UptimeRobot | Free | $0/month |
| Domain | Owned | $0/month |
| **Total Infrastructure** | | **$0/month** |
| Claude API | Pay-as-you-go | ~$0.01-0.10/day |
| Grok API | Pay-as-you-go | Variable |
| **Total with API usage** | | **~$3-10/month** |

---

## 🚀 **Quick Deploy Commands**

### **Backend (if manual deploy needed):**
```bash
cd backend
pip install -r requirements.txt
python init_db.py
python main.py
```

### **Frontend (local test):**
```bash
cd frontend
npm install
npm run dev
```

### **Frontend (build):**
```bash
cd frontend
npm install
npm run build
```

---

## 🎯 **Post-Deployment Tasks**

### **Immediate:**
1. Test login/register
2. Create a test project
3. Verify project isolation
4. Test logout/login
5. Check UptimeRobot is monitoring

### **Within 24 hours:**
1. Monitor error logs
2. Check API usage
3. Test from different devices
4. Verify SSL certificates
5. Test mobile responsiveness

### **Within 1 week:**
1. Gather user feedback
2. Monitor performance
3. Check database size
4. Review security logs
5. Plan next features

---

## 🆘 **Troubleshooting**

### **Backend won't start:**
- Check Render logs
- Verify environment variables
- Check requirements.txt
- Verify Python version

### **Frontend build fails:**
- Check Cloudflare build logs
- Verify VITE_API_URL is set
- Check for TypeScript errors
- Verify node_modules

### **Authentication not working:**
- Check SECRET_KEY is set
- Verify CORS origins
- Check API URL in frontend
- Test with curl

### **Database issues:**
- Check if init_db.py ran
- Verify disk is mounted
- Check file permissions
- Review SQLAlchemy logs

---

## 📞 **Support Resources**

- **Render Docs**: https://render.com/docs
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Docs**: https://react.dev/

---

## ✅ **Deployment Checklist**

- [x] Backend code complete
- [x] Frontend code complete
- [x] Authentication implemented
- [x] Database models created
- [x] Environment variables documented
- [ ] **Deploy backend to Render** ← Do this now
- [ ] **Deploy frontend to Cloudflare** ← Then this
- [ ] Test authentication
- [ ] Verify project isolation
- [ ] Set up monitoring
- [ ] Update documentation

---

## 🎉 **You're Ready to Deploy\!**

Everything is prepared and tested. Just follow the steps above to deploy both backend and frontend.

**Estimated deployment time:** 15-20 minutes

**Your Intelekt app with full authentication will be live\! 🚀**
