#!/bin/bash

# Intelekt - GitHub Deployment Script
# This script will push your Intelekt app to GitHub

echo "🚀 Intelekt - GitHub Deployment"
echo "================================"
echo ""

# Repository URL
REPO_URL="https://github.com/Lyvena/Intelekt-app.git"

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the Intelekt app root directory"
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo ""

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git repository already initialized"
fi

echo ""

# Check if remote exists
if git remote | grep -q "origin"; then
    echo "🔗 Remote 'origin' already exists, updating URL..."
    git remote set-url origin "$REPO_URL"
else
    echo "🔗 Adding remote 'origin'..."
    git remote add origin "$REPO_URL"
fi

echo "✅ Remote configured: $REPO_URL"
echo ""

# Security check
echo "🔒 Running security check..."
echo "Checking for API keys in code..."

# Check for potential secrets (excluding .env.example)
if grep -r "sk-ant-" . --exclude-dir={node_modules,venv,.git,data,generated_projects} --exclude="*.md" --exclude=".env.example" 2>/dev/null | grep -v "your_"; then
    echo "⚠️  WARNING: Found potential Anthropic API key in code!"
    echo "Please remove it before pushing."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if grep -r "xai-" . --exclude-dir={node_modules,venv,.git,data,generated_projects} --exclude="*.md" --exclude=".env.example" 2>/dev/null | grep -v "your_"; then
    echo "⚠️  WARNING: Found potential xAI API key in code!"
    echo "Please remove it before pushing."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Security check passed"
echo ""

# Show what will be committed
echo "📋 Files to be committed:"
git add .
git status --short
echo ""

# Count files
FILE_COUNT=$(git ls-files | wc -l)
echo "📊 Total files: $FILE_COUNT"
echo ""

# Confirm before committing
read -p "🤔 Ready to commit and push to GitHub? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "📝 Creating commit..."

# Create commit
git commit -m "Initial commit: Complete Intelekt AI Web App Builder

Features:
- FastAPI backend with Claude & Grok AI integration
- React TypeScript frontend with modern UI
- ChromaDB vector storage for context management
- Multi-language code generation (Mojo, Python, JavaScript)
- Project management with CRUD operations
- Project export functionality
- Comprehensive documentation (8 guides)
- Automated setup script
- Production-ready architecture

Tech Stack:
- Backend: Python 3.9+, FastAPI, ChromaDB, Anthropic SDK
- Frontend: React 18, TypeScript, Vite, TailwindCSS
- Database: ChromaDB (vector storage)
- AI: Claude (Anthropic), Grok (xAI)

Documentation:
- README.md - Main overview
- QUICKSTART.md - Quick start guide
- ARCHITECTURE.md - Technical architecture
- PROJECT_SUMMARY.md - Feature summary
- STATUS.md - Project status
- GIT_DEPLOYMENT_GUIDE.md - This deployment guide
- LINT_ERRORS_EXPLAINED.md - Development notes
- FILE_STRUCTURE.txt - Visual file tree"

if [ $? -eq 0 ]; then
    echo "✅ Commit created successfully"
else
    echo "❌ Commit failed"
    exit 1
fi

echo ""
echo "🚀 Pushing to GitHub..."
echo "Repository: $REPO_URL"
echo ""

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Your code has been pushed to GitHub!"
    echo ""
    echo "📍 Repository URL: https://github.com/Lyvena/Intelekt-app"
    echo ""
    echo "📋 Next steps:"
    echo "1. Visit your repository on GitHub"
    echo "2. Add a description and topics"
    echo "3. Verify all files are present"
    echo "4. Share with the world! 🌟"
    echo ""
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "Common issues:"
    echo "1. Authentication required - use Personal Access Token"
    echo "2. Repository doesn't exist - create it on GitHub first"
    echo "3. No permission - check repository access"
    echo ""
    echo "See GIT_DEPLOYMENT_GUIDE.md for detailed troubleshooting"
    exit 1
fi
