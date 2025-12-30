import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Folder } from 'lucide-react';
import { useStore, useCurrentProjectMessages, useCurrentProjectFiles } from '../../store/useStore';
import { useAuth } from '../../contexts/AuthContext';
import type { ChatMessage } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { MessageContent } from './MessageContent';
import { Suggestions } from './Suggestions';
import { WelcomeState } from './WelcomeState';
import { GenerationProgress } from './GenerationProgress';
import { SmartContextIndicator } from './SmartContextIndicator';
import { getRelevantFiles, buildContextString } from '../../services/smartContext';
import { usageTracker } from '../../services/usageTracker';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const ChatPanel: React.FC = () => {
  const {
    currentProject,
    isLoading,
    setIsLoading,
    streamingMessage,
    appendStreamingMessage,
    clearStreamingMessage,
    addMessage,
    aiProvider,
    projectFiles: allProjectFiles,
    setProjectFiles,
    setShowPreview,
    generationStage,
    generationMessage,
    setGenerationStage,
    pushFileHistory,
  } = useStore();

  const { getToken } = useAuth();
  const messages = useCurrentProjectMessages();
  const currentProjectFiles = useCurrentProjectFiles();
  const [inputMessage, setInputMessage] = useState('');
  const [excludedFiles, setExcludedFiles] = useState<Set<string>>(new Set());
  const [tokenCount, setTokenCount] = useState(0);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [lastPrompt, setLastPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Calculate relevant files based on input message
  const relevantFiles = useMemo(() => {
    if (!inputMessage.trim() || currentProjectFiles.length === 0) return [];
    const files = getRelevantFiles(inputMessage, currentProjectFiles, 5);
    // Filter out excluded files
    return files.filter(rf => !excludedFiles.has(rf.file.path));
  }, [inputMessage, currentProjectFiles, excludedFiles]);

  // Reset excluded files when input changes significantly
  useEffect(() => {
    if (inputMessage.length < 3) {
      setExcludedFiles(new Set());
    }
  }, [inputMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  useEffect(() => {
    // Focus input when project changes
    inputRef.current?.focus();
  }, [currentProject?.id]);

  const runSafetyChecks = (filePath: string, code: string) => {
    const warnings: string[] = [];
    const lowerPath = filePath.toLowerCase();
    if (lowerPath.includes('.env') || lowerPath.includes('secrets')) {
      warnings.push('Potential secret file path detected. Avoid writing secrets into generated files.');
    }
    if (/sk-[A-Za-z0-9]{20,}/.test(code) || /AIza[0-9A-Za-z\-_]{35}/.test(code)) {
      warnings.push('Content looks like it may contain an API key. Please verify before using.');
    }
    if (/aws_secret/i.test(code) || /private_key/i.test(code)) {
      warnings.push('Sensitive key material detected. Remove or mask secrets.');
    }
    if (code.length > 50000) {
      warnings.push('Large file generated (>50KB). Review before applying to avoid performance issues.');
    }
    return warnings;
  };

  const sendMessage = async (overrideMessage?: string) => {
    const promptToSend = overrideMessage ?? inputMessage;
    if (!promptToSend.trim() || isLoading || !currentProject) return;

    const startTime = Date.now();
    const originalPrompt = promptToSend;
    setLastPrompt(promptToSend);

    const userMessage: ChatMessage = {
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toISOString(),
    };

    addMessage(currentProject.id, userMessage);
    setInputMessage('');
    setIsLoading(true);
    clearStreamingMessage();
    setGenerationStage('analyzing', 'Understanding your request...');
    setTokenCount(0);
    setStreamStartTime(Date.now());

    // Save current state to history before changes
    pushFileHistory(currentProject.id, `Before: ${promptToSend.slice(0, 50)}...`);

    try {
      // Build context from relevant files
      const contextString = relevantFiles.length > 0
        ? buildContextString(relevantFiles)
        : '';

      const messageWithContext = contextString
        ? `${promptToSend}${contextString}`
        : promptToSend;

      // Use streaming endpoint
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: messageWithContext,
          project_id: currentProject.id,
          ai_provider: aiProvider,
          tech_stack: currentProject.tech_stack,
          conversation_history: messages,
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        console.error('Chat stream request failed', response.status, bodyText);
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let fullResponse = '';
      let streamComplete = false;

      while (!streamComplete) {
        const { done, value } = await reader.read();
        if (done) {
          streamComplete = true;
          continue;
        }

        const chunk = decoder.decode(value);
        console.debug('Received raw chunk:', chunk);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.debug('Parsed SSE event:', data);

              if (data.type === 'chunk') {
                fullResponse += data.content;
                appendStreamingMessage(data.content);
                setTokenCount((prev) => prev + Math.max(1, Math.round(data.content.length / 4)));
                // Update stage based on content
                if (fullResponse.length < 100) {
                  setGenerationStage('planning', 'Designing the solution...');
                } else {
                  setGenerationStage('generating', 'Writing the code...');
                }
              } else if (data.type === 'code') {
                setGenerationStage('validating', `Checking ${data.file_path} for issues...`);
                const warnings = runSafetyChecks(data.file_path, data.code);
                if (warnings.length > 0) {
                  const warningMessage: ChatMessage = {
                    role: 'assistant',
                    content: `⚠️ Safety checks for \`${data.file_path}\`:\n${warnings.map(w => `- ${w}`).join('\n')}\n\nFile was generated; please review before deploying.`,
                    timestamp: new Date().toISOString(),
                  };
                  addMessage(currentProject.id, warningMessage);
                }
                setGenerationStage('generating', `Creating ${data.file_path}...`);
                // Handle generated code - add to project files
                const existingFiles = allProjectFiles[currentProject.id] || [];
                const fileExists = existingFiles.some(f => f.path === data.file_path);

                const newFile = {
                  path: data.file_path,
                  content: data.code,
                };

                if (fileExists) {
                  setProjectFiles(
                    currentProject.id,
                    existingFiles.map(f => f.path === data.file_path ? newFile : f)
                  );
                } else {
                  setProjectFiles(currentProject.id, [...existingFiles, newFile]);
                }

                // Show preview automatically for HTML/JS/CSS files
                if (data.file_path.endsWith('.html') || data.file_path.endsWith('.js') || data.file_path.endsWith('.css')) {
                  setShowPreview(true);
                }

                // Get file extension for syntax highlighting
                const ext = data.file_path.split('.').pop() || 'txt';
                const langMap: Record<string, string> = {
                  'html': 'html', 'css': 'css', 'js': 'javascript', 'ts': 'typescript',
                  'py': 'python', 'json': 'json', 'jsx': 'jsx', 'tsx': 'tsx'
                };
                const lang = langMap[ext] || ext;

                const codeMessage: ChatMessage = {
                  role: 'assistant',
                  content: `📄 Generated: \`${data.file_path}\`\n\n\`\`\`${lang}\n${data.code}\n\`\`\``,
                  timestamp: new Date().toISOString(),
                };
                addMessage(currentProject.id, codeMessage);
              } else if (data.type === 'project_info') {
                // Handle project generation summary
                const deps = data.dependencies?.length > 0
                  ? `\n\n**Dependencies:** ${data.dependencies.join(', ')}`
                  : '';
                const summaryMessage: ChatMessage = {
                  role: 'assistant',
                  content: `🎉 **Project Generated!** Created ${data.file_count} files.\n\n${data.explanation}${deps}\n\n*Click the preview button to see your app in action!*`,
                  timestamp: new Date().toISOString(),
                };
                addMessage(currentProject.id, summaryMessage);
              } else if (data.type === 'status') {
                // Status update (e.g., "Refining code...")
                appendStreamingMessage(`\n\n*${data.message}*`);
              } else if (data.type === 'refinement_info') {
                // Handle refinement summary
                if (data.no_changes) {
                  const noChangeMessage: ChatMessage = {
                    role: 'assistant',
                    content: `ℹ️ **No changes needed:** ${data.explanation}`,
                    timestamp: new Date().toISOString(),
                  };
                  addMessage(currentProject.id, noChangeMessage);
                } else if (data.summary) {
                  const summaryMessage: ChatMessage = {
                    role: 'assistant',
                    content: `✨ **Changes Applied:** ${data.summary}`,
                    timestamp: new Date().toISOString(),
                  };
                  addMessage(currentProject.id, summaryMessage);
                }
              } else if (data.type === 'refined_code') {
                // Handle refined code - update project files
                setGenerationStage('validating', `Checking ${data.file_path} for issues...`);
                const warnings = runSafetyChecks(data.file_path, data.code);
                if (warnings.length > 0) {
                  const warningMessage: ChatMessage = {
                    role: 'assistant',
                    content: `⚠️ Safety checks for \`${data.file_path}\`:\n${warnings.map(w => `- ${w}`).join('\n')}\n\nFile was refined; please review before deploying.`,
                    timestamp: new Date().toISOString(),
                  };
                  addMessage(currentProject.id, warningMessage);
                }
                setGenerationStage('generating', `Updating ${data.file_path}...`);
                const existingFiles = allProjectFiles[currentProject.id] || [];
                const fileExists = existingFiles.some(f => f.path === data.file_path);

                const newFile = {
                  path: data.file_path,
                  content: data.code,
                };

                if (fileExists) {
                  setProjectFiles(
                    currentProject.id,
                    existingFiles.map(f => f.path === data.file_path ? newFile : f)
                  );
                } else {
                  setProjectFiles(currentProject.id, [...existingFiles, newFile]);
                }

                // Show preview automatically
                if (data.file_path.endsWith('.html') || data.file_path.endsWith('.js') || data.file_path.endsWith('.css')) {
                  setShowPreview(true);
                }

                // Get file extension for syntax highlighting
                const ext = data.file_path.split('.').pop() || 'txt';
                const langMap: Record<string, string> = {
                  'html': 'html', 'css': 'css', 'js': 'javascript', 'ts': 'typescript',
                  'py': 'python', 'json': 'json', 'jsx': 'jsx', 'tsx': 'tsx'
                };
                const lang = langMap[ext] || ext;

                const actionLabel = data.is_new ? '📄 Added' : '🔄 Modified';
                const codeMessage: ChatMessage = {
                  role: 'assistant',
                  content: `${actionLabel}: \`${data.file_path}\`\n\n\`\`\`${lang}\n${data.code}\n\`\`\``,
                  timestamp: new Date().toISOString(),
                };
                addMessage(currentProject.id, codeMessage);
              } else if (data.type === 'done') {
                setGenerationStage('complete', 'Generation complete!');
                setStreamStartTime(null);
                // Finalize the response
                if (fullResponse) {
                  console.debug('Final assembled response:', fullResponse);
                  const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: fullResponse,
                    timestamp: new Date().toISOString(),
                  };
                  addMessage(currentProject.id, assistantMessage);
                }
                clearStreamingMessage();
                // Track usage
                usageTracker.trackInteraction({
                  projectId: currentProject.id,
                  timestamp: Date.now(),
                  type: 'chat',
                  provider: aiProvider,
                  prompt: originalPrompt,
                  response: fullResponse,
                  duration: Date.now() - startTime,
                  success: true,
                });
                // Save state after changes
                pushFileHistory(currentProject.id, `After AI generation`);
                // Reset stage after a delay
                setTimeout(() => setGenerationStage('idle'), 2000);
              } else if (data.type === 'error') {
                setGenerationStage('error', data.error);
                throw new Error(data.error);
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setGenerationStage('error', 'Failed to generate. Please try again.');
      setStreamStartTime(null);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API configuration and try again.',
        timestamp: new Date().toISOString(),
      };
      addMessage(currentProject.id, errorMessage);
      clearStreamingMessage();
      setTimeout(() => setGenerationStage('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const retryWithContext = (extraContext: string) => {
    if (!lastPrompt) return;
    const retryPrompt = `${lastPrompt}\n\n${extraContext}`;
    sendMessage(retryPrompt);
  };

  const elapsedSeconds = streamStartTime ? Math.max(0, Math.round((Date.now() - streamStartTime) / 1000)) : null;

  // Auto-resize textarea
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <WelcomeState onPromptSelect={(prompt) => setInputMessage(prompt)} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Project Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold">{currentProject.name}</h2>
            <p className="text-sm text-muted-foreground">{currentProject.description}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingMessage && (
          <WelcomeState onPromptSelect={(prompt) => {
            setInputMessage(prompt);
            inputRef.current?.focus();
          }} />
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-lg p-4',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border'
              )}
            >
              <MessageContent content={message.content} isUser={message.role === 'user'} />
              {message.timestamp && (
                <div className="text-xs opacity-70 mt-2">
                  {formatDate(message.timestamp)}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streamingMessage && (
          <div className="flex gap-3 justify-start">
            <div className="max-w-[80%] rounded-lg p-4 bg-card border border-border">
              <MessageContent content={streamingMessage} isUser={false} />
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
            </div>
          </div>
        )}

        {/* Generation Progress */}
        {isLoading && generationStage !== 'idle' && (
          <GenerationProgress stage={generationStage} message={generationMessage} />
        )}

        {/* Streaming status + retry chips */}
        {(isLoading || streamingMessage) && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-1 rounded-full bg-secondary">
                Tokens ~ {tokenCount}
              </span>
              {elapsedSeconds !== null && (
                <span className="px-2 py-1 rounded-full bg-secondary">
                  {elapsedSeconds}s elapsed
                </span>
              )}
              <span className="px-2 py-1 rounded-full bg-secondary">
                Stage: {generationStage}
              </span>
              {streamingMessage && (
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Streaming…
                </span>
              )}
            </div>
            {lastPrompt && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => retryWithContext('Retrying with more context. Please ensure files and dependencies are up to date.')}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition"
                  disabled={isLoading}
                >
                  Retry with more context
                </button>
                <button
                  onClick={() => retryWithContext('Retrying a concise answer. Focus only on the core change needed.')}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition"
                  disabled={isLoading}
                >
                  Retry concise
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading indicator (fallback) */}
        {isLoading && !streamingMessage && generationStage === 'idle' && (
          <div className="flex gap-3 justify-start">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context-Aware Suggestions */}
      {!isLoading && !streamingMessage && (
        <Suggestions
          projectId={currentProject?.id || null}
          onSuggestionClick={(suggestion) => {
            setInputMessage(suggestion);
            inputRef.current?.focus();
          }}
          lastMessage={messages.length > 0 ? messages[messages.length - 1]?.content : undefined}
        />
      )}

      {/* Smart Context Indicator */}
      {relevantFiles.length > 0 && (
        <div className="px-4 pt-3">
          <SmartContextIndicator
            relevantFiles={relevantFiles}
            onRemoveFile={(path) => {
              setExcludedFiles(prev => new Set([...prev, path]));
            }}
          />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                adjustTextareaHeight(e.target);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build... (Shift+Enter for new line)"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[48px] max-h-[200px]"
              disabled={isLoading}
              rows={1}
            />
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground pointer-events-none">
              {inputMessage.length > 0 && `${inputMessage.length} chars`}
            </div>
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 hover:shadow-lg hover:shadow-primary/25"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
};
