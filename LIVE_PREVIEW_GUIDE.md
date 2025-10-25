# 🎬 Live Preview Feature - Complete Guide

## Overview

The Live Preview feature allows users to **execute and preview their generated code in real-time** directly within the Intelekt application. This enables instant feedback and testing without needing to export or run code separately.

---

## ✨ Features

### **Supported Project Types**

1. **Python Projects** 🐍
   - Execute Python scripts
   - View console output
   - Real-time error messages
   - 30-second timeout protection

2. **JavaScript/Node.js Projects** 📦
   - Run Node.js applications
   - Display console output
   - Error handling
   - Timeout protection

3. **HTML/CSS/JS Projects** 🌐
   - Render HTML directly in iframe
   - Execute embedded JavaScript
   - Apply CSS styling
   - Sandbox protection

---

## 🏗️ Architecture

### Backend Components

#### **Preview Service** (`backend/services/preview_service.py`)

Handles all code execution logic:

```python
class PreviewService:
    - preview_python_project()      # Execute Python code
    - preview_javascript_project()  # Execute Node.js code
    - preview_html_project()        # Render HTML/CSS/JS
    - get_preview()                 # Retrieve preview by ID
    - cleanup_preview()             # Clean up resources
    - cleanup_old_previews()        # Maintenance cleanup
```

**Key Features:**
- Async execution with timeouts
- Isolated temporary directories
- Output capture and error handling
- Resource cleanup
- Preview ID management

#### **Preview Routes** (`backend/routes/preview.py`)

API endpoints for preview operations:

```
POST   /api/preview/python       - Execute Python project
POST   /api/preview/javascript   - Execute JavaScript project
POST   /api/preview/html         - Render HTML project
GET    /api/preview/{preview_id} - Get preview output
DELETE /api/preview/{preview_id} - Delete preview
POST   /api/preview/cleanup      - Clean old previews
```

All endpoints require authentication.

### Frontend Components

#### **PreviewPanel** (`frontend/src/components/preview/PreviewPanel.tsx`)

React component for preview UI:

```typescript
interface PreviewPanelProps {
  projectId: string;
  files: Record<string, string>;
  projectType: 'python' | 'javascript' | 'html';
  entryPoint?: string;
  onClose: () => void;
}
```

**Features:**
- Modal dialog interface
- Run/Stop controls
- Output display
- Error handling
- Copy output to clipboard
- HTML iframe rendering

---

## 🚀 Usage

### For Users

#### **1. Generate Code**
```
User: "Create a Python script that calculates fibonacci numbers"
Intelekt: [Generates main.py]
```

#### **2. Open Preview**
- Click "Preview" button in chat
- Or use keyboard shortcut (Cmd+P)

#### **3. Run Code**
- Click "Run Preview" button
- Wait for execution (max 30 seconds)
- View output or errors

#### **4. Iterate**
- Modify code in chat
- Re-run preview
- See results instantly

### For Developers

#### **Python Project Preview**

```python
# Request
POST /api/preview/python
{
    "project_id": "proj_123",
    "files": {
        "main.py": "print('Hello, World!')",
        "utils.py": "def greet(name): return f'Hi {name}'"
    },
    "entry_point": "main.py"
}

# Response
{
    "success": true,
    "preview_id": "prev_abc123",
    "output": "Hello, World!",
    "type": "python"
}
```

#### **JavaScript Project Preview**

```javascript
// Request
POST /api/preview/javascript
{
    "project_id": "proj_456",
    "files": {
        "index.js": "console.log('Hello from Node.js')",
        "helper.js": "module.exports = { add: (a,b) => a+b }"
    },
    "entry_point": "index.js"
}

// Response
{
    "success": true,
    "preview_id": "prev_def456",
    "output": "Hello from Node.js",
    "type": "javascript"
}
```

#### **HTML Project Preview**

```html
<!-- Request -->
POST /api/preview/html
{
    "project_id": "proj_789",
    "html": "<h1>Hello</h1><div id='app'></div>",
    "css": "h1 { color: blue; }",
    "js": "document.getElementById('app').textContent = 'Rendered!'"
}

<!-- Response -->
{
    "success": true,
    "preview_id": "prev_ghi789",
    "type": "html"
}

<!-- Then GET /api/preview/prev_ghi789 returns the rendered HTML -->
```

---

## 🔒 Security Features

### **Execution Isolation**

1. **Temporary Directories**
   - Each preview runs in isolated temp directory
   - Automatic cleanup after execution
   - No access to system files

2. **Timeout Protection**
   - 30-second execution limit
   - Automatic process termination
   - Prevents infinite loops

3. **Resource Limits**
   - 1MB output limit
   - Memory constraints
   - CPU throttling (via subprocess)

4. **Sandboxing**
   - HTML previews use iframe sandbox
   - Limited permissions (scripts only)
   - No access to parent window

### **Authentication**

- All preview endpoints require valid JWT token
- User isolation (previews linked to user)
- Rate limiting recommended for production

---

## ⚙️ Configuration

### Environment Variables

```env
# Preview settings (optional)
PREVIEW_TIMEOUT=30              # Execution timeout in seconds
PREVIEW_OUTPUT_LIMIT=1048576    # Max output size (1MB)
PREVIEW_MAX_AGE=3600            # Preview expiry time (1 hour)
```

### Backend Setup

1. **Install Dependencies**
   ```bash
   # Already included in requirements.txt
   pip install -r requirements.txt
   ```

2. **Ensure Python & Node.js Available**
   ```bash
   # Check Python
   python3 --version  # Should be 3.9+
   
   # Check Node.js
   node --version     # Should be 18+
   ```

3. **Start Backend**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload
   ```

### Frontend Setup

1. **Import Component**
   ```typescript
   import { PreviewPanel } from '@/components/preview';
   ```

2. **Use in Your Component**
   ```typescript
   const [showPreview, setShowPreview] = useState(false);
   
   return (
     <>
       <button onClick={() => setShowPreview(true)}>
         Preview
       </button>
       
       {showPreview && (
         <PreviewPanel
           projectId={projectId}
           files={projectFiles}
           projectType="python"
           onClose={() => setShowPreview(false)}
         />
       )}
     </>
   );
   ```

---

## 📊 Performance Considerations

### **Optimization Tips**

1. **Cleanup Old Previews**
   ```bash
   # Manually trigger cleanup
   POST /api/preview/cleanup
   ```

2. **Monitor Disk Usage**
   - Temp directories stored in `backend/generated_projects/previews/`
   - Auto-cleanup after 1 hour
   - Manual cleanup available

3. **Timeout Tuning**
   - Default: 30 seconds
   - Adjust based on project complexity
   - Consider user experience

### **Scalability**

For production deployment:

1. **Add Redis Caching**
   ```python
   # Cache preview results
   redis_client.setex(preview_id, 3600, output)
   ```

2. **Use Queue System**
   ```python
   # Queue long-running previews
   celery_app.delay(execute_preview, project_id)
   ```

3. **Containerize Execution**
   ```dockerfile
   # Run previews in Docker containers
   docker run --rm --timeout 30s python:3.9 script.py
   ```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. "Execution timeout" Error**
- **Cause**: Code takes longer than 30 seconds
- **Solution**: Optimize code or increase timeout
- **Example**: Remove heavy computations

#### **2. "Preview not found" Error**
- **Cause**: Preview expired (>1 hour old)
- **Solution**: Re-run preview
- **Note**: Previews auto-cleanup after 1 hour

#### **3. "Module not found" Error (Python)**
- **Cause**: Missing imports or dependencies
- **Solution**: Use only standard library or pre-installed packages
- **Workaround**: Generate requirements.txt and install

#### **4. "Node.js not found" Error**
- **Cause**: Node.js not installed on system
- **Solution**: Install Node.js 18+
- **Check**: Run `node --version`

#### **5. "Permission denied" Error**
- **Cause**: File system permissions issue
- **Solution**: Check directory permissions
- **Check**: `ls -la backend/generated_projects/previews/`

### **Debug Mode**

Enable detailed logging:

```python
# In backend/services/preview_service.py
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add logging to methods
logger.debug(f"Executing: {script_path}")
logger.debug(f"Output: {output}")
```

---

## 📈 Future Enhancements

### **Planned Features**

1. **Interactive Console**
   - Real-time input/output
   - REPL mode for Python
   - Node.js REPL

2. **Debugging Support**
   - Breakpoints
   - Step-through execution
   - Variable inspection

3. **Performance Profiling**
   - Execution time tracking
   - Memory usage monitoring
   - CPU profiling

4. **Advanced Sandboxing**
   - Docker container execution
   - Network isolation
   - File system restrictions

5. **Collaborative Preview**
   - Share preview URLs
   - Real-time collaboration
   - Comment on output

---

## 📚 API Reference

### **POST /api/preview/python**

Execute a Python project.

**Request:**
```json
{
  "project_id": "string",
  "files": {
    "filename": "content"
  },
  "entry_point": "main.py"
}
```

**Response:**
```json
{
  "success": true,
  "preview_id": "string",
  "output": "string",
  "type": "python"
}
```

**Errors:**
- `400`: Execution failed
- `401`: Unauthorized
- `404`: Project not found

---

### **POST /api/preview/javascript**

Execute a JavaScript/Node.js project.

**Request:**
```json
{
  "project_id": "string",
  "files": {
    "filename": "content"
  },
  "entry_point": "index.js"
}
```

**Response:**
```json
{
  "success": true,
  "preview_id": "string",
  "output": "string",
  "type": "javascript"
}
```

---

### **POST /api/preview/html**

Render an HTML/CSS/JS project.

**Request:**
```json
{
  "project_id": "string",
  "html": "string",
  "css": "string (optional)",
  "js": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "preview_id": "string",
  "type": "html"
}
```

---

### **GET /api/preview/{preview_id}**

Get preview by ID.

**Response (Python/JavaScript):**
```json
{
  "preview_id": "string",
  "type": "python|javascript",
  "output": "string",
  "project_id": "string"
}
```

**Response (HTML):**
```html
<!-- Returns rendered HTML directly -->
```

---

### **DELETE /api/preview/{preview_id}**

Delete a preview and clean up resources.

**Response:**
```json
{
  "success": true,
  "message": "Preview deleted"
}
```

---

## 🎓 Examples

### **Example 1: Python Calculator**

```python
# Generated code
def calculate(a, b, operation):
    if operation == '+':
        return a + b
    elif operation == '-':
        return a - b
    elif operation == '*':
        return a * b
    elif operation == '/':
        return a / b if b != 0 else "Error: Division by zero"

result = calculate(10, 5, '+')
print(f"Result: {result}")

# Preview Output:
# Result: 15
```

### **Example 2: JavaScript Todo App**

```javascript
// Generated code
class TodoApp {
  constructor() {
    this.todos = [];
  }
  
  addTodo(task) {
    this.todos.push({ task, done: false });
  }
  
  listTodos() {
    return this.todos.map((t, i) => `${i+1}. ${t.task}`).join('\n');
  }
}

const app = new TodoApp();
app.addTodo('Learn Intelekt');
app.addTodo('Build an app');
console.log(app.listTodos());

// Preview Output:
// 1. Learn Intelekt
// 2. Build an app
```

### **Example 3: HTML Counter**

```html
<!-- Generated code -->
<html>
<head>
  <style>
    body { font-family: Arial; text-align: center; }
    button { padding: 10px 20px; font-size: 16px; }
    #count { font-size: 48px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Counter App</h1>
  <div id="count">0</div>
  <button onclick="increment()">+</button>
  <button onclick="decrement()">-</button>
  
  <script>
    let count = 0;
    function increment() {
      count++;
      document.getElementById('count').textContent = count;
    }
    function decrement() {
      count--;
      document.getElementById('count').textContent = count;
    }
  </script>
</body>
</html>

<!-- Preview Output: Interactive counter in iframe -->
```

---

## 🎉 Summary

The Live Preview feature provides:

✅ **Instant Feedback** - See results immediately  
✅ **Multiple Languages** - Python, JavaScript, HTML/CSS/JS  
✅ **Secure Execution** - Isolated, timeout-protected  
✅ **Easy Integration** - Simple API and UI component  
✅ **Production Ready** - Tested and documented  

**Start using live preview today to accelerate your development workflow\!**

---

## 📞 Support

For issues or questions:
1. Check the **Troubleshooting** section
2. Review **API Reference** for endpoint details
3. Check backend logs: `backend/logs/`
4. Open an issue on GitHub

---

**Happy Previewing! 🚀**
