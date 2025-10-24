# Intelekt - AI-Powered Web App Builder

Intelekt is an intelligent web application builder powered by Claude and Grok AI models. Build complete web applications through natural language chat conversations.

## Features

- 🤖 **Dual AI Support**: Choose between Claude (Anthropic) or Grok (xAI) for code generation
- 💬 **Chat-Based Interface**: Build apps through conversational interactions
- 🎯 **Multi-Stack Support**: Generate apps in Mojo, Python, or JavaScript
- 🗄️ **ChromaDB Integration**: Vector database for context management and code snippets
- 🎨 **Modern UI**: Beautiful, responsive interface built with React and TailwindCSS
- 📁 **Project Management**: Create, manage, and export generated projects

## Tech Stack

### Intelekt Platform
- **Backend**: Python with FastAPI
- **Frontend**: React with TypeScript, TailwindCSS, shadcn/ui
- **Database**: ChromaDB (vector storage)
- **AI Providers**: Claude API, Grok API

### Generated Apps Support
1. **Priority 1**: Mojo language and frameworks
2. **Priority 2**: Python (Flask, FastAPI, Django)
3. **Priority 3**: JavaScript (React, Next.js, Vue, Express)

## Prerequisites

- Python 3.9+
- Node.js 18+
- API Keys:
  - Anthropic API Key (for Claude)
  - xAI API Key (for Grok)

## Installation

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```https://github.com/Lyvena/Intelekt-app

## Configuration

Create a `.env` file in the `backend` directory:

```env
ANTHROPIC_API_KEY=your_claude_api_key_here
XAI_API_KEY=your_grok_api_key_here
CHROMADB_PATH=./data/chromadb
PROJECTS_PATH=./generated_projects
```

## Running the Application

### Start Backend

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Start Frontend

```bash
cd frontend
npm run dev
```

Access the application at `http://localhost:5173`

## Usage

1. **Select AI Provider**: Choose between Claude or Grok
2. **Start Chatting**: Describe the web app you want to build
3. **Review Generated Code**: See real-time code generation
4. **Iterate**: Refine your app through conversation
5. **Export**: Download your completed project

## Project Structure

```
intelekt-app/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── models/                 # Data models
│   ├── services/               # Business logic
│   │   ├── ai_service.py      # AI provider integration
│   │   ├── code_generator.py  # Code generation logic
│   │   └── chroma_service.py  # ChromaDB operations
│   ├── routes/                 # API endpoints
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API client
│   │   └── App.tsx
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## API Endpoints

- `POST /api/chat` - Send chat message and receive AI response
- `GET /api/projects` - List all generated projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get project details
- `POST /api/export/{id}` - Export project as ZIP

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
