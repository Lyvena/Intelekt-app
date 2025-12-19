import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="h-full flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Lazy load heavy components
export const LazyCollaborativeEditor = lazy(() => 
  import('./editor/CollaborativeEditor').then(module => ({ default: module.CollaborativeEditor }))
);

export const LazyPreviewPanel = lazy(() => 
  import('./preview/PreviewPanel').then(module => ({ default: module.PreviewPanel }))
);

export const LazyLivePreview = lazy(() => 
  import('./preview/LivePreview').then(module => ({ default: module.LivePreview }))
);

export const LazyInlinePreviewPanel = lazy(() => 
  import('./preview/InlinePreviewPanel').then(module => ({ default: module.InlinePreviewPanel }))
);

export const LazyTerminalPanel = lazy(() => 
  import('./terminal/TerminalPanel').then(module => ({ default: module.TerminalPanel }))
);

export const LazyGitPanel = lazy(() => 
  import('./git/GitPanel').then(module => ({ default: module.GitPanel }))
);

// Wrapper components with Suspense
export const CollaborativeEditorWithSuspense: React.FC = () => (
  <Suspense fallback={<LoadingFallback message="Loading editor..." />}>
    <LazyCollaborativeEditor />
  </Suspense>
);

export const PreviewPanelWithSuspense: React.FC<{
  projectId: string;
  files: Record<string, string>;
  projectType: 'python' | 'javascript' | 'html';
  entryPoint?: string;
  onClose: () => void;
}> = (props) => (
  <Suspense fallback={<LoadingFallback message="Loading preview..." />}>
    <LazyPreviewPanel {...props} />
  </Suspense>
);

export const LivePreviewWithSuspense: React.FC<{
  files: Record<string, string>;
  onClose: () => void;
  onFixError?: (errors: string[], files: Record<string, string>) => Promise<void>;
  isFixing?: boolean;
  projectName?: string;
}> = (props) => (
  <Suspense fallback={<LoadingFallback message="Loading live preview..." />}>
    <LazyLivePreview {...props} />
  </Suspense>
);

export const InlinePreviewPanelWithSuspense: React.FC<{
  files: Record<string, string>;
  onFixError?: (errors: string[], files: Record<string, string>) => Promise<void>;
  isFixing?: boolean;
  onOpenFullPreview?: () => void;
}> = (props) => (
  <Suspense fallback={<LoadingFallback message="Loading preview..." />}>
    <LazyInlinePreviewPanel {...props} />
  </Suspense>
);

export const TerminalPanelWithSuspense: React.FC = () => (
  <Suspense fallback={<LoadingFallback message="Loading terminal..." />}>
    <LazyTerminalPanel />
  </Suspense>
);

export const GitPanelWithSuspense: React.FC = () => (
  <Suspense fallback={<LoadingFallback message="Loading git panel..." />}>
    <LazyGitPanel />
  </Suspense>
);

export { LoadingFallback };
