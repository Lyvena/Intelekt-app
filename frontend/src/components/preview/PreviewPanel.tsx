import React, { useState } from 'react';
import { Play, X, Loader, AlertCircle, Copy, Check } from 'lucide-react';
import { authAPI } from '../../services/api';

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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {projectType === 'html' && previewId ? (
            // HTML Preview
            <iframe
              src={`/api/preview/${previewId}`}
              className="w-full h-full border border-gray-200 dark:border-gray-700 rounded-lg"
              title="HTML Preview"
              sandbox="allow-scripts allow-same-origin"
            />
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
