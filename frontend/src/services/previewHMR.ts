// Hot Module Replacement Service for Preview Panel
// Enables live updates without full page reload

interface HMRMessage {
  type: 'update' | 'reload' | 'error' | 'connected';
  path?: string;
  content?: string;
  error?: string;
  timestamp?: number;
}

type HMRListener = (message: HMRMessage) => void;

class PreviewHMRService {
  private iframe: HTMLIFrameElement | null = null;
  private files: Record<string, string> = {};
  private listeners: Set<HMRListener> = new Set();
  private lastUpdate: number = 0;
  private updateQueue: Map<string, string> = new Map();
  private updateTimeout: ReturnType<typeof setTimeout> | null = null;
  private isConnected: boolean = false;

  // Initialize HMR with iframe reference
  init(iframe: HTMLIFrameElement, initialFiles: Record<string, string>) {
    this.iframe = iframe;
    this.files = { ...initialFiles };
    this.isConnected = true;
    
    // Inject HMR client script into iframe
    this.injectHMRClient();
    
    this.notifyListeners({ type: 'connected', timestamp: Date.now() });
  }

  // Inject HMR client script into the preview iframe
  private injectHMRClient() {
    if (!this.iframe?.contentWindow) return;

    const script = `
      window.__HMR__ = {
        onUpdate: function(callback) {
          window.__HMR_CALLBACK__ = callback;
        },
        apply: function(path, content) {
          if (window.__HMR_CALLBACK__) {
            window.__HMR_CALLBACK__(path, content);
          }
        }
      };

      // CSS hot reload
      window.__HMR__.onUpdate(function(path, content) {
        if (path.endsWith('.css')) {
          var existingStyle = document.querySelector('style[data-hmr-path="' + path + '"]');
          if (existingStyle) {
            existingStyle.textContent = content;
          } else {
            var style = document.createElement('style');
            style.setAttribute('data-hmr-path', path);
            style.textContent = content;
            document.head.appendChild(style);
          }
          console.log('[HMR] CSS updated:', path);
          return true;
        }

        // JS requires reload for now
        if (path.endsWith('.js') || path.endsWith('.ts')) {
          console.log('[HMR] JS changed, reloading:', path);
          return false; // Signal that full reload is needed
        }

        // HTML requires rebuild
        if (path.endsWith('.html')) {
          console.log('[HMR] HTML changed, rebuilding');
          return false;
        }

        return false;
      });
    `;

    try {
      const doc = this.iframe.contentDocument;
      if (doc) {
        const scriptEl = doc.createElement('script');
        scriptEl.textContent = script;
        doc.head?.appendChild(scriptEl);
      }
    } catch (e) {
      console.error('[HMR] Failed to inject client:', e);
    }
  }

  // Update a single file with debouncing
  updateFile(path: string, content: string) {
    if (this.files[path] === content) return; // No change

    this.files[path] = content;
    this.updateQueue.set(path, content);
    this.lastUpdate = Date.now();

    // Debounce updates
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.processUpdateQueue();
    }, 100);
  }

  // Process queued updates
  private processUpdateQueue() {
    if (this.updateQueue.size === 0) return;

    const updates = new Map(this.updateQueue);
    this.updateQueue.clear();

    let needsFullReload = false;

    for (const [path, content] of updates) {
      const handled = this.applyUpdate(path, content);
      if (!handled) {
        needsFullReload = true;
      }
    }

    if (needsFullReload) {
      this.fullReload();
    }
  }

  // Apply a single update via HMR
  private applyUpdate(path: string, content: string): boolean {
    if (!this.iframe?.contentWindow) return false;

    try {
      // CSS can be hot-reloaded
      if (path.endsWith('.css')) {
        const win = this.iframe.contentWindow as Window & { __HMR__?: { apply: (p: string, c: string) => boolean } };
        if (win.__HMR__?.apply) {
          const result = win.__HMR__.apply(path, content);
          this.notifyListeners({ 
            type: 'update', 
            path, 
            content,
            timestamp: Date.now() 
          });
          return result;
        }
      }

      // Other files need full reload
      return false;
    } catch (e) {
      console.error('[HMR] Update failed:', e);
      return false;
    }
  }

  // Full reload of the preview
  fullReload() {
    if (!this.iframe) return;

    this.notifyListeners({ type: 'reload', timestamp: Date.now() });
    
    // Rebuild and reload the iframe content
    const html = this.buildPreviewHTML();
    
    try {
      const doc = this.iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        
        // Re-inject HMR client after reload
        setTimeout(() => this.injectHMRClient(), 100);
      }
    } catch (e) {
      console.error('[HMR] Reload failed:', e);
      this.notifyListeners({ type: 'error', error: String(e) });
    }
  }

  // Build complete HTML from files
  private buildPreviewHTML(): string {
    const htmlFile = this.files['index.html'] || '';
    const cssFiles = Object.entries(this.files)
      .filter(([path]) => path.endsWith('.css'))
      .map(([path, content]) => ({ path, content }));
    const jsFiles = Object.entries(this.files)
      .filter(([path]) => path.endsWith('.js') || path.endsWith('.ts'))
      .map(([path, content]) => ({ path, content }));

    // Parse HTML and inject CSS/JS
    let html = htmlFile;

    // Inject CSS
    const cssInjection = cssFiles
      .map(({ path, content }) => `<style data-hmr-path="${path}">${content}</style>`)
      .join('\n');

    // Inject JS (transpile TypeScript if needed)
    const jsInjection = jsFiles
      .map(({ path, content }) => {
        const transpiled = this.transpileIfNeeded(path, content);
        return `<script data-hmr-path="${path}">${transpiled}</script>`;
      })
      .join('\n');

    // Insert before </head> or at start
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${cssInjection}\n</head>`);
    } else {
      html = cssInjection + '\n' + html;
    }

    // Insert before </body> or at end
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${jsInjection}\n</body>`);
    } else {
      html = html + '\n' + jsInjection;
    }

    return html;
  }

  // Basic TypeScript transpilation (removes type annotations)
  private transpileIfNeeded(path: string, content: string): string {
    if (!path.endsWith('.ts') && !path.endsWith('.tsx')) {
      return content;
    }

    // Simple TypeScript to JavaScript transpilation
    let js = content;

    // Remove type annotations
    js = js.replace(/:\s*\w+(\[\])?(\s*[,);={])/g, '$2');
    
    // Remove interface/type declarations
    js = js.replace(/^(export\s+)?(interface|type)\s+\w+.*?[{;].*?^}/gms, '');
    
    // Remove generic type parameters
    js = js.replace(/<\w+(\s*,\s*\w+)*>/g, '');
    
    // Remove 'as' type assertions
    js = js.replace(/\s+as\s+\w+/g, '');
    
    // Remove 'readonly' modifier
    js = js.replace(/\breadonly\s+/g, '');
    
    // Remove access modifiers
    js = js.replace(/\b(public|private|protected)\s+/g, '');

    return js;
  }

  // Update all files at once
  updateFiles(newFiles: Record<string, string>) {
    const changedFiles: string[] = [];

    for (const [path, content] of Object.entries(newFiles)) {
      if (this.files[path] !== content) {
        changedFiles.push(path);
        this.files[path] = content;
      }
    }

    // Remove deleted files
    for (const path of Object.keys(this.files)) {
      if (!(path in newFiles)) {
        changedFiles.push(path);
        delete this.files[path];
      }
    }

    if (changedFiles.length > 0) {
      // Check if we can hot-reload all changes
      const cssOnly = changedFiles.every(p => p.endsWith('.css'));
      
      if (cssOnly) {
        for (const path of changedFiles) {
          this.applyUpdate(path, this.files[path] || '');
        }
      } else {
        this.fullReload();
      }
    }
  }

  // Subscribe to HMR events
  subscribe(listener: HMRListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(message: HMRMessage) {
    this.listeners.forEach(listener => listener(message));
  }

  // Get current connection status
  getStatus(): { connected: boolean; lastUpdate: number } {
    return {
      connected: this.isConnected,
      lastUpdate: this.lastUpdate,
    };
  }

  // Cleanup
  dispose() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.iframe = null;
    this.files = {};
    this.listeners.clear();
    this.isConnected = false;
  }
}

// Export singleton instance
export const previewHMR = new PreviewHMRService();

// Export types
export type { HMRMessage, HMRListener };
