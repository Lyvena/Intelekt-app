# Deploying Intelekt to Divio

## 🎯 Overview

Divio is a professional Platform-as-a-Service (PaaS) for Python applications. It's well-suited for Intelekt, especially for production deployments.

---

## ✅ **Is Divio Right for Intelekt?**

### **YES, if you need:**
- ✅ Professional hosting with managed services
- ✅ Enterprise-grade reliability
- ✅ European hosting (GDPR compliance)
- ✅ Managed database and storage
- ✅ Automatic backups
- ✅ Production-ready infrastructure

### **Consider alternatives if:**
- ⚠️ Budget is limited (€49/month minimum)
- ⚠️ You're just testing/prototyping
- ⚠️ You need a free tier

---

## 💰 **Pricing**

| Plan | Price | Resources | Best For |
|------|-------|-----------|----------|
| **Standard** | €49/mo | 512MB RAM, 1 CPU | Small apps |
| **Business** | €99/mo | 1GB RAM, 2 CPU | Production |
| **Professional** | €199/mo | 2GB RAM, 4 CPU | High traffic |

**Note:** More expensive than Railway ($5-10) or Render ($7), but includes managed services.

---

## 🚀 **Deployment Steps**

### **Step 1: Sign Up for Divio**

1. Go to https://www.divio.com/
2. Click "Sign Up"
3. Choose a plan (starts at €49/month)
4. Verify your account

### **Step 2: Install Divio CLI**

```bash
# Install Divio CLI
pip install divio-cli

# Login to Divio
divio login
```

### **Step 3: Create Divio Project**

```bash
# Navigate to your project
cd "/home/the-computer/Products/Intelekt app"

# Initialize Divio project
divio project setup

# Follow the prompts:
# - Project name: intelekt
# - Region: Choose closest to your users
# - Python version: 3.10
```

### **Step 4: Configure Environment Variables**

In Divio Control Panel:

1. Go to your project → "Environment Variables"
2. Add the following:

```
ANTHROPIC_API_KEY=your_claude_api_key
XAI_API_KEY=your_grok_api_key
CHROMADB_PATH=/data/chromadb
PROJECTS_PATH=/data/generated_projects
PORT=80
```

### **Step 5: Configure Storage**

Divio uses S3-compatible storage:

1. Go to "Storage" in Control Panel
2. Create a bucket for persistent data
3. Mount it to `/data`

Update `backend/config.py` if needed to use Divio's storage.

### **Step 6: Deploy**

```bash
# Push to Divio
divio project deploy

# Or use Git deployment
git remote add divio <your-divio-git-url>
git push divio main
```

### **Step 7: Set Up Database (Optional)**

If you need PostgreSQL for future features:

```bash
# Divio automatically provisions PostgreSQL
# Connection details available in environment variables:
# DATABASE_URL
```

### **Step 8: Configure Domain**

1. Go to "Domains" in Control Panel
2. Add your custom domain
3. Divio handles SSL automatically

---

## 📁 **Project Structure for Divio**

Divio expects this structure:

```
intelekt-app/
├── .divio/
│   └── config.json          # Divio configuration
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
├── Dockerfile.divio         # Divio-optimized Dockerfile
└── docker-compose.yml       # For local development
```

---

## 🔧 **Divio-Specific Configuration**

### **Update backend/config.py for Divio:**

```python
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Keys
    anthropic_api_key: Optional[str] = None
    xai_api_key: Optional[str] = None
    
    # Storage - Use Divio's storage
    chromadb_path: str = os.getenv("CHROMADB_PATH", "./data/chromadb")
    projects_path: str = os.getenv("PROJECTS_PATH", "./generated_projects")
    
    # Server - Divio uses PORT env var
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", 8000))
    
    # Database - If using PostgreSQL
    database_url: Optional[str] = os.getenv("DATABASE_URL")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

---

## 🐳 **Local Development with Divio**

```bash
# Pull environment from Divio
divio project pull db    # Pull database
divio project pull media # Pull media files

# Run locally with Docker
docker-compose up

# Or use Divio's local server
divio project up
```

---

## 📊 **Divio vs Alternatives**

### **Divio Advantages:**
- ✅ Managed PostgreSQL database
- ✅ S3-compatible object storage
- ✅ Automatic backups
- ✅ European data centers (GDPR)
- ✅ Professional support
- ✅ Docker-based (full control)
- ✅ Easy scaling
- ✅ SSL certificates included

### **Divio Disadvantages:**
- ❌ More expensive (€49+ vs $5-10)
- ❌ No free tier
- ❌ Django-focused (FastAPI works but not primary)
- ❌ Steeper learning curve

### **When to Choose Divio:**
- Production applications
- Need managed services
- European hosting required
- Budget allows €49+/month
- Want professional support

### **When to Choose Alternatives:**
- **Railway** ($5-10/mo) - Quick deployment, any framework
- **Render** (Free-$7/mo) - Free tier, hobby projects
- **Fly.io** (Free-$10/mo) - Global edge deployment

---

## 🔍 **Comparison Table**

| Feature | Divio | Railway | Render | Fly.io |
|---------|-------|---------|--------|--------|
| **Price** | €49+/mo | $5-10/mo | Free-$7/mo | Free-$10/mo |
| **Free Tier** | ❌ No | ⚠️ Limited | ✅ Yes | ✅ Yes |
| **Setup Time** | 15-20 min | 5 min | 10 min | 15 min |
| **Python Support** | ✅ Excellent | ✅ Good | ✅ Good | ✅ Good |
| **Managed DB** | ✅ Yes | ⚠️ Add-on | ⚠️ Add-on | ❌ No |
| **Object Storage** | ✅ Included | ❌ No | ❌ No | ❌ No |
| **Backups** | ✅ Automatic | ❌ Manual | ❌ Manual | ❌ Manual |
| **Support** | ✅ Professional | ⚠️ Community | ⚠️ Community | ⚠️ Community |
| **Best For** | Production | Quick start | Free hosting | Global edge |

---

## 🎯 **My Recommendation**

### **For Intelekt:**

1. **Development/Testing**: Use **Railway** or **Render** (cheaper, faster)
2. **Production (Budget-Friendly)**: Use **Railway** ($5-10/mo)
3. **Production (Professional)**: Use **Divio** (€49+/mo) if you need:
   - Managed services
   - Professional support
   - European hosting
   - Automatic backups

### **Cost-Benefit Analysis:**

**Divio (€49/mo):**
- Managed database ✅
- Object storage ✅
- Automatic backups ✅
- Professional support ✅
- **Total value: Good for production**

**Railway ($10/mo):**
- DIY database setup
- DIY storage
- DIY backups
- Community support
- **Total value: Great for most use cases**

**Verdict:** Unless you specifically need Divio's managed services or European hosting, **Railway is more cost-effective** for Intelekt.

---

## 🚀 **Quick Start Commands**

### **Divio:**
```bash
pip install divio-cli
divio login
divio project setup
divio project deploy
```

### **Railway (Alternative):**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## 📞 **Support Resources**

- **Divio Docs**: https://docs.divio.com/
- **Divio Support**: support@divio.com
- **Divio Community**: https://community.divio.com/

---

## ✅ **Final Verdict on Divio**

**Divio is a GOOD choice for Intelekt, but:**

- ✅ **Use Divio if**: Production app, need managed services, budget allows €49+/mo
- ✅ **Use Railway if**: Quick deployment, budget-conscious, $5-10/mo is better
- ✅ **Use Render if**: Need free tier for testing

**For most users, I still recommend Railway** due to better cost-to-value ratio, but Divio is excellent for professional production deployments.

---

**Need help deciding? Here's the simple rule:**

- **Budget < $20/month**: Use Railway or Render
- **Budget > $50/month + need managed services**: Use Divio
- **Enterprise needs**: Use AWS/GCP/Azure

🚀 **Happy deploying!**
