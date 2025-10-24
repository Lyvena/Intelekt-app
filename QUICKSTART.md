# Intelekt - Quick Start Guide

## Prerequisites

- Python 3.9+
- Node.js 18+
- API Keys:
  - Anthropic API Key (for Claude) - Get it from https://console.anthropic.com/
  - xAI API Key (for Grok) - Get it from https://x.ai/

## Quick Setup (Automated)

```bash
chmod +x setup.sh
./setup.sh
```

Then edit `backend/.env` with your API keys.

## Manual Setup

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

## Running the Application

### Terminal 1 - Backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at http://localhost:8000

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at http://localhost:5173

## First Steps

1. Open http://localhost:5173 in your browser
2. Click "New Project" or "Create Your First Project"
3. Enter project details:
   - **Name**: Your project name
   - **Description**: What you want to build
   - **Tech Stack**: Choose Mojo, Python, or JavaScript
4. Select your AI provider (Claude or Grok)
5. Start chatting to build your app!

## Example Prompts

- "Create a REST API with user authentication"
- "Build a todo list with CRUD operations"
- "Set up a FastAPI backend with PostgreSQL"
- "Create a React component for displaying user profiles"
- "Add a database model for blog posts"

## Project Structure

```
intelekt-app/
├── backend/              # Python FastAPI backend
│   ├── main.py          # Main application
│   ├── models/          # Data models
│   ├── services/        # Business logic
│   ├── routes/          # API endpoints
│   └── data/            # ChromaDB storage
├── frontend/            # React frontend
│   └── src/
│       ├── App.tsx      # Main component
│       ├── services/    # API client
│       └── types/       # TypeScript types
└── README.md
```

## API Endpoints

- `POST /api/chat` - Send messages and generate code
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get project details
- `POST /api/projects/{id}/export` - Export project as ZIP

## Troubleshooting

### Backend Issues

**Error: "Anthropic API key not configured"**
- Make sure you've added `ANTHROPIC_API_KEY` to `backend/.env`

**Error: "xAI API key not configured"**
- Make sure you've added `XAI_API_KEY` to `backend/.env`

**Port 8000 already in use**
```bash
# Find and kill the process
lsof -ti:8000 | xargs kill -9
```

### Frontend Issues

**Port 5173 already in use**
```bash
# Find and kill the process
lsof -ti:5173 | xargs kill -9
```

**Dependencies not installing**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Features

- ✅ Dual AI support (Claude & Grok)
- ✅ Multi-language code generation (Mojo, Python, JavaScript)
- ✅ Real-time chat interface
- ✅ Project management
- ✅ File generation and tracking
- ✅ Project export (ZIP)
- ✅ ChromaDB vector storage for context
- ✅ Beautiful modern UI

## Tech Stack

### Intelekt Platform
- **Backend**: Python, FastAPI, ChromaDB
- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **AI**: Claude API, Grok API

### Generated Apps
- **Priority 1**: Mojo (when frameworks mature)
- **Priority 2**: Python (Flask, FastAPI, Django)
- **Priority 3**: JavaScript (React, Next.js, Vue, Express)

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the main README.md
3. Check API documentation at http://localhost:8000/docs

## License

MIT License
