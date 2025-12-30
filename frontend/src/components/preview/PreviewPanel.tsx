import React, { useState } from 'react';
import { 
  Play, 
  X, 
  Loader, 
  AlertCircle, 
  Copy, 
  Check,
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import { authAPI } from '../../services/api';
import { cn } from '../../lib/utils';
import { Skeleton } from '../common/Skeleton';
import { useAnalytics } from '../analytics/useAnalytics';

// Device presets for responsive preview
const DEVICE_PRESETS = {
  desktop: { name: 'Desktop', width: '100%', height: '100%', icon: Monitor },
  laptop: { name: 'Laptop', width: 1280, height: 800, icon: Monitor },
  tablet: { name: 'iPad', width: 768, height: 1024, icon: Tablet },
  tabletLandscape: { name: 'iPad Landscape', width: 1024, height: 768, icon: Tablet },
  mobile: { name: 'iPhone 14', width: 390, height: 844, icon: Smartphone },
  mobileLandscape: { name: 'iPhone Landscape', width: 844, height: 390, icon: Smartphone },
  mobileSmall: { name: 'iPhone SE', width: 375, height: 667, icon: Smartphone },
  android: { name: 'Android', width: 412, height: 915, icon: Smartphone },
} as const;

type DeviceType = keyof typeof DEVICE_PRESETS;

interface PreviewPanelProps {
  projectId: string;
  files: Record<string, string>;
  projectType: 'python' | 'javascript' | 'html';
  entryPoint?: string;
  onClose: () => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  projectId,
  files,
  projectType,
  entryPoint = projectType === 'python' ? 'main.py' : projectType === 'javascript' ? 'index.js' : 'index.html',
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [previewId, setPreviewId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('desktop');
  const [isRotated, setIsRotated] = useState(false);
  const [scale, setScale] = useState(1);
  const [statusHint, setStatusHint] = useState<string>('');
  const { trackEvent } = useAnalytics();

  const currentDevice = DEVICE_PRESETS[selectedDevice];
  
  // Get dimensions (swap if rotated for non-desktop)
  const getDeviceDimensions = () => {
    if (selectedDevice === 'desktop') {
      return { width: '100%', height: '100%' };
    }

    const width = typeof currentDevice.width === 'number' ? currentDevice.width : 1280;
    const height = typeof currentDevice.height === 'number' ? currentDevice.height : 800;
    
    if (isRotated) {
      return { width: height, height: width };
    }
    return { width, height };
  };
  
  const dimensions = getDeviceDimensions();

  const runPreview = async () => {
    const startedAt = Date.now();
    trackEvent('preview', 'start', projectType, undefined, {
      projectId,
      entry_point: entryPoint,
      file_count: Object.keys(files || {}).length,
    });
    setStatusHint('Checking files…');
    if (projectType === 'python' && !files[entryPoint]) {
      setError(`Entry point "${entryPoint}" not found. Please add it and retry.`);
      setStatusHint('');
      return;
    }
    if (projectType === 'javascript' && !files[entryPoint]) {
      setError(`Entry point "${entryPoint}" not found. Please add it and retry.`);
      return;
    }
    if (projectType === 'html' && !files['index.html']) {
      setError('index.html is missing. Add it and rerun preview.');
      return;
    }

    setLoading(true);
    setStatusHint('Packaging files…');
    setError('');
    setOutput('');

    try {
      let response;

      if (projectType === 'python') {
        response = await authAPI.post('/preview/python', {
          project_id: projectId,
          files,
          entry_point: entryPoint,
        });
        setStatusHint('Running Python preview…');
      } else if (projectType === 'javascript') {
        response = await authAPI.post('/preview/javascript', {
          project_id: projectId,
          files,
          entry_point: entryPoint,
        });
        setStatusHint('Running JavaScript preview…');
      } else if (projectType === 'html') {
        const htmlContent = files['index.html'] || '';
        const cssContent = files['style.css'] || '';
        const jsContent = files['script.js'] || '';

        response = await authAPI.post('/preview/html', {
          project_id: projectId,
          html: htmlContent,
          css: cssContent,
          js: jsContent,
        });
        setStatusHint('Rendering HTML preview…');
      }

      if (response && response.data.success) {
        setPreviewId(response.data.preview_id);
        if (projectType !== 'html') {
          setOutput(response.data.output);
        }
        setStatusHint('Ready');
        const elapsedMs = Date.now() - startedAt;
        trackEvent('preview', 'success', projectType, Math.round(elapsedMs / 1000), {
          projectId,
          entry_point: entryPoint,
          preview_id: response.data.preview_id,
        });
      } else {
        setError(response?.data?.detail || 'Preview failed');
        setStatusHint('');
      }
    } catch (err: unknown) {
      const maybeDetail =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : null;
      setError(maybeDetail || 'Failed to run preview');
      trackEvent('preview', 'error', projectType, undefined, {
        projectId,
        entry_point: entryPoint,
        detail: maybeDetail || 'Failed to run preview',
      });
      setStatusHint('');
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Play className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Preview - {projectType.toUpperCase()}
            </h2>
            {statusHint && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{statusHint}</span>
            )}
          </div>
          
          {/* Device Controls */}
          {projectType === 'html' && previewId && (
            <div className="flex items-center gap-2">
              {/* Quick Device Buttons */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setSelectedDevice('desktop')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    selectedDevice === 'desktop' 
                      ? "bg-white dark:bg-gray-700 shadow-sm" 
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                  title="Desktop"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedDevice('tablet')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    selectedDevice === 'tablet' || selectedDevice === 'tabletLandscape'
                      ? "bg-white dark:bg-gray-700 shadow-sm" 
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                  title="Tablet"
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedDevice('mobile')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    selectedDevice === 'mobile' || selectedDevice === 'mobileLandscape' || selectedDevice === 'mobileSmall' || selectedDevice === 'android'
                      ? "bg-white dark:bg-gray-700 shadow-sm" 
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                  title="Mobile"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
              
              {/* Rotate Button */}
              {selectedDevice !== 'desktop' && (
                <button
                  onClick={() => setIsRotated(!isRotated)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isRotated 
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-600" 
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                  title="Rotate device"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              
              {/* Device Selector */}
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value as DeviceType)}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="Desktop">
                  <option value="desktop">Responsive (100%)</option>
                  <option value="laptop">Laptop (1280×800)</option>
                </optgroup>
                <optgroup label="Tablet">
                  <option value="tablet">iPad (768×1024)</option>
                  <option value="tabletLandscape">iPad Landscape (1024×768)</option>
                </optgroup>
                <optgroup label="Mobile">
                  <option value="mobile">iPhone 14 (390×844)</option>
                  <option value="mobileLandscape">iPhone Landscape (844×390)</option>
                  <option value="mobileSmall">iPhone SE (375×667)</option>
                  <option value="android">Android (412×915)</option>
                </optgroup>
              </select>
              
              {/* Scale Slider */}
              {selectedDevice !== 'desktop' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{Math.round(scale * 100)}%</span>
                  <input
                    type="range"
                    min="0.25"
                    max="1"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
          
          {projectType === 'html' && previewId && (
            <button
              onClick={() => window.open(`/api/preview/${previewId}`, '_blank', 'noopener,noreferrer')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              title="Open preview in new tab"
            >
              <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100 dark:bg-gray-950">
          {projectType === 'html' && previewId ? (
            // HTML Preview with Device Frame
            <div className="h-full flex items-center justify-center">
              {selectedDevice === 'desktop' ? (
                // Full-width responsive preview
                <div className="w-full h-full">
                  {loading ? (
                    <div className="w-full h-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white p-4 space-y-3">
                      <Skeleton className="w-32 h-4" />
                      <Skeleton className="w-full h-[60vh]" />
                    </div>
                  ) : (
                    <iframe
                      src={`/api/preview/${previewId}`}
                      className="w-full h-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white"
                      title="HTML Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  )}
                </div>
              ) : (
                // Device frame preview
                <div 
                  className="relative bg-gray-800 rounded-[2rem] p-2 shadow-2xl"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Device notch (for phones) */}
                  {(selectedDevice === 'mobile' || selectedDevice === 'mobileSmall' || selectedDevice === 'android') && !isRotated && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
                  )}
                  
                  {/* Screen bezel */}
                  <div 
                    className="bg-white rounded-[1.5rem] overflow-hidden"
                    style={{
                      width: typeof dimensions.width === 'number' ? dimensions.width : '100%',
                      height: typeof dimensions.height === 'number' ? dimensions.height : '100%',
                    }}
                  >
                    {loading ? (
                      <div className="w-full h-full p-4 space-y-3">
                        <Skeleton className="w-24 h-4" />
                        <Skeleton className="w-full h-full" />
                      </div>
                    ) : (
                      <iframe
                        src={`/api/preview/${previewId}`}
                        className="w-full h-full border-0"
                        title="HTML Preview"
                        sandbox="allow-scripts allow-same-origin"
                        style={{
                          width: typeof dimensions.width === 'number' ? dimensions.width : '100%',
                          height: typeof dimensions.height === 'number' ? dimensions.height : '100%',
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Device info */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                    {currentDevice.name} • {typeof dimensions.width === 'number' ? dimensions.width : '100%'}×{typeof dimensions.height === 'number' ? dimensions.height : '100%'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Output Display
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-200">Error</h3>
                    <p className="text-red-700 dark:text-red-300 text-sm mt-1 font-mono">
                      {error}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={runPreview}
                        className="text-sm px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => setError('')}
                        className="text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {output && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Output</h3>
                    <button
                      onClick={copyOutput}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-auto max-h-96">
                    {output}
                  </pre>
                </div>
              )}

              {!output && !error && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    Click "Run Preview" to execute your code
                  </p>
                </div>
              )}

              {loading && (
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <Loader className="w-5 h-5 animate-spin text-blue-500" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Running preview…</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Packaging files and executing in sandbox</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Skeleton className="w-full h-3" />
                    <Skeleton className="w-5/6 h-3" />
                    <Skeleton className="w-2/3 h-3" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
          >
            Close
          </button>
          <button
            onClick={runPreview}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Preview
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
