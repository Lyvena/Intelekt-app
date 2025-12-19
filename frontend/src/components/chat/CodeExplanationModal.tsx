import React, { useState } from 'react';
import { X, Loader2, Sparkles, Copy, Check, BookOpen } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../store/useStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface CodeExplanationModalProps {
  code: string;
  language: string;
  onClose: () => void;
}

export const CodeExplanationModal: React.FC<CodeExplanationModalProps> = ({
  code,
  language,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { getToken } = useAuth();
  const { aiProvider, currentProject } = useStore();

  const handleExplain = async () => {
    setIsLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/chat/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          code,
          language,
          ai_provider: aiProvider,
          project_id: currentProject?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get explanation');
      }

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      setError('Failed to generate explanation. Please try again.');
      console.error('Explanation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Code Explanation</h2>
              <p className="text-xs text-muted-foreground">
                {language.toUpperCase()} • {code.split('\n').length} lines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Code Block */}
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300">
              <span className="text-xs font-mono">{language}</span>
              <button
                onClick={copyCode}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: '0.8rem',
                maxHeight: '200px',
              }}
              showLineNumbers
            >
              {code}
            </SyntaxHighlighter>
          </div>

          {/* Explanation Area */}
          {!explanation && !isLoading && !error && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-primary/50 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Want to understand this code?</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Click the button below to get an AI-powered explanation
              </p>
              <button
                onClick={handleExplain}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
              >
                <Sparkles className="w-4 h-4" />
                Explain This Code
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Analyzing code...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
              <p className="text-destructive mb-3">{error}</p>
              <button
                onClick={handleExplain}
                className="px-4 py-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Explanation Display */}
          {explanation && (
            <div className="space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold m-0">AI Explanation</h3>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{explanation}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={handleExplain}
                  className="px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Explain Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeExplanationModal;
