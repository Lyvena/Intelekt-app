import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface XTerminalProps {
  projectId: string;
  onCommand?: (command: string) => void;
}

export const XTerminal: React.FC<XTerminalProps> = ({ projectId, onCommand }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const commandBufferRef = useRef<string>('');

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      theme: {
        background: '#1a1a2e',
        foreground: '#e4e4e7',
        cursor: '#22c55e',
        cursorAccent: '#1a1a2e',
        selectionBackground: '#3b82f680',
        black: '#27272a',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
      allowProposedApi: true,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    // Open terminal in container
    term.open(terminalRef.current);
    fitAddon.fit();

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Write welcome message
    term.writeln('\x1b[1;32m╭──────────────────────────────────────╮\x1b[0m');
    term.writeln('\x1b[1;32m│\x1b[0m  \x1b[1;36mIntelekt Terminal\x1b[0m                   \x1b[1;32m│\x1b[0m');
    term.writeln('\x1b[1;32m│\x1b[0m  Type commands to execute            \x1b[1;32m│\x1b[0m');
    term.writeln('\x1b[1;32m╰──────────────────────────────────────╯\x1b[0m');
    term.writeln('');
    writePrompt(term);

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      const ws = wsRef.current;
      ws?.close();
      term.dispose();
    };
  }, []);


  // Execute command via REST API (fallback)
  const executeCommand = useCallback(async (command: string) => {
    if (!xtermRef.current) return;

    const term = xtermRef.current;
    term.writeln('');

    // Try WebSocket first, fallback to REST
    try {
      const response = await fetch(`${API_BASE_URL}/api/terminal/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          project_id: projectId,
          timeout: 60,
        }),
      });

      const result = await response.json();

      if (result.output) {
        result.output.forEach((line: string) => {
          term.writeln(line);
        });
      }

      if (result.error) {
        term.writeln(`\x1b[31m${result.error}\x1b[0m`);
      }

      if (result.exit_code !== 0 && result.exit_code !== null) {
        term.writeln(`\x1b[31mProcess exited with code ${result.exit_code}\x1b[0m`);
      }
    } catch (error) {
      term.writeln(`\x1b[31mError: ${error instanceof Error ? error.message : 'Command failed'}\x1b[0m`);
    }

    writePrompt(term);
    onCommand?.(command);
  }, [projectId, onCommand]);

  // Handle terminal input
  useEffect(() => {
    if (!xtermRef.current) return;

    const term = xtermRef.current;

    const handleData = (data: string) => {
      const code = data.charCodeAt(0);

      if (code === 13) {
        // Enter key
        const command = commandBufferRef.current.trim();
        if (command) {
          executeCommand(command);
        } else {
          term.writeln('');
          writePrompt(term);
        }
        commandBufferRef.current = '';
      } else if (code === 127) {
        // Backspace
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (code === 3) {
        // Ctrl+C
        term.writeln('^C');
        commandBufferRef.current = '';
        writePrompt(term);
        wsRef.current?.close();
      } else if (code === 12) {
        // Ctrl+L - Clear
        term.clear();
        writePrompt(term);
      } else if (code >= 32) {
        // Printable characters
        commandBufferRef.current += data;
        term.write(data);
      }
    };

    const disposable = term.onData(handleData);

    return () => {
      disposable.dispose();
    };
  }, [executeCommand]);

  // Resize terminal when container size changes
  useEffect(() => {
    if (!terminalRef.current || !fitAddonRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddonRef.current?.fit();
      } catch {
        // Ignore fit errors during resize
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div 
      ref={terminalRef} 
      className="h-full w-full"
      style={{ padding: '8px', backgroundColor: '#1a1a2e' }}
    />
  );
};

// Helper to write prompt
function writePrompt(term: Terminal) {
  term.write('\x1b[1;32m❯\x1b[0m ');
}

export default XTerminal;
