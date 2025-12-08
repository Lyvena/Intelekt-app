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
} from 'lucide-react';
import { authAPI } from '../../services/api';
import { cn } from '../../lib/utils';

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
    setLoading(true);
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
      } else if (projectType === 'javascript') {
        response = await authAPI.post('/preview/javascript', {
          project_id: projectId,
          files,
          entry_point: entryPoint,
        });
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
      }

      if (response && response.data.success) {
        setPreviewId(response.data.preview_id);
        if (projectType !== 'html') {
          setOutput(response.data.output);
        }
      } else {
        setError(response?.data?.detail || 'Preview failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run preview');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Play className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live Preview - {projectType.toUpperCase()}
            </h2>
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
                <iframe
                  src={`/api/preview/${previewId}`}
                  className="w-full h-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white"
                  title="HTML Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
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
