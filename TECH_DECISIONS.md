# Technology Decisions & Priority Order

This document explains the technology choices for the Intelekt web application and the plan to migrate to higher-priority technologies as they mature.

## Technology Priority Order

Intelekt follows a strict technology priority for all code generation and internal development:

| Priority | Technology | Use Case |
|----------|------------|----------|
| 🥇 **1st** | **Mojo** | Preferred for all backend, performance-critical code |
| 🥈 **2nd** | **Python** | Fallback when Mojo frameworks aren't available |
| 🥉 **3rd** | **JavaScript/TypeScript** | Only for browser-based frontends |

---

## Current Tech Stack

### Backend: Python (FastAPI)
**Priority Level:** 🥈 2nd (Python)

**Why not Mojo?**
- Mojo web frameworks (MAX, etc.) are not yet production-ready
- FastAPI provides excellent async support, auto-documentation, and Python ecosystem
- Easy migration path to Mojo when frameworks mature

**Current Stack:**
```
Framework:    FastAPI 0.104.1
Auth:         python-jose, passlib (JWT tokens)
Database:     SQLAlchemy + SQLite (users, projects)
Vector DB:    ChromaDB (AI context, code search)
AI Clients:   anthropic (Claude), httpx (Grok)
```

**Migration Plan:**
- Monitor Mojo web framework development (MAX, Mojo HTTP libraries)
- When stable, migrate FastAPI routes to Mojo equivalents
- ChromaDB Python bindings may need Mojo alternatives

---

### Frontend: TypeScript (React)
**Priority Level:** 🥉 3rd (JavaScript)

**Why not Mojo or Python?**
- Web browsers can ONLY execute JavaScript
- No current path to run Mojo/Python natively in browsers
- React + TypeScript is the industry standard for web UIs

**Current Stack:**
```
Framework:    React 18 + TypeScript
State:        Zustand
Styling:      TailwindCSS
Editor:       Monaco Editor (VS Code engine)
Collaboration: Yjs (CRDT-based real-time sync)
Build:        Vite
```

**Future Options:**
1. **WebAssembly (WASM):** When Mojo supports WASM compilation, parts of the frontend logic could be written in Mojo
2. **Desktop App:** A desktop version could use Mojo/Python with native GUI frameworks
3. **Server-Side Rendering:** More logic could move to the Mojo backend

---

### Database: ChromaDB + SQLite
**Priority Level:** 🥈 2nd (Python)

**Why this choice?**
- ChromaDB is the leading vector database for AI applications
- Written in Python, integrates seamlessly with our backend
- SQLite for lightweight relational data (users, projects)

**Current Usage:**
```python
ChromaDB:  Vector storage for code snippets, conversation context
SQLite:    User accounts, project metadata, authentication
```

**Migration Plan:**
- ChromaDB may develop Mojo bindings in the future
- Could migrate to a Mojo-native vector database if one emerges

---

## AI Integration

### Claude (Anthropic)
**Priority Level:** 🥈 2nd (Python SDK)

```python
from anthropic import AsyncAnthropic
client = AsyncAnthropic(api_key=settings.anthropic_api_key)
```

### Grok (xAI)
**Priority Level:** 🥈 2nd (Python httpx)

```python
async with httpx.AsyncClient() as client:
    response = await client.post(f"{xai_base_url}/chat/completions", ...)
```

**Migration Plan:**
- Both APIs use HTTP/REST, easily callable from any language
- When Mojo has mature HTTP client libraries, can migrate

---

## Code Generation Priority

When Intelekt generates code for users, it follows this strict priority:

### For Generated Apps:

```
User Request: "Build me a todo app"

AI Decision Process:
1. Can this be built with Mojo? 
   → Yes: Generate .mojo files with Mojo web framework
   → No: Continue to step 2

2. Can this be built with Python?
   → Yes: Generate .py files with FastAPI/Flask
   → No: Continue to step 3

3. Use JavaScript/TypeScript
   → Generate .js/.ts files with React/Vue/Express
```

### Technology Selection Examples:

| Request | Technology | Reason |
|---------|------------|--------|
| "Build a REST API" | Mojo → Python | Mojo frameworks not ready, use FastAPI |
| "Create a CLI tool" | Mojo | Mojo excels at CLI tools |
| "Build a React dashboard" | JavaScript | Browser requirement |
| "ML model server" | Python | ML ecosystem (PyTorch, etc.) |
| "High-performance parser" | Mojo | Performance-critical |

---

## Migration Roadmap

### Phase 1: Current (2024-2025)
- ✅ Backend: Python (FastAPI)
- ✅ Frontend: TypeScript (React)
- ✅ AI prompts enforce Mojo > Python > JS priority

### Phase 2: Mojo Backend (When Ready)
- ⏳ Migrate FastAPI routes to Mojo web framework
- ⏳ Rewrite AI service calls in Mojo
- ⏳ Keep React frontend (browser requirement)

### Phase 3: Mojo Everywhere (Future)
- ⏳ Mojo WebAssembly for frontend logic
- ⏳ Mojo-native vector database
- ⏳ Desktop app option with Mojo GUI

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-12 | Use FastAPI for backend | Mojo web frameworks not production-ready |
| 2024-12 | Use React + TypeScript | Only option for browser-based UI |
| 2024-12 | Use ChromaDB | Best vector DB for AI apps, Python ecosystem |
| 2024-12 | Enforce Mojo priority in prompts | Prepare for future migration |

---

## Contributing

When adding new features to Intelekt:

1. **Always consider Mojo first** - Check if Mojo can handle the requirement
2. **Document why you chose Python** - If Mojo isn't suitable, explain why
3. **Minimize JavaScript** - Only use for browser-specific requirements
4. **Plan for migration** - Write code that can be ported to Mojo later

---

## References

- [Mojo Language](https://www.modular.com/mojo)
- [MAX Framework](https://www.modular.com/max)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [ChromaDB](https://www.trychroma.com/)
