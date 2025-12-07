import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  X, 
  RefreshCw, 
  Smartphone, 
  Tablet, 
  Monitor,
  Terminal,
  ExternalLink,
  Maximize2,
  Minimize2,
  Wand2,
  AlertTriangle,
  Loader2,
  Rocket,
  CheckCircle,
  ExternalLink as LinkIcon
} from 'lucide-react';
import { deployAPI } from '../../services/api';
import { cn } from '../../lib/utils';

interface LivePreviewProps {
  files: Record<string, string>;
  onClose: () => void;
  onFixError?: (errors: string[], files: Record<string, string>) => Promise<void>;
  isFixing?: boolean;
  projectName?: string;
}

type DeviceSize = 'mobile' | 'tablet' | 'desktop' | 'full';

const deviceSizes: Record<DeviceSize, { width: string; icon: React.ReactNode; label: string }> = {
  mobile: { width: '375px', icon: <Smartphone className="w-4 h-4" />, label: 'Mobile' },
  tablet: { width: '768px', icon: <Tablet className="w-4 h-4" />, label: 'Tablet' },
  desktop: { width: '1024px', icon: <Monitor className="w-4 h-4" />, label: 'Desktop' },
  full: { width: '100%', icon: <Maximize2 className="w-4 h-4" />, label: 'Full' },
};

export const LivePreview: React.FC<LivePreviewProps> = ({ files, onClose, onFixError, isFixing = false, projectName = 'my-app' }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('full');
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: string; message: string }>>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    success: boolean;
    url?: string;
    dashboard_url?: string;
    error?: string;
  } | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [railwayToken, setRailwayToken] = useState('');

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployResult(null);
    
    try {
      const result = await deployAPI.deployToRailway({
        project_name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        files,
        railway_token: railwayToken || undefined,
      });
      
      setDeployResult({
        success: result.success,
        url: result.url,
        dashboard_url: result.dashboard_url,
      });
    } catch (error) {
      setDeployResult({
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
      });
    } finally {
      setIsDeploying(false);
    }
  };
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Build the HTML document from files
  const buildDocument = useCallback(() => {
    const html = files['index.html'] || files['index.htm'] || '';
    const css = files['style.css'] || files['styles.css'] || files['main.css'] || '';
    const js = files['script.js'] || files['main.js'] || files['app.js'] || files['index.js'] || '';

    // If we have an HTML file, inject CSS and JS into it
    if (html) {
      let doc = html;
      
      // Inject CSS if not already linked
      if (css && !doc.includes('style.css') && !doc.includes('styles.css')) {
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

    // If no HTML file, create a basic document
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
  <script>
    ${js}
  </script>
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
              type: 'console',
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
      if (event.data?.type === 'console') {
        setConsoleLogs(prev => [...prev.slice(-99), {
          type: event.data.logType,
          message: event.data.message
        }]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Update preview when files change
  useEffect(() => {
    updatePreview();
  }, [files, updatePreview]);

  const handleRefresh = () => {
    setConsoleLogs([]);
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

  return (
    <div className={cn(
      "fixed bg-background border border-border rounded-lg shadow-2xl flex flex-col z-50",
      isFullscreen 
        ? "inset-0 rounded-none" 
        : "inset-4 md:inset-8 lg:inset-12"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold">Live Preview</h2>
          </div>
          
          {/* Device size buttons */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            {(Object.keys(deviceSizes) as DeviceSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setDeviceSize(size)}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  deviceSize === size 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent"
                )}
                title={deviceSizes[size].label}
              >
                {deviceSizes[size].icon}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated: {lastUpdate.toLocaleTimeString()}
          </span>
          
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showConsole ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
            title="Toggle Console"
          >
            <Terminal className="w-4 h-4" />
            {consoleLogs.filter(l => l.type === 'error').length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          
          <button
            onClick={openInNewTab}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="w-px h-6 bg-border mx-1" />
          
          {/* Deploy Button */}
          <button
            onClick={() => setShowDeployModal(true)}
            disabled={isDeploying}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            title="Deploy to Railway"
          >
            {isDeploying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Deploy</span>
          </button>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex items-start justify-center p-4 bg-secondary/30 overflow-auto">
          <div 
            className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
            style={{ 
              width: deviceSizes[deviceSize].width,
              height: deviceSize === 'full' ? '100%' : 'calc(100% - 2rem)',
              maxWidth: '100%'
            }}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          </div>
        </div>

        {/* Console Panel */}
        {showConsole && (
          <div className="w-80 border-l border-border bg-gray-900 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
              <span className="text-sm font-medium text-gray-300">Console</span>
              <div className="flex items-center gap-2">
                {consoleLogs.filter(l => l.type === 'error').length > 0 && onFixError && (
                  <button
                    onClick={() => {
                      const errors = consoleLogs
                        .filter(l => l.type === 'error')
                        .map(l => l.message);
                      onFixError(errors, files);
                    }}
                    disabled={isFixing}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
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
                  className="text-xs text-gray-400 hover:text-white"
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
                    className={cn("py-1 border-b border-gray-800 flex items-start gap-2", getLogColor(log.type))}
                  >
                    {log.type === 'error' && <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
                    <div>
                      <span className="text-gray-500">[{log.type}]</span> {log.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <Rocket className="w-5 h-5 text-green-500" />
                Deploy to Railway
              </h3>
              <button
                onClick={() => {
                  setShowDeployModal(false);
                  setDeployResult(null);
                }}
                className="p-1 hover:bg-accent rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {!deployResult ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Deploy your app to Railway with one click. Your app will be live in minutes!
                  </p>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Railway API Token (optional)</label>
                    <input
                      type="password"
                      value={railwayToken}
                      onChange={(e) => setRailwayToken(e.target.value)}
                      placeholder="Enter your Railway API token"
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your token from{' '}
                      <a
                        href="https://railway.app/account/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        railway.app/account/tokens
                      </a>
                    </p>
                  </div>

                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong>Files to deploy:</strong> {Object.keys(files).length} files
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Object.keys(files).slice(0, 5).join(', ')}
                      {Object.keys(files).length > 5 && ` +${Object.keys(files).length - 5} more`}
                    </p>
                  </div>

                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Deploy Now
                      </>
                    )}
                  </button>
                </>
              ) : deployResult.success ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-lg">Deployment Started!</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your app is being deployed to Railway.
                    </p>
                  </div>

                  {deployResult.url && (
                    <a
                      href={deployResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Open App
                    </a>
                  )}

                  {deployResult.dashboard_url && (
                    <a
                      href={deployResult.dashboard_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View in Railway Dashboard
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                  <div>
                    <h4 className="font-semibold text-lg">Deployment Failed</h4>
                    <p className="text-sm text-red-400 mt-1">
                      {deployResult.error || 'An error occurred during deployment.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeployResult(null)}
                    className="px-4 py-2 bg-secondary hover:bg-accent rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
