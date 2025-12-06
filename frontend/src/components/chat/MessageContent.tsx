import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content, isUser }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse content for code blocks
  const renderContent = () => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let codeBlockIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index);
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {renderInlineCode(textContent)}
          </span>
        );
      }

      const language = match[1] || 'text';
      const code = match[2].trim();
      const currentIndex = codeBlockIndex++;

      parts.push(
        <div key={`code-${match.index}`} className="my-3 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300">
            <span className="text-xs font-mono">{language}</span>
            <button
              onClick={() => copyToClipboard(code, currentIndex)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Copy code"
            >
              {copiedIndex === currentIndex ? (
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
              fontSize: '0.875rem',
            }}
            showLineNumbers={code.split('\n').length > 5}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const textContent = content.slice(lastIndex);
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {renderInlineCode(textContent)}
        </span>
      );
    }

    return parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{content}</span>;
  };

  // Render inline code (backticks)
  const renderInlineCode = (text: string): React.ReactNode[] => {
    const inlineCodeRegex = /`([^`]+)`/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = inlineCodeRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <code
          key={`inline-${match.index}`}
          className={`px-1.5 py-0.5 rounded text-sm font-mono ${
            isUser ? 'bg-primary-foreground/20' : 'bg-muted'
          }`}
        >
          {match[1]}
        </code>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return <div className="break-words">{renderContent()}</div>;
};
