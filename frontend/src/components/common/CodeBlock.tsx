import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Download, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  className?: string;
  showCopyButton?: boolean;
  showDownloadButton?: boolean;
  showExpandButton?: boolean;
  onExpand?: () => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  filename,
  showLineNumbers,
  maxHeight = '400px',
  className,
  showCopyButton = true,
  showDownloadButton = false,
  showExpandButton = false,
  onExpand,
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadCode = () => {
    const ext = getExtension(language);
    const name = filename || `code.${ext}`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getExtension = (lang: string): string => {
    const extMap: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      html: 'html',
      css: 'css',
      json: 'json',
      jsx: 'jsx',
      tsx: 'tsx',
      markdown: 'md',
      bash: 'sh',
      shell: 'sh',
    };
    return extMap[lang] || lang || 'txt';
  };

  const lineCount = code.split('\n').length;
  const autoShowLineNumbers = showLineNumbers ?? lineCount > 5;

  return (
    <div className={cn("rounded-lg overflow-hidden border border-border group", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#282c34] text-gray-300 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {/* Traffic light dots */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs font-mono text-gray-400 ml-2">
            {filename || language}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {showExpandButton && onExpand && (
            <button
              onClick={onExpand}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Expand"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          {showDownloadButton && (
            <button
              onClick={downloadCode}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {showCopyButton && (
            <button
              onClick={copyToClipboard}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title={copied ? 'Copied!' : 'Copy code'}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code content */}
      <div style={{ maxHeight }} className="overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '0.875rem',
            background: '#282c34',
          }}
          showLineNumbers={autoShowLineNumbers}
          wrapLines
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#636d83',
            userSelect: 'none',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* Copy hint on hover */}
      {showCopyButton && (
        <div className="absolute top-12 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs">
            {copied ? 'Copied!' : 'Click to copy'}
          </span>
        </div>
      )}
    </div>
  );
};

// Inline code with copy
export const InlineCode: React.FC<{
  children: string;
  copyable?: boolean;
  className?: string;
}> = ({ children, copyable = true, className }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <code
      className={cn(
        "relative px-1.5 py-0.5 rounded text-sm font-mono bg-muted cursor-pointer group inline-flex items-center gap-1",
        className
      )}
      onClick={copyable ? copy : undefined}
      title={copyable ? 'Click to copy' : undefined}
    >
      {children}
      {copyable && (
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground" />
          )}
        </span>
      )}
    </code>
  );
};

export default CodeBlock;
