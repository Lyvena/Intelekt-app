# 🚀 Live Preview - Quick Start Integration Guide

## What Was Added

A complete **live preview system** that lets users execute and preview their generated code in real-time.

### Files Created

```
backend/
├── services/preview_service.py       # Core preview execution engine
└── routes/preview.py                 # API endpoints

frontend/
└── src/components/preview/
    ├── PreviewPanel.tsx              # UI component
    └── index.ts                      # Exports

Documentation/
└── LIVE_PREVIEW_GUIDE.md             # Complete documentation
```

---

## ⚡ Quick Setup (5 minutes)

### 1. **Backend is Ready** ✅
- Preview service already integrated into `main.py`
- No additional configuration needed
- Just start the backend normally

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

### 2. **Frontend Integration** (Optional - for UI)

If you want to add the preview button to your chat interface:

```typescript
// In your chat component (e.g., App.tsx)
import { PreviewPanel } from '@/components/preview';

export function ChatInterface() {
  const [showPreview, setShowPreview] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  return (
    <>
      {/* Your chat UI */}
      <button onClick={() => setShowPreview(true)}>
        🎬 Preview
      </button>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewPanel
          projectId={currentProject.id}
          files={currentProject.files}
          projectType={currentProject.type} // 'python' | 'javascript' | 'html'
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
```

### 3. **Test It**

```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Test API
curl -X POST http://localhost:8000/api/preview/python \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "test",
    "files": {"main.py": "print(\"Hello\")"},
    "entry_point": "main.py"
  }'
```

---

## 📊 API Endpoints

### **Execute Python**
```bash
POST /api/preview/python
{
  "project_id": "string",
  "files": {"filename": "content"},
  "entry_point": "main.py"
}
```

### **Execute JavaScript**
```bash
POST /api/preview/javascript
{
  "project_id": "string",
  "files": {"filename": "content"},
  "entry_point": "index.js"
}
```

### **Render HTML**
```bash
POST /api/preview/html
{
  "project_id": "string",
  "html": "<h1>Hello</h1>",
  "css": "h1 { color: blue; }",
  "js": "console.log('hi')"
}
```

### **Get Preview Output**
```bash
GET /api/preview/{preview_id}
```

### **Delete Preview**
```bash
DELETE /api/preview/{preview_id}
```

---

## 🎯 Features

✅ **Python Execution** - Run Python scripts with output capture  
✅ **JavaScript Execution** - Execute Node.js code  
✅ **HTML Rendering** - Display HTML/CSS/JS in iframe  
✅ **Error Handling** - Clear error messages  
✅ **Timeout Protection** - 30-second limit per execution  
✅ **Resource Cleanup** - Auto-cleanup after 1 hour  
✅ **Security** - Isolated execution, sandboxed HTML  
✅ **Authentication** - All endpoints require JWT token  

---

## 🔧 Configuration

### Optional Environment Variables

```env
# In backend/.env
PREVIEW_TIMEOUT=30              # Seconds (default: 30)
PREVIEW_OUTPUT_LIMIT=1048576    # Bytes (default: 1MB)
PREVIEW_MAX_AGE=3600            # Seconds (default: 1 hour)
```

---

## 📝 Usage Examples

### **Python Project**
```python
# User generates this code
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))

# Preview Output:
# 55
```

### **JavaScript Project**
```javascript
// User generates this code
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log(`Sum: ${sum}`);

// Preview Output:
// Sum: 15
```

### **HTML Project**
```html
<!-- User generates this code -->
<h1>Welcome</h1>
<button onclick="alert('Clicked!')">Click Me</button>

<!-- Preview Output: Rendered in iframe -->
```

---

## 🐛 Troubleshooting

### **"Module not found" Error**
- Only standard library modules work
- Can't install packages in preview
- Workaround: Use only built-in modules

### **"Execution timeout" Error**
- Code took longer than 30 seconds
- Optimize your code or increase timeout
- Check for infinite loops

### **"Preview not found" Error**
- Preview expired (>1 hour old)
- Re-run the preview

### **"Node.js not found" Error**
- Install Node.js: `sudo apt-get install nodejs`
- Check: `node --version`

---

## 🚀 Next Steps

1. **Test the API** - Use curl or Postman
2. **Integrate UI** - Add PreviewPanel to your chat
3. **Customize** - Modify timeout, output limits
4. **Deploy** - Push to production

---

## 📚 Full Documentation

See `LIVE_PREVIEW_GUIDE.md` for:
- Complete architecture
- Advanced configuration
- Performance optimization
- Scaling strategies
- API reference
- Examples

---

## ✨ What Users Can Do Now

1. **Generate Code** - Ask AI to create Python/JS/HTML
2. **Preview Instantly** - Click preview button
3. **See Output** - View results in real-time
4. **Iterate Quickly** - Modify and re-run
5. **Debug Easily** - See errors immediately

---

## 🎉 Summary

The live preview feature is **fully implemented and ready to use**:

- ✅ Backend: Complete with preview service
- ✅ Frontend: UI component ready
- ✅ Security: Isolated execution with timeouts
- ✅ Documentation: Comprehensive guides
- ✅ Testing: Ready for production

**Start using it today!**

```bash
# Just run normally
cd backend && uvicorn main:app --reload
cd frontend && npm run dev
```

---

**Questions?** Check `LIVE_PREVIEW_GUIDE.md` for detailed documentation.

**Happy Previewing! 🎬**
