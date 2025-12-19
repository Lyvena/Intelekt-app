// Auto-Debugger Service - Real-time error detection and automatic fixing
import type { ProjectFile } from '../types';

// Error types
export type ErrorSeverity = 'error' | 'warning' | 'info';
export type ErrorCategory = 'syntax' | 'runtime' | 'type' | 'lint' | 'logic' | 'style';

export interface CodeError {
  id: string;
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  code?: string;
  suggestion?: string;
  autoFixable: boolean;
  fix?: CodeFix;
}

export interface CodeFix {
  description: string;
  changes: Array<{
    file: string;
    oldText: string;
    newText: string;
    line: number;
  }>;
}

export interface DebugSession {
  id: string;
  projectId: string;
  errors: CodeError[];
  warnings: CodeError[];
  fixedCount: number;
  lastAnalyzed: number;
  isAnalyzing: boolean;
}

type DebugListener = (session: DebugSession) => void;

// Syntax error patterns
const SYNTAX_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
  category: ErrorCategory;
  fix?: (match: RegExpMatchArray, line: string) => CodeFix | null;
}> = [
  {
    pattern: /console\.log\s*\(/,
    message: 'Console statement should be removed in production',
    category: 'lint',
    fix: (_match, line) => ({
      description: 'Remove console.log statement',
      changes: [{ file: '', oldText: line, newText: '', line: 0 }],
    }),
  },
  {
    pattern: /\bvar\s+\w+/,
    message: 'Use "let" or "const" instead of "var"',
    category: 'lint',
    fix: () => ({
      description: 'Replace var with const',
      changes: [{ file: '', oldText: 'var ', newText: 'const ', line: 0 }],
    }),
  },
  {
    pattern: /[^!=]==[^=]/,
    message: 'Use strict equality (===) instead of loose equality (==)',
    category: 'lint',
    fix: () => ({
      description: 'Replace == with ===',
      changes: [{ file: '', oldText: '==', newText: '===', line: 0 }],
    }),
  },
  {
    pattern: /[^!]!=[^=]/,
    message: 'Use strict inequality (!==) instead of loose inequality (!=)',
    category: 'lint',
    fix: () => ({
      description: 'Replace != with !==',
      changes: [{ file: '', oldText: '!=', newText: '!==', line: 0 }],
    }),
  },
  {
    pattern: /\bdebugger\b/,
    message: 'Debugger statement should be removed',
    category: 'lint',
    fix: (_match, line) => ({
      description: 'Remove debugger statement',
      changes: [{ file: '', oldText: line, newText: '', line: 0 }],
    }),
  },
  {
    pattern: /function\s*\([^)]*\)\s*{[^}]*\breturn\b[^}]*\breturn\b/,
    message: 'Multiple return statements may indicate unreachable code',
    category: 'logic',
  },
  {
    pattern: /if\s*\([^)]+\)\s*;/,
    message: 'Empty if statement body - possible semicolon error',
    category: 'syntax',
    fix: () => ({
      description: 'Remove accidental semicolon',
      changes: [{ file: '', oldText: ');', newText: ') {', line: 0 }],
    }),
  },
  {
    pattern: /=\s*=\s*=/,
    message: 'Triple equals should not have spaces between',
    category: 'syntax',
    fix: (match) => ({
      description: 'Fix spacing in ===',
      changes: [{ file: '', oldText: match[0], newText: '===', line: 0 }],
    }),
  },
];

// HTML error patterns
const HTML_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
  category: ErrorCategory;
  fix?: (match: RegExpMatchArray, line: string) => CodeFix | null;
}> = [
  {
    pattern: /<img[^>]*(?!alt=)[^>]*>/i,
    message: 'Image missing alt attribute for accessibility',
    category: 'lint',
    fix: () => ({
      description: 'Add empty alt attribute',
      changes: [{ file: '', oldText: '<img', newText: '<img alt=""', line: 0 }],
    }),
  },
  {
    pattern: /<a[^>]*(?!href=)[^>]*>/i,
    message: 'Anchor tag missing href attribute',
    category: 'lint',
  },
  {
    pattern: /<script[^>]*>[^<]+<\/script>/i,
    message: 'Inline scripts should be moved to external files',
    category: 'style',
  },
  {
    pattern: /style\s*=\s*["'][^"']+["']/i,
    message: 'Inline styles should be moved to CSS file',
    category: 'style',
  },
  {
    pattern: /<br\s*\/?>\s*<br\s*\/?>/gi,
    message: 'Multiple <br> tags - consider using CSS margin/padding',
    category: 'style',
  },
];

// CSS error patterns
const CSS_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
  category: ErrorCategory;
  fix?: (match: RegExpMatchArray, line: string) => CodeFix | null;
}> = [
  {
    pattern: /!important/,
    message: 'Avoid using !important - it makes CSS harder to maintain',
    category: 'style',
  },
  {
    pattern: /color:\s*#[0-9a-f]{3,6}/i,
    message: 'Consider using CSS variables for colors',
    category: 'style',
  },
  {
    pattern: /font-size:\s*\d+px/,
    message: 'Consider using rem or em units instead of px for font-size',
    category: 'style',
  },
  {
    pattern: /z-index:\s*\d{4,}/,
    message: 'Very high z-index value - consider organizing z-index scale',
    category: 'style',
  },
];

// Bracket/parenthesis matching
function checkBracketMatching(content: string, filePath: string): CodeError[] {
  const errors: CodeError[] = [];
  const stack: Array<{ char: string; line: number; col: number }> = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closers: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  
  const lines = content.split('\n');
  let inString = false;
  let stringChar = '';
  let inMultilineComment = false;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      const prevChar = col > 0 ? line[col - 1] : '';
      const nextChar = col < line.length - 1 ? line[col + 1] : '';

      // Handle comments
      if (!inString) {
        if (char === '/' && nextChar === '/') {
          break; // Rest of line is comment
        }
        if (char === '/' && nextChar === '*') {
          inMultilineComment = true;
          continue;
        }
        if (char === '*' && nextChar === '/' && inMultilineComment) {
          inMultilineComment = false;
          col++; // Skip the /
          continue;
        }
        if (inMultilineComment) continue;
      }

      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }
      if (inString) continue;

      // Check brackets
      if (pairs[char]) {
        stack.push({ char, line: lineNum + 1, col: col + 1 });
      } else if (closers[char]) {
        const expected = closers[char];
        if (stack.length === 0) {
          errors.push({
            id: `bracket-${lineNum}-${col}`,
            file: filePath,
            line: lineNum + 1,
            column: col + 1,
            message: `Unexpected closing bracket '${char}'`,
            severity: 'error',
            category: 'syntax',
            autoFixable: false,
          });
        } else {
          const top = stack.pop()!;
          if (top.char !== expected) {
            errors.push({
              id: `bracket-mismatch-${lineNum}-${col}`,
              file: filePath,
              line: lineNum + 1,
              column: col + 1,
              message: `Mismatched brackets: expected '${pairs[top.char]}' but found '${char}'`,
              severity: 'error',
              category: 'syntax',
              autoFixable: false,
            });
          }
        }
      }
    }
  }

  // Check for unclosed brackets
  for (const unclosed of stack) {
    errors.push({
      id: `bracket-unclosed-${unclosed.line}-${unclosed.col}`,
      file: filePath,
      line: unclosed.line,
      column: unclosed.col,
      message: `Unclosed bracket '${unclosed.char}'`,
      severity: 'error',
      category: 'syntax',
      autoFixable: false,
    });
  }

  return errors;
}


class AutoDebuggerService {
  private sessions: Map<string, DebugSession> = new Map();
  private listeners: Set<DebugListener> = new Set();
  private analysisQueue: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Analyze files for errors
  analyzeFiles(projectId: string, files: ProjectFile[]): DebugSession {
    const sessionId = `debug-${projectId}-${Date.now()}`;
    const allErrors: CodeError[] = [];
    const allWarnings: CodeError[] = [];

    for (const file of files) {
      const fileErrors = this.analyzeFile(file);
      
      for (const error of fileErrors) {
        if (error.severity === 'error') {
          allErrors.push(error);
        } else {
          allWarnings.push(error);
        }
      }
    }

    const session: DebugSession = {
      id: sessionId,
      projectId,
      errors: allErrors,
      warnings: allWarnings,
      fixedCount: 0,
      lastAnalyzed: Date.now(),
      isAnalyzing: false,
    };

    this.sessions.set(projectId, session);
    this.notifyListeners(session);

    return session;
  }

  // Analyze a single file
  private analyzeFile(file: ProjectFile): CodeError[] {
    const errors: CodeError[] = [];
    const ext = file.path.split('.').pop()?.toLowerCase() || '';
    const lines = file.content.split('\n');

    // Select patterns based on file type
    let patterns: typeof SYNTAX_PATTERNS = [];
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
      patterns = SYNTAX_PATTERNS;
      
      // Check bracket matching for JS/TS
      errors.push(...checkBracketMatching(file.content, file.path));
    } else if (['html', 'htm'].includes(ext)) {
      patterns = HTML_PATTERNS;
    } else if (['css', 'scss', 'less'].includes(ext)) {
      patterns = CSS_PATTERNS;
    }

    // Apply pattern matching
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      for (const { pattern, message, category, fix } of patterns) {
        const match = line.match(pattern);
        if (match) {
          const fixResult = fix ? fix(match, line) : null;
          
          errors.push({
            id: `${file.path}-${lineNum}-${match.index || 0}`,
            file: file.path,
            line: lineNum + 1,
            column: (match.index || 0) + 1,
            message,
            severity: category === 'syntax' || category === 'runtime' ? 'error' : 'warning',
            category,
            autoFixable: !!fixResult,
            fix: fixResult ? {
              ...fixResult,
              changes: fixResult.changes.map(c => ({
                ...c,
                file: file.path,
                line: lineNum + 1,
              })),
            } : undefined,
          });
        }
      }
    }

    // Check for common issues
    this.checkCommonIssues(file, errors);

    return errors;
  }

  // Check for common programming issues
  private checkCommonIssues(file: ProjectFile, errors: CodeError[]) {
    const ext = file.path.split('.').pop()?.toLowerCase() || '';
    const content = file.content;

    // Check for TODO/FIXME comments
    const todoMatches = content.matchAll(/\/\/\s*(TODO|FIXME|HACK|XXX):\s*(.+)/gi);
    for (const match of todoMatches) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      errors.push({
        id: `todo-${file.path}-${lineNum}`,
        file: file.path,
        line: lineNum,
        column: 1,
        message: `${match[1]}: ${match[2]}`,
        severity: 'info',
        category: 'lint',
        autoFixable: false,
      });
    }

    // Check for empty catch blocks
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
      const emptyCatch = content.match(/catch\s*\([^)]*\)\s*{\s*}/g);
      if (emptyCatch) {
        const lineNum = content.indexOf(emptyCatch[0]);
        const line = content.substring(0, lineNum).split('\n').length;
        errors.push({
          id: `empty-catch-${file.path}-${line}`,
          file: file.path,
          line,
          column: 1,
          message: 'Empty catch block - errors should be handled or logged',
          severity: 'warning',
          category: 'logic',
          autoFixable: true,
          fix: {
            description: 'Add console.error to catch block',
            changes: [{
              file: file.path,
              oldText: emptyCatch[0],
              newText: 'catch (error) { console.error(error); }',
              line,
            }],
          },
        });
      }
    }

    // Check for async without await
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
      const asyncMatches = content.matchAll(/async\s+(?:function\s+\w+|\w+\s*=\s*async|\([^)]*\)\s*=>)[^{]*{([^}]*)}/gs);
      for (const match of asyncMatches) {
        if (!match[1].includes('await')) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          errors.push({
            id: `async-no-await-${file.path}-${lineNum}`,
            file: file.path,
            line: lineNum,
            column: 1,
            message: 'Async function without await - may be unnecessary',
            severity: 'warning',
            category: 'logic',
            autoFixable: false,
          });
        }
      }
    }
  }

  // Auto-fix an error
  applyFix(projectId: string, errorId: string, files: ProjectFile[]): ProjectFile[] | null {
    const session = this.sessions.get(projectId);
    if (!session) return null;

    const error = [...session.errors, ...session.warnings].find(e => e.id === errorId);
    if (!error?.fix) return null;

    const updatedFiles = [...files];

    for (const change of error.fix.changes) {
      const fileIndex = updatedFiles.findIndex(f => f.path === change.file);
      if (fileIndex === -1) continue;

      const file = updatedFiles[fileIndex];
      const lines = file.content.split('\n');
      
      if (change.line > 0 && change.line <= lines.length) {
        if (change.newText === '') {
          // Remove the line
          lines.splice(change.line - 1, 1);
        } else {
          // Replace text in line
          lines[change.line - 1] = lines[change.line - 1].replace(change.oldText, change.newText);
        }
      }

      updatedFiles[fileIndex] = {
        ...file,
        content: lines.join('\n'),
      };
    }

    // Update session
    session.fixedCount++;
    session.errors = session.errors.filter(e => e.id !== errorId);
    session.warnings = session.warnings.filter(e => e.id !== errorId);
    this.notifyListeners(session);

    return updatedFiles;
  }

  // Auto-fix all fixable errors
  applyAllFixes(projectId: string, files: ProjectFile[]): ProjectFile[] {
    const session = this.sessions.get(projectId);
    if (!session) return files;

    let updatedFiles = [...files];
    const fixableErrors = [...session.errors, ...session.warnings].filter(e => e.autoFixable);

    // Sort by line number descending to avoid line number shifts
    fixableErrors.sort((a, b) => b.line - a.line);

    for (const error of fixableErrors) {
      const result = this.applyFix(projectId, error.id, updatedFiles);
      if (result) {
        updatedFiles = result;
      }
    }

    return updatedFiles;
  }

  // Schedule analysis with debouncing
  scheduleAnalysis(projectId: string, files: ProjectFile[], delay: number = 500) {
    // Cancel existing scheduled analysis
    const existing = this.analysisQueue.get(projectId);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new analysis
    const timeout = setTimeout(() => {
      this.analyzeFiles(projectId, files);
      this.analysisQueue.delete(projectId);
    }, delay);

    this.analysisQueue.set(projectId, timeout);
  }

  // Get current session
  getSession(projectId: string): DebugSession | null {
    return this.sessions.get(projectId) || null;
  }

  // Subscribe to debug events
  subscribe(listener: DebugListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(session: DebugSession) {
    this.listeners.forEach(listener => listener(session));
  }

  // Get error count for a project
  getErrorCount(projectId: string): { errors: number; warnings: number } {
    const session = this.sessions.get(projectId);
    return {
      errors: session?.errors.length || 0,
      warnings: session?.warnings.length || 0,
    };
  }

  // Clear session
  clearSession(projectId: string) {
    this.sessions.delete(projectId);
    const timeout = this.analysisQueue.get(projectId);
    if (timeout) {
      clearTimeout(timeout);
      this.analysisQueue.delete(projectId);
    }
  }
}

export const autoDebugger = new AutoDebuggerService();
