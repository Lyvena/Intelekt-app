import React, { useEffect, useState } from 'react';
import { shareAPI } from '../../services/api';
import { Loader2, AlertCircle, FileText, LayoutList, CheckCircle } from 'lucide-react';

type SharePayload = {
  path?: string;
  content?: string;
  steps?: unknown;
  progress?: {
    total_steps?: number;
    completed_steps?: number;
    phases_completed?: Record<string, boolean>;
    current_step?: unknown;
  };
} & Record<string, unknown>;

interface ShareViewerProps {
  token: string;
}

export const ShareViewer: React.FC<ShareViewerProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await shareAPI.resolve(token);
        if (res.success) {
          setTitle(res.title || null);
          setType(res.type);
          setPayload(res.payload as SharePayload);
          setExpiresAt(res.expires_at);
        } else {
          setError('Link could not be resolved.');
        }
      } catch (err) {
        setError('Link not found or expired.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading shared content...
        </div>
      </div>
    );
  }

  if (error || !payload || !type) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Unable to display this link.'}</span>
        </div>
      </div>
    );
  }

  const expires = expiresAt ? new Date(expiresAt).toLocaleString() : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Shared view-only link</div>
            <h1 className="text-2xl font-semibold mt-1">{title || 'Shared content'}</h1>
            <div className="text-sm text-gray-400">Type: {type}</div>
          </div>
          {expires && <div className="text-xs text-gray-400">Expires: {expires}</div>}
        </div>

        {type === 'snippet' && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-200 mb-3">
              <FileText className="w-4 h-4" />
              <span className="font-medium">{payload.path || 'File'}</span>
            </div>
            <pre className="bg-black/40 border border-gray-800 rounded-lg p-4 text-sm overflow-auto whitespace-pre-wrap">
{payload.content}
            </pre>
          </div>
        )}

        {type === 'framework' && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-200">
              <LayoutList className="w-4 h-4" />
              <span className="font-medium">Framework Progress</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-black/30 border border-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Total steps</div>
                <div className="text-lg font-semibold">
                  {payload.progress?.total_steps ?? '—'}
                </div>
              </div>
              <div className="bg-black/30 border border-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Completed</div>
                <div className="text-lg font-semibold">
                  {payload.progress?.completed_steps ?? '—'}
                </div>
              </div>
              <div className="bg-black/30 border border-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">Phases done</div>
                <div className="text-lg font-semibold">
                  {payload.progress?.phases_completed
                    ? Object.values(payload.progress.phases_completed).filter(Boolean).length
                    : '—'}
                </div>
              </div>
            </div>
            {Boolean(payload.progress?.current_step) && (
              <div className="bg-black/30 border border-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Current step</div>
                <pre className="text-sm text-gray-200 whitespace-pre-wrap">
{JSON.stringify(payload.progress?.current_step ?? {}, null, 2)}
                </pre>
              </div>
            )}
            <details className="bg-black/20 border border-gray-800 rounded-lg p-3 text-sm text-gray-200">
              <summary className="cursor-pointer flex items-center gap-2 text-gray-300">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Full payload
              </summary>
              <pre className="mt-2 text-xs text-gray-300 whitespace-pre-wrap overflow-auto">
{JSON.stringify(payload, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};
