# Intelekt Architecture

## Overview

Intelekt is an AI-powered web application builder that uses conversational AI (Claude and Grok) to generate complete web applications through natural language interactions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React + TypeScript + TailwindCSS                     │  │
│  │  - Chat Interface                                     │  │
│  │  - Project Management                                 │  │
│  │  - Code Display                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes                                           │  │
│  │  - /api/chat      - Chat & code generation           │  │
│  │  - /api/projects  - Project CRUD operations          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Services Layer                                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ AI Service │  │ ChromaDB   │  │ Code Gen   │     │  │
│  │  │            │  │ Service    │  │ Service    │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │   Claude API │        │   Grok API   │
        │  (Anthropic) │        │    (xAI)     │
        └──────────────┘        └──────────────┘

                            │
                            ▼
        ┌───────────────────────────────────────┐
        │         Data Storage                  │
        │  ┌─────────────┐  ┌─────────────┐   │
        │  │  ChromaDB   │  │  File       │   │
        │  │  (Vectors)  │  │  System     │   │
        │  └─────────────┘  └─────────────┘   │
        └───────────────────────────────────────┘
```

## Component Details

### Frontend (React + TypeScript)

**Location**: `/frontend/src/`

**Key Components**:
- `App.tsx` - Main application component with chat interface
- `services/api.ts` - API client for backend communication
- `types/index.ts` - TypeScript type definitions

**Features**:
- Real-time chat interface
- Project sidebar with CRUD operations
- AI provider selection (Claude/Grok)
- Code display with syntax highlighting
- Project export functionality
- Responsive design with TailwindCSS

### Backend (Python + FastAPI)

**Location**: `/backend/`

#### API Routes (`routes/`)

**Chat Route** (`chat.py`):
- `POST /api/chat` - Process chat messages and generate responses
- Maintains conversation history
- Triggers code generation based on context
- Returns AI responses with optional generated code

**Projects Route** (`projects.py`):
- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects
- `GET /api/projects/{id}` - Get project details
- `GET /api/projects/{id}/files` - Get all project files
- `GET /api/projects/{id}/structure` - Get directory structure
- `POST /api/projects/{id}/export` - Export as ZIP
- `DELETE /api/projects/{id}` - Delete project

#### Services Layer (`services/`)

**AI Service** (`ai_service.py`):
- Integrates with Claude (Anthropic) and Grok (xAI) APIs
- Manages conversation context and system prompts
- Generates code based on natural language prompts
- Parses AI responses to extract code components

**ChromaDB Service** (`chroma_service.py`):
- Vector database for semantic search
- Stores code snippets and templates
- Maintains conversation context
- Enables context-aware code generation

**Code Generator Service** (`code_generator.py`):
- Creates and manages projects
- Generates files based on AI responses
- Maintains project metadata
- Handles file system operations

#### Data Models (`models/`)

**Schemas** (`schemas.py`):
- `AIProvider` - Claude or Grok enum
- `TechStack` - Mojo, Python, or JavaScript enum
- `ChatMessage` - Message structure
- `ChatRequest/Response` - API contracts
- `Project` - Project metadata
- `ProjectCreate` - Project creation request

### Data Storage

#### ChromaDB (Vector Database)

**Collections**:
1. **code_snippets** - Stores generated code with metadata
2. **conversation_context** - Maintains chat history per project
3. **projects** - Project metadata and relationships

**Purpose**:
- Semantic search for relevant code examples
- Context retrieval for better code generation
- Learning from previous generations

#### File System

**Structure**:
```
backend/
├── data/
│   └── chromadb/          # Vector database storage
└── generated_projects/     # Generated project files
    └── {project_id}/
        ├── project.json   # Project metadata
        └── ...            # Generated files
```

## AI Integration

### Claude (Anthropic)

**Model**: `claude-3-5-sonnet-20241022`

**Features**:
- Advanced reasoning capabilities
- Long context window
- High-quality code generation
- Strong understanding of multiple programming languages

**Configuration**:
```python
ANTHROPIC_API_KEY=your_key_here
```

### Grok (xAI)

**Model**: `grok-beta`

**Features**:
- Real-time knowledge
- Creative problem-solving
- Multi-language support

**Configuration**:
```python
XAI_API_KEY=your_key_here
```

### System Prompt

The AI is configured with a specialized system prompt that:
- Defines its role as an expert web app builder
- Specifies tech stack priorities (Mojo → Python → JavaScript)
- Emphasizes production-ready code
- Encourages best practices and security
- Integrates ChromaDB for database needs

## Code Generation Flow

```
1. User sends message
   ↓
2. Frontend sends ChatRequest to /api/chat
   ↓
3. Backend processes request:
   a. Add message to conversation history
   b. Store in ChromaDB
   c. Search for relevant code snippets
   ↓
4. AI Service generates response:
   a. Build context from history + snippets
   b. Call AI provider (Claude/Grok)
   c. Parse response for code
   ↓
5. Code Generator (if code detected):
   a. Extract code and metadata
   b. Save to project directory
   c. Update project metadata
   d. Store in ChromaDB
   ↓
6. Return response to frontend:
   - AI message
   - Generated code (if any)
   - File path
   - Suggestions
```

## Tech Stack Priorities

### For Intelekt Platform

**Current**: Python + FastAPI + React
- Python chosen for mature AI SDK support
- FastAPI for high-performance async API
- React for modern, component-based UI

**Future**: Migrate to Mojo when frameworks mature

### For Generated Apps

**Priority 1**: Mojo
- High-performance systems programming
- Python-like syntax
- Currently limited framework ecosystem

**Priority 2**: Python
- Mature ecosystem (Flask, FastAPI, Django)
- Excellent for rapid development
- Strong AI/ML integration

**Priority 3**: JavaScript
- Universal language (frontend + backend)
- Rich framework ecosystem (React, Next.js, Vue, Express)
- Large community

## Security Considerations

1. **API Keys**: Stored in environment variables, never committed
2. **Input Validation**: Pydantic models validate all inputs
3. **CORS**: Configured for specific origins
4. **File System**: Projects isolated in dedicated directories
5. **Rate Limiting**: Should be added for production use

## Scalability

**Current Architecture**:
- Single-server deployment
- File-based project storage
- Local ChromaDB instance

**Production Recommendations**:
1. Add Redis for caching and rate limiting
2. Use cloud storage (S3) for generated projects
3. Deploy ChromaDB as separate service
4. Add load balancer for multiple backend instances
5. Implement queue system for long-running generations
6. Add authentication and user management

## Development Workflow

1. **Backend Development**:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload
   ```

2. **Frontend Development**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Testing**:
   - Backend: Add pytest tests in `backend/tests/`
   - Frontend: Add Jest/Vitest tests in `frontend/src/__tests__/`

## API Documentation

FastAPI automatically generates interactive API docs:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Future Enhancements

1. **Authentication & Authorization**
   - User accounts and project ownership
   - API key management
   - Team collaboration

2. **Advanced Code Generation**
   - Multi-file generation in single request
   - Dependency management
   - Automated testing generation
   - CI/CD pipeline generation

3. **Enhanced AI Features**
   - Code review and suggestions
   - Bug detection and fixes
   - Performance optimization
   - Security vulnerability scanning

4. **Deployment Integration**
   - One-click deployment to cloud platforms
   - Docker container generation
   - Kubernetes manifests

5. **Version Control**
   - Git integration
   - Commit history
   - Branch management

6. **Collaboration**
   - Real-time multi-user editing
   - Comments and annotations
   - Project sharing

## Monitoring & Logging

**Current**: Console logging

**Recommended for Production**:
- Structured logging (JSON format)
- Log aggregation (ELK stack, CloudWatch)
- Error tracking (Sentry)
- Performance monitoring (New Relic, DataDog)
- AI usage tracking and cost monitoring

## License

MIT License - See LICENSE file for details
