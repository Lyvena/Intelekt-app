import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  RefreshCw, 
  Smartphone, 
  Tablet, 
  Monitor,
  Terminal,
  ExternalLink,
  Maximize2,
  Eye,
  AlertTriangle,
  Wand2,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface InlinePreviewPanelProps {
  files: Record<string, string>;
  onFixError?: (errors: string[], files: Record<string, string>) => Promise<void>;
  isFixing?: boolean;
  onOpenFullPreview?: () => void;
}

type DeviceSize = 'mobile' | 'tablet' | 'desktop';

const deviceSizes: Record<DeviceSize, { width: string; height: string; icon: React.ReactNode; label: string }> = {
  mobile: { width: '375px', height: '667px', icon: <Smartphone className="w-3.5 h-3.5" />, label: 'Mobile' },
  tablet: { width: '768px', height: '1024px', icon: <Tablet className="w-3.5 h-3.5" />, label: 'Tablet' },
  desktop: { width: '100%', height: '100%', icon: <Monitor className="w-3.5 h-3.5" />, label: 'Desktop' },
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

  // Build the HTML document from files
  const buildDocument = useCallback(() => {
    const html = files['index.html'] || files['index.htm'] || '';
    const css = files['style.css'] || files['styles.css'] || files['main.css'] || '';
    const js = files['script.js'] || files['main.js'] || files['app.js'] || files['index.js'] || '';

    // Check if we have React/JSX files - handle differently
    const hasReactFiles = Object.keys(files).some(f => f.endsWith('.jsx') || f.endsWith('.tsx'));
    
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
  }, [files]);

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

  // Update iframe content
  const updatePreview = useCallback(() => {
    if (!iframeRef.current) return;

    const doc = buildDocument();
    const consoleScript = getConsoleScript();
    
    // Inject console script right after <head> or at the beginning
    let finalDoc = doc;
    if (finalDoc.includes('<head>')) {
      finalDoc = finalDoc.replace('<head>', '<head>' + consoleScript);
    } else if (finalDoc.includes('<html>')) {
      finalDoc = finalDoc.replace('<html>', '<html><head>' + consoleScript + '</head>');
    } else {
      finalDoc = consoleScript + finalDoc;
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
  }, [buildDocument]);

  // Listen for console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
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
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Update preview when files change (if auto-refresh is on)
  useEffect(() => {
    if (isAutoRefresh) {
      // Clear errors on refresh
      setHasErrors(false);
      updatePreview();
    }
  }, [files, updatePreview, isAutoRefresh]);

  // Initial load
  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const handleRefresh = () => {
    setConsoleLogs([]);
    setHasErrors(false);
    updatePreview();
  };

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
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium">Preview</span>
          {hasErrors && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              <AlertTriangle className="w-3 h-3" />
              {errorCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Device size buttons */}
          <div className="flex items-center bg-secondary/50 rounded p-0.5 mr-1">
            {(Object.keys(deviceSizes) as DeviceSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setDeviceSize(size)}
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
          
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={cn(
              "p-1.5 rounded transition-colors",
              isAutoRefresh 
                ? "bg-green-500/20 text-green-400" 
                : "hover:bg-accent text-muted-foreground"
            )}
            title={isAutoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          >
            <Play className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-accent rounded transition-colors text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          
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
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          
          <button
            onClick={openInNewTab}
            className="p-1.5 hover:bg-accent rounded transition-colors text-muted-foreground"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

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

      {/* Preview Area */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden",
        showConsole ? "h-[60%]" : "h-full"
      )}>
        <div className="flex-1 flex items-start justify-center p-2 bg-secondary/20 overflow-auto">
          <div 
            className={cn(
              "bg-white rounded shadow-lg overflow-hidden transition-all duration-200",
              deviceSize !== 'desktop' && "border-4 border-gray-800 rounded-xl"
            )}
            style={{ 
              width: deviceSizes[deviceSize].width,
              height: deviceSize === 'desktop' ? '100%' : deviceSizes[deviceSize].height,
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0 bg-white"
              title="Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          </div>
        </div>

        {/* Last update indicator */}
        <div className="px-3 py-1 text-xs text-muted-foreground bg-card/30 border-t border-border/50">
          Last updated: {lastUpdate.toLocaleTimeString()}
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
