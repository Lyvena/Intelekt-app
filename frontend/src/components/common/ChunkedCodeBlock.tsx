import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface ChunkedCodeBlockProps {
  code: string;
  language: string;
  maxInitialLines?: number;
  chunkSize?: number;
}

// Threshold for chunked rendering (lines)
const CHUNKED_THRESHOLD = 100;

export const ChunkedCodeBlock: React.FC<ChunkedCodeBlockProps> = ({
  code,
  language,
  maxInitialLines = 50,
  chunkSize = 50,
}) => {
  const lines = code.split('\n');
  const totalLines = lines.length;
  const needsChunking = totalLines > CHUNKED_THRESHOLD;

  const [visibleLines, setVisibleLines] = useState(needsChunking ? maxInitialLines : totalLines);
  const [isExpanded, setIsExpanded] = useState(!needsChunking);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get visible code
  const visibleCode = needsChunking && !isExpanded
    ? lines.slice(0, visibleLines).join('\n')
    : code;

  // Load more lines progressively
  const loadMoreLines = useCallback(() => {
    if (visibleLines >= totalLines || isLoading) return;

    setIsLoading(true);
    
    // Use requestIdleCallback for non-blocking rendering
    const loadChunk = () => {
      setVisibleLines((prev) => Math.min(prev + chunkSize, totalLines));
      setIsLoading(false);
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadChunk, { timeout: 100 });
    } else {
      setTimeout(loadChunk, 16); // ~1 frame
    }
  }, [visibleLines, totalLines, chunkSize, isLoading]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!needsChunking || isExpanded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleLines < totalLines) {
          loadMoreLines();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = containerRef.current?.querySelector('.load-more-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [needsChunking, isExpanded, visibleLines, totalLines, loadMoreLines]);

  // Expand/collapse handler
  const toggleExpand = useCallback(() => {
    if (isExpanded) {
      setVisibleLines(maxInitialLines);
      setIsExpanded(false);
      // Scroll to top of code block
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setIsExpanded(true);
      setVisibleLines(totalLines);
    }
  }, [isExpanded, maxInitialLines, totalLines]);

  return (
    <div ref={containerRef} className="relative">
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.875rem',
          maxHeight: isExpanded ? 'none' : '600px',
          overflow: 'auto',
        }}
        showLineNumbers={totalLines > 5}
        wrapLines
        lineProps={(lineNumber) => ({
          style: { display: 'block' },
          'data-line': lineNumber,
        })}
      >
        {visibleCode}
      </SyntaxHighlighter>

      {/* Load more sentinel for infinite scroll */}
      {needsChunking && !isExpanded && visibleLines < totalLines && (
        <div className="load-more-sentinel h-4" />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-secondary/90 rounded-full text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading more...
        </div>
      )}

      {/* Expand/Collapse button for large code blocks */}
      {needsChunking && (
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent pt-8 pb-2 px-4">
          <button
            onClick={toggleExpand}
            className="w-full flex items-center justify-center gap-2 py-2 bg-secondary/80 hover:bg-secondary rounded-lg text-xs font-medium transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Collapse ({totalLines} lines)
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show all {totalLines} lines ({totalLines - visibleLines} more)
              </>
            )}
          </button>
        </div>
      )}

      {/* Line count indicator */}
      {!needsChunking && totalLines > 10 && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-secondary/80 rounded text-xs text-muted-foreground">
          {totalLines} lines
        </div>
      )}
    </div>
  );
};

export default ChunkedCodeBlock;
