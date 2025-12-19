import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  Pause,
  RefreshCw, 
  Smartphone, 
  Tablet, 
  Monitor,
  Terminal,
  ExternalLink,
  Maximize2,
  AlertTriangle,
  Wand2,
  Loader2,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Zap,
  Copy,
  Check,
  MousePointer2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStore, type SelectedElementInfo } from '../../store/useStore';

// Parse HTML and add line number data attributes to elements
function instrumentHtmlWithLineNumbers(html: string, filePath: string): string {
  if (!html) return html;
  
  const lines = html.split('\n');
  let result = '';
  let lineNumber = 0;
  
  for (const line of lines) {
    lineNumber++;
    // Match opening tags and add data-line attribute
    const tagPattern = /<([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>/g;
    const instrumentedLine = line.replace(tagPattern, (match, tagName, attrs, selfClose) => {
      // Skip script, style, meta, link, and other non-visual tags
      const skipTags = ['script', 'style', 'meta', 'link', 'title', 'head', '!doctype', 'html', 'br', 'hr', 'img', 'input'];
      if (skipTags.includes(tagName.toLowerCase())) {
        return match;
      }
      // Add data attributes for line tracking
      const dataAttrs = ` data-intelekt-line="${lineNumber}" data-intelekt-file="${filePath}" data-intelekt-tag="${tagName}"`;
      return `<${tagName}${attrs}${dataAttrs}${selfClose}>`;
    });
    result += instrumentedLine + '\n';
  }
  
  return result;
}

// Debounce hook for smooth updates
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface InlinePreviewPanelProps {
  files: Record<string, string>;
  onFixError?: (errors: string[], files: Record<string, string>) => Promise<void>;
  isFixing?: boolean;
  onOpenFullPreview?: () => void;
}

type DeviceSize = 'mobile' | 'tablet' | 'desktop';

interface DeviceConfig {
  width: number | string;
  height: number | string;
  icon: React.ReactNode;
  label: string;
  frame?: boolean;
}

const deviceSizes: Record<DeviceSize, DeviceConfig> = {
  mobile: { width: 375, height: 667, icon: <Smartphone className="w-3.5 h-3.5" />, label: 'iPhone SE', frame: true },
  tablet: { width: 768, height: 1024, icon: <Tablet className="w-3.5 h-3.5" />, label: 'iPad', frame: true },
  desktop: { width: '100%', height: '100%', icon: <Monitor className="w-3.5 h-3.5" />, label: 'Desktop', frame: false },
};


export const InlinePreviewPanel: React.FC<InlinePreviewPanelProps> = ({ 
  files, 
  onFixError,
  isFixing = false,
  onOpenFullPreview,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: string; message: string; timestamp: Date }>>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [scale, setScale] = useState(1);
  
  // Visual Select-to-Edit state from store
  const { isSelectMode, setIsSelectMode, setSelectedElement, selectedElement } = useStore();
  const [hoveredElement, setHoveredElement] = useState<{ tag: string; line: number } | null>(null);
  
  // Debounce file changes for smoother updates (300ms delay)
  const debouncedFiles = useDebounce(files, 300);
  
  // Generate a fake URL based on the project
  const previewUrl = useMemo(() => {
    const hasIndex = files['index.html'] || files['index.htm'];
    return hasIndex ? 'localhost:3000' : 'localhost:3000/preview';
  }, [files]);

  // Build the HTML document from files
  const buildDocument = useCallback(() => {
    let html = files['index.html'] || files['index.htm'] || '';
    const css = files['style.css'] || files['styles.css'] || files['main.css'] || '';
    const js = files['script.js'] || files['main.js'] || files['app.js'] || files['index.js'] || '';
    const htmlFilePath = files['index.html'] ? 'index.html' : 'index.htm';

    // Check if we have React/JSX files - handle differently
    const hasReactFiles = Object.keys(files).some(f => f.endsWith('.jsx') || f.endsWith('.tsx'));
    
    // Instrument HTML with line numbers for select-to-edit
    if (html && isSelectMode) {
      html = instrumentHtmlWithLineNumbers(html, htmlFilePath);
    }
    
    if (html) {
      let doc = html;
      
      // Inject CSS if not already linked
      if (css && !doc.includes('style.css') && !doc.includes('styles.css') && !doc.includes('main.css')) {
        const styleTag = `<style>\n${css}\n</style>`;
        if (doc.includes('</head>')) {
          doc = doc.replace('</head>', `${styleTag}\n</head>`);
        } else if (doc.includes('<body')) {
          doc = doc.replace('<body', `${styleTag}\n<body`);
        } else {
          doc = styleTag + doc;
        }
      }

      // Inject JS if not already linked
      if (js && !doc.includes('script.js') && !doc.includes('main.js') && !doc.includes('app.js')) {
        const scriptTag = `<script>\n${js}\n</script>`;
        if (doc.includes('</body>')) {
          doc = doc.replace('</body>', `${scriptTag}\n</body>`);
        } else {
          doc = doc + scriptTag;
        }
      }

      return doc;
    }

    // If we have React files but no HTML, show a helpful message
    if (hasReactFiles) {
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
    }
    .container {
      text-align: center;
      max-width: 500px;
    }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    p { opacity: 0.9; line-height: 1.6; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    code { 
      background: rgba(255,255,255,0.2); 
      padding: 0.2rem 0.5rem; 
      border-radius: 4px; 
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚛️</div>
    <h1>React Project Detected</h1>
    <p>This project contains React components (.jsx/.tsx files). 
    To see a full preview, use the "Open Full Preview" button or export and run locally with <code>npm run dev</code>.</p>
  </div>
</body>
</html>`;
    }

    // If no HTML file, create a basic document with available CSS/JS
    if (css || js) {
      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    ${css}
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="app"></div>
  <script>
    ${js}
  </script>
</body>
</html>`;
    }

    // No previewable files
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #1a1a2e;
      color: #a0a0b0;
    }
    .empty-state {
      text-align: center;
      padding: 2rem;
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; }
    h2 { color: #e0e0e0; margin-bottom: 0.5rem; }
    p { font-size: 0.9rem; max-width: 300px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="empty-state">
    <div class="icon">🎨</div>
    <h2>No Preview Available</h2>
    <p>Generate some HTML, CSS, or JavaScript files to see a live preview here.</p>
  </div>
</body>
</html>`;
  }, [files, isSelectMode]);

  // Console capture script to inject
  const getConsoleScript = () => `
    <script>
      (function() {
        const originalConsole = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info
        };
        
        function sendToParent(type, args) {
          try {
            const message = Array.from(args).map(arg => {
              if (typeof arg === 'object') {
                try { return JSON.stringify(arg, null, 2); }
                catch { return String(arg); }
              }
              return String(arg);
            }).join(' ');
            
            window.parent.postMessage({
              type: 'preview-console',
              logType: type,
              message: message
            }, '*');
          } catch(e) {}
        }
        
        console.log = function() { sendToParent('log', arguments); originalConsole.log.apply(console, arguments); };
        console.error = function() { sendToParent('error', arguments); originalConsole.error.apply(console, arguments); };
        console.warn = function() { sendToParent('warn', arguments); originalConsole.warn.apply(console, arguments); };
        console.info = function() { sendToParent('info', arguments); originalConsole.info.apply(console, arguments); };
        
        window.onerror = function(msg, url, line, col, error) {
          sendToParent('error', [msg + ' (line ' + line + ')']);
          return false;
        };

        window.onunhandledrejection = function(event) {
          sendToParent('error', ['Unhandled Promise Rejection: ' + event.reason]);
        };
      })();
    </script>
  `;

  // Select-to-edit script to inject when select mode is enabled
  const getSelectModeScript = useCallback(() => {
    if (!isSelectMode) return '';
    
    return `
    <script>
      (function() {
        let highlightOverlay = null;
        let selectedOverlay = null;
        
        // Create highlight overlay
        function createOverlay(color, zIndex) {
          const overlay = document.createElement('div');
          overlay.style.cssText = \`
            position: fixed;
            pointer-events: none;
            border: 2px solid \${color};
            background: \${color}20;
            z-index: \${zIndex};
            transition: all 0.1s ease;
            border-radius: 2px;
          \`;
          document.body.appendChild(overlay);
          return overlay;
        }
        
        // Position overlay on element
        function positionOverlay(overlay, element) {
          const rect = element.getBoundingClientRect();
          overlay.style.left = rect.left + 'px';
          overlay.style.top = rect.top + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';
          overlay.style.display = 'block';
        }
        
        // Get element path
        function getElementPath(element) {
          const path = [];
          let current = element;
          while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            if (current.id) selector += '#' + current.id;
            else if (current.className) selector += '.' + current.className.split(' ')[0];
            path.unshift(selector);
            current = current.parentElement;
          }
          return path.join(' > ');
        }
        
        // Initialize
        highlightOverlay = createOverlay('#3b82f6', 99998);
        selectedOverlay = createOverlay('#22c55e', 99999);
        highlightOverlay.style.display = 'none';
        selectedOverlay.style.display = 'none';
        
        // Change cursor to crosshair
        document.body.style.cursor = 'crosshair';
        
        // Handle mouse move
        document.addEventListener('mousemove', function(e) {
          const target = e.target;
          if (!target || target === document.body || target === document.documentElement) {
            highlightOverlay.style.display = 'none';
            return;
          }
          
          const line = target.getAttribute('data-intelekt-line');
          const file = target.getAttribute('data-intelekt-file');
          const tag = target.getAttribute('data-intelekt-tag');
          
          if (line && file) {
            positionOverlay(highlightOverlay, target);
            window.parent.postMessage({
              type: 'preview-element-hover',
              line: parseInt(line),
              file: file,
              tag: tag || target.tagName.toLowerCase(),
              path: getElementPath(target)
            }, '*');
          } else {
            highlightOverlay.style.display = 'none';
          }
        });
        
        // Handle click
        document.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const target = e.target;
          const line = target.getAttribute('data-intelekt-line');
          const file = target.getAttribute('data-intelekt-file');
          const tag = target.getAttribute('data-intelekt-tag');
          
          if (line && file) {
            positionOverlay(selectedOverlay, target);
            window.parent.postMessage({
              type: 'preview-element-select',
              line: parseInt(line),
              file: file,
              tag: tag || target.tagName.toLowerCase(),
              path: getElementPath(target),
              content: target.textContent?.substring(0, 100)
            }, '*');
          }
        }, true);
        
        // Handle mouse leave
        document.addEventListener('mouseleave', function() {
          highlightOverlay.style.display = 'none';
          window.parent.postMessage({ type: 'preview-element-hover', line: null }, '*');
        });
      })();
    </script>
    `;
  }, [isSelectMode]);

  // Update iframe content
  const updatePreview = useCallback(() => {
    if (!iframeRef.current) return;

    const doc = buildDocument();
    const consoleScript = getConsoleScript();
    const selectScript = getSelectModeScript();
    
    // Inject scripts right after <head> or at the beginning
    let finalDoc = doc;
    const allScripts = consoleScript + selectScript;
    
    if (finalDoc.includes('<head>')) {
      finalDoc = finalDoc.replace('<head>', '<head>' + allScripts);
    } else if (finalDoc.includes('<html>')) {
      finalDoc = finalDoc.replace('<html>', '<html><head>' + allScripts + '</head>');
    } else {
      finalDoc = allScripts + finalDoc;
    }

    // Write to iframe
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(finalDoc);
      iframeDoc.close();
    }

    setLastUpdate(new Date());
  }, [buildDocument, getSelectModeScript]);

  // Listen for console messages and element selection from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Console messages
      if (event.data?.type === 'preview-console') {
        const newLog = {
          type: event.data.logType,
          message: event.data.message,
          timestamp: new Date(),
        };
        setConsoleLogs(prev => [...prev.slice(-49), newLog]);
        
        if (event.data.logType === 'error') {
          setHasErrors(true);
        }
      }
      
      // Element hover
      if (event.data?.type === 'preview-element-hover') {
        if (event.data.line) {
          setHoveredElement({ tag: event.data.tag, line: event.data.line });
        } else {
          setHoveredElement(null);
        }
      }
      
      // Element selection
      if (event.data?.type === 'preview-element-select') {
        const elementInfo: SelectedElementInfo = {
          filePath: event.data.file,
          lineNumber: event.data.line,
          tagName: event.data.tag,
          elementPath: event.data.path,
          content: event.data.content,
        };
        setSelectedElement(elementInfo);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setSelectedElement, setHoveredElement]);

  // Update preview when files change (if auto-refresh is on) - using debounced files
  useEffect(() => {
    if (isAutoRefresh && Object.keys(debouncedFiles).length > 0) {
      setIsRefreshing(true);
      setHasErrors(false);
      
      // Small delay to show loading indicator
      const timer = setTimeout(() => {
        updatePreview();
        setIsRefreshing(false);
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [debouncedFiles, updatePreview, isAutoRefresh]);

  // Initial load
  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setConsoleLogs([]);
    setHasErrors(false);
    setTimeout(() => {
      updatePreview();
      setIsRefreshing(false);
    }, 100);
  };

  const copyPreviewUrl = () => {
    navigator.clipboard.writeText(`http://${previewUrl}`);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + R to refresh preview
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        setIsRefreshing(true);
        setConsoleLogs([]);
        setHasErrors(false);
        setTimeout(() => {
          updatePreview();
          setIsRefreshing(false);
        }, 100);
      }
      // Cmd/Ctrl + \ to toggle preview
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setIsAutoRefresh(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [updatePreview]);

  const openInNewTab = () => {
    const doc = buildDocument();
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  const errorCount = consoleLogs.filter(l => l.type === 'error').length;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Browser Chrome Header */}
      <div className="flex flex-col border-b border-border bg-card/50">
        {/* Top bar with controls */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5 px-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 hover:bg-red-500 cursor-pointer" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 hover:bg-yellow-500 cursor-pointer" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80 hover:bg-green-500 cursor-pointer" 
                   onClick={onOpenFullPreview}
                   title="Expand preview" />
            </div>
            
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                isAutoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-400"
              )} />
              <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                {isAutoRefresh ? 'LIVE' : 'PAUSED'}
              </span>
            </div>
            
            {hasErrors && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded-full">
                <AlertTriangle className="w-2.5 h-2.5" />
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
          {/* Device size buttons */}
          <div className="flex items-center bg-secondary/50 rounded p-0.5">
            {(Object.keys(deviceSizes) as DeviceSize[]).map((size) => (
              <button
                key={size}
                onClick={() => {
                  setDeviceSize(size);
                  setScale(size === 'desktop' ? 1 : 0.75);
                }}
                className={cn(
                  "p-1 rounded transition-colors",
                  deviceSize === size 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent text-muted-foreground"
                )}
                title={deviceSizes[size].label}
              >
                {deviceSizes[size].icon}
              </button>
            ))}
          </div>
          
          {/* Select-to-Edit toggle */}
          <button
            onClick={() => setIsSelectMode(!isSelectMode)}
            className={cn(
              "p-1.5 rounded transition-colors",
              isSelectMode 
                ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50" 
                : "hover:bg-accent text-muted-foreground"
            )}
            title={`${isSelectMode ? 'Disable' : 'Enable'} Select-to-Edit mode`}
          >
            <MousePointer2 className="w-3.5 h-3.5" />
          </button>
          
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={cn(
              "p-1.5 rounded transition-colors",
              isAutoRefresh 
                ? "bg-green-500/20 text-green-400" 
                : "bg-orange-500/20 text-orange-400"
            )}
            title={`${isAutoRefresh ? 'Pause' : 'Resume'} auto-refresh (⌘⇧\\)`}
          >
            {isAutoRefresh ? <Zap className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Manual refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "p-1.5 rounded transition-colors text-muted-foreground",
              isRefreshing ? "animate-spin" : "hover:bg-accent"
            )}
            title="Refresh (⌘⇧R)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          
          {/* Console toggle */}
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={cn(
              "p-1.5 rounded transition-colors relative",
              showConsole ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
            )}
            title="Toggle Console"
          >
            <Terminal className="w-3.5 h-3.5" />
            {errorCount > 0 && !showConsole && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          
          {/* Open in new tab */}
          <button
            onClick={openInNewTab}
            className="p-1.5 hover:bg-accent rounded transition-colors text-muted-foreground"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          {onOpenFullPreview && (
            <button
              onClick={onOpenFullPreview}
              className="p-1.5 hover:bg-accent rounded transition-colors text-muted-foreground"
              title="Open full preview"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          </div>
        </div>
        
        {/* URL Bar */}
        <div className="flex items-center gap-2 px-2 pb-1.5">
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-accent rounded text-muted-foreground/50" disabled>
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button className="p-1 hover:bg-accent rounded text-muted-foreground/50" disabled>
              <ChevronRight className="w-3 h-3" />
            </button>
            <button 
              onClick={handleRefresh}
              className="p-1 hover:bg-accent rounded text-muted-foreground"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
          
          <div 
            className="flex-1 flex items-center gap-2 px-2.5 py-1 bg-secondary/50 rounded-md text-xs cursor-pointer hover:bg-secondary/70 transition-colors group"
            onClick={copyPreviewUrl}
            title="Click to copy URL"
          >
            <Lock className="w-3 h-3 text-green-500" />
            <Globe className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground flex-1 truncate font-mono">
              {previewUrl}
            </span>
            {urlCopied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden relative",
        showConsole ? "h-[60%]" : "h-full"
      )}>
        {/* Loading overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs font-medium">Updating...</span>
            </div>
          </div>
        )}
        
        <div className="flex-1 flex items-start justify-center p-3 bg-[repeating-conic-gradient(#80808010_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] overflow-auto">
          {deviceSize === 'desktop' ? (
            // Full-width desktop preview
            <div className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0 bg-white"
                title="Live Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
              />
            </div>
          ) : (
            // Device frame preview
            <div 
              className="relative flex flex-col items-center"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
              }}
            >
              {/* Device frame */}
              <div className={cn(
                "relative bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl",
                "before:absolute before:inset-0 before:rounded-[2.5rem] before:border before:border-gray-700"
              )}>
                {/* Notch for mobile */}
                {deviceSize === 'mobile' && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-800" />
                    <div className="w-12 h-1 rounded-full bg-gray-800" />
                  </div>
                )}
                
                {/* Screen */}
                <div 
                  className="bg-white rounded-[2rem] overflow-hidden"
                  style={{
                    width: typeof deviceSizes[deviceSize].width === 'number' ? deviceSizes[deviceSize].width : '100%',
                    height: typeof deviceSizes[deviceSize].height === 'number' ? deviceSizes[deviceSize].height : '100%',
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0 bg-white"
                    title="Live Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                  />
                </div>
                
                {/* Home indicator for mobile */}
                {deviceSize === 'mobile' && (
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-gray-600 rounded-full" />
                )}
              </div>
              
              {/* Device info label */}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {deviceSizes[deviceSize].icon}
                <span>{deviceSizes[deviceSize].label}</span>
                <span className="text-muted-foreground/50">•</span>
                <span className="font-mono">
                  {typeof deviceSizes[deviceSize].width === 'number' ? deviceSizes[deviceSize].width : '100%'}×{typeof deviceSizes[deviceSize].height === 'number' ? deviceSizes[deviceSize].height : '100%'}
                </span>
                
                {/* Scale slider */}
                <input
                  type="range"
                  min="0.25"
                  max="1"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-16 h-1 ml-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                  title={`Scale: ${Math.round(scale * 100)}%`}
                />
                <span className="w-8 text-right">{Math.round(scale * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="px-3 py-1 text-[10px] text-muted-foreground bg-card/50 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Select mode status */}
            {isSelectMode && (hoveredElement || selectedElement) ? (
              <div className="flex items-center gap-2">
                {hoveredElement && (
                  <span className="flex items-center gap-1 text-blue-400">
                    <MousePointer2 className="w-3 h-3" />
                    &lt;{hoveredElement.tag}&gt; line {hoveredElement.line}
                  </span>
                )}
                {selectedElement && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                    Selected: &lt;{selectedElement.tagName}&gt; @ {selectedElement.filePath}:{selectedElement.lineNumber}
                  </span>
                )}
              </div>
            ) : (
              <>
                <span>Updated {lastUpdate.toLocaleTimeString()}</span>
                {Object.keys(files).length > 0 && (
                  <span className="text-muted-foreground/50">
                    {Object.keys(files).length} files
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSelectMode ? (
              <span className="text-purple-400">Click to select element</span>
            ) : (
              <>
                <kbd className="px-1 py-0.5 bg-secondary rounded text-[9px]">⌘⇧R</kbd>
                <span>refresh</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Console Panel */}
      {showConsole && (
        <div className="h-[40%] border-t border-border bg-gray-900 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 bg-gray-800/50">
            <span className="text-xs font-medium text-gray-300">Console</span>
            <div className="flex items-center gap-2">
              {errorCount > 0 && onFixError && (
                <button
                  onClick={() => {
                    const errors = consoleLogs
                      .filter(l => l.type === 'error')
                      .map(l => l.message);
                    onFixError(errors, files);
                  }}
                  disabled={isFixing}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                >
                  {isFixing ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Fixing...</>
                  ) : (
                    <><Wand2 className="w-3 h-3" /> Fix Errors</>
                  )}
                </button>
              )}
              <button
                onClick={() => setConsoleLogs([])}
                className="text-xs text-gray-400 hover:text-white px-2 py-0.5 hover:bg-gray-700 rounded"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 font-mono text-xs">
            {consoleLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No console output</p>
            ) : (
              consoleLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={cn("py-0.5 flex items-start gap-2", getLogColor(log.type))}
                >
                  {log.type === 'error' && <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                  <span className="text-gray-500 flex-shrink-0">[{log.type}]</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InlinePreviewPanel;
