import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Terminal,
  Play,
  Square,
  Trash2,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { terminalAPI } from '../../services/api';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface CommandOutput {
  id: string;
  command: string;
  output: string[];
  status: 'running' | 'success' | 'error';
  exitCode?: number;
}

export const TerminalPanel: React.FC = () => {
  const { currentProject } = useStore();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CommandOutput[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ command: string; description: string }>>([]);
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Load suggestions and scripts when project changes
  const loadSuggestions = useCallback(async () => {
    if (!currentProject?.id) return;
    
    try {
      const [suggestionsResult, scriptsResult] = await Promise.all([
        terminalAPI.getSuggestions(currentProject.id),
        terminalAPI.getScripts(currentProject.id),
      ]);
      
      setSuggestions(suggestionsResult.commands);
      setScripts(scriptsResult.scripts);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const executeCommand = async (command: string) => {
    if (!command.trim() || !currentProject?.id || isRunning) return;
    
    setIsRunning(true);
    setShowSuggestions(false);
    
    const newOutput: CommandOutput = {
      id: Date.now().toString(),
      command,
      output: [],
      status: 'running',
    };
    
    setHistory(prev => [...prev, newOutput]);
    setInput('');
    
    try {
      const result = await terminalAPI.execute(command, currentProject.id);
      
      setHistory(prev =>
        prev.map(item =>
          item.id === newOutput.id
            ? {
                ...item,
                output: result.output,
                status: result.success ? 'success' : 'error',
                exitCode: result.exit_code ?? undefined,
              }
            : item
        )
      );
    } catch (error) {
      setHistory(prev =>
        prev.map(item =>
          item.id === newOutput.id
            ? {
                ...item,
                output: [error instanceof Error ? error.message : 'Command failed'],
                status: 'error',
              }
            : item
        )
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const commands = history.map(h => h.command);
      if (historyIndex < commands.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commands[commands.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const commands = history.map(h => h.command);
        setInput(commands[commands.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setShowSuggestions(true);
  };

  const runSuggestion = (command: string) => {
    setInput(command);
    inputRef.current?.focus();
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-gray-500">
        <div className="text-center">
          <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a project to use terminal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1a2e] text-gray-100 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#16162a] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-xs text-gray-400">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearHistory}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Clear"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-auto p-3 space-y-3"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Suggestions (shown when empty) */}
        {showSuggestions && history.length === 0 && (
          <div className="space-y-3">
            {/* Quick Commands */}
            {suggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Sparkles className="w-3 h-3" />
                  Quick Commands
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => runSuggestion(cmd.command)}
                      className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors"
                      title={cmd.description}
                    >
                      {cmd.command}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* npm Scripts */}
            {Object.keys(scripts).length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Play className="w-3 h-3" />
                  npm Scripts
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(scripts).map(([name, script]) => (
                    <button
                      key={name}
                      onClick={() => runSuggestion(`npm run ${name}`)}
                      className="px-2 py-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded text-xs transition-colors"
                      title={script}
                    >
                      npm run {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {suggestions.length === 0 && Object.keys(scripts).length === 0 && (
              <div className="text-gray-500 text-xs">
                Type a command and press Enter to execute
              </div>
            )}
          </div>
        )}

        {/* Command History */}
        {history.map((item) => (
          <div key={item.id} className="space-y-1">
            {/* Command Line */}
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3 h-3 text-green-400 flex-shrink-0" />
              <span className="text-green-400">{item.command}</span>
              {item.status === 'running' && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
              )}
              {item.status === 'success' && (
                <CheckCircle className="w-3 h-3 text-green-400" />
              )}
              {item.status === 'error' && (
                <XCircle className="w-3 h-3 text-red-400" />
              )}
              {item.exitCode !== undefined && item.exitCode !== 0 && (
                <span className="text-xs text-red-400">
                  (exit {item.exitCode})
                </span>
              )}
            </div>

            {/* Output */}
            {item.output.length > 0 && (
              <div className="pl-5 space-y-0.5">
                {item.output.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "whitespace-pre-wrap break-all text-xs",
                      item.status === 'error' ? "text-red-400" : "text-gray-300"
                    )}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 text-blue-400 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-2">
        <div className="flex items-center gap-2 bg-[#0d0d1a] rounded px-2 py-1.5">
          <ChevronRight className="w-4 h-4 text-green-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            disabled={isRunning}
            className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-600"
          />
          <button
            onClick={() => executeCommand(input)}
            disabled={isRunning || !input.trim()}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-50 transition-colors"
          >
            {isRunning ? (
              <Square className="w-4 h-4 text-red-400" />
            ) : (
              <Play className="w-4 h-4 text-green-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
