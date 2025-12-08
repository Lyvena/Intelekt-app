import React, { useState, useRef, useEffect } from 'react';
import { Send, Folder, Sparkles } from 'lucide-react';
import { useStore, useCurrentProjectMessages } from '../../store/useStore';
import type { ChatMessage } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { MessageContent } from './MessageContent';
import { Suggestions } from './Suggestions';

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
    projectFiles,
    setProjectFiles,
    setShowPreview,
  } = useStore();

  const messages = useCurrentProjectMessages();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  useEffect(() => {
    // Focus input when project changes
    inputRef.current?.focus();
  }, [currentProject?.id]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentProject) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    addMessage(currentProject.id, userMessage);
    setInputMessage('');
    setIsLoading(true);
    clearStreamingMessage();

    try {
      // Use streaming endpoint
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: inputMessage,
          project_id: currentProject.id,
          ai_provider: aiProvider,
          tech_stack: currentProject.tech_stack,
          conversation_history: messages,
        }),
      });

      if (!response.ok) {
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
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'chunk') {
                fullResponse += data.content;
                appendStreamingMessage(data.content);
              } else if (data.type === 'code') {
                // Handle generated code - add to project files
                const existingFiles = projectFiles[currentProject.id] || [];
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
                const existingFiles = projectFiles[currentProject.id] || [];
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
                // Finalize the response
                if (fullResponse) {
                  const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: fullResponse,
                    timestamp: new Date().toISOString(),
                  };
                  addMessage(currentProject.id, assistantMessage);
                }
                clearStreamingMessage();
              } else if (data.type === 'error') {
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
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API configuration and try again.',
        timestamp: new Date().toISOString(),
      };
      addMessage(currentProject.id, errorMessage);
      clearStreamingMessage();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Intelekt</h2>
          <p className="text-muted-foreground mb-6">
            Create a new project or select an existing one to start building with AI
          </p>
        </div>
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
          <div className="text-center text-muted-foreground py-8">
            <p>Start building by describing what you want to create</p>
          </div>
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

        {/* Loading indicator */}
        {isLoading && !streamingMessage && (
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

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to build..."
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
