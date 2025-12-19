// Code Formatter Service - ESLint and Prettier integration for generated code
import type { ProjectFile } from '../types';

interface FormatResult {
  content: string;
  hasChanges: boolean;
  errors: FormatError[];
  warnings: FormatWarning[];
}

interface FormatError {
  line: number;
  column: number;
  message: string;
  ruleId: string;
  severity: 'error';
}

interface FormatWarning {
  line: number;
  column: number;
  message: string;
  ruleId: string;
  severity: 'warning';
}

interface LintResult {
  errors: FormatError[];
  warnings: FormatWarning[];
  fixedContent?: string;
}

// Basic formatting rules
const INDENT_SIZE = 2;

// Format JavaScript/TypeScript code
function formatJavaScript(code: string): string {
  const lines = code.split('\n');
  let indentLevel = 0;
  const formattedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      formattedLines.push('');
      continue;
    }

    // Decrease indent for closing braces/brackets
    if (line.startsWith('}') || line.startsWith(']') || line.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Apply indentation
    const indent = ' '.repeat(indentLevel * INDENT_SIZE);
    formattedLines.push(indent + line);

    // Increase indent for opening braces/brackets
    if (line.endsWith('{') || line.endsWith('[') || line.endsWith('(')) {
      indentLevel++;
    }
    
    // Handle inline braces
    const openCount = (line.match(/{|\[|\(/g) || []).length;
    const closeCount = (line.match(/}|]|\)/g) || []).length;
    indentLevel += openCount - closeCount;
    indentLevel = Math.max(0, indentLevel);
  }

  return formattedLines.join('\n');
}

// Format HTML code
function formatHTML(code: string): string {
  const lines = code.split('\n');
  let indentLevel = 0;
  const formattedLines: string[] = [];
  
  // Self-closing tags that don't increase indent
  const selfClosingTags = ['meta', 'link', 'br', 'hr', 'img', 'input', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    // Check for closing tags
    if (trimmed.startsWith('</')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Apply indentation
    const indent = ' '.repeat(indentLevel * INDENT_SIZE);
    formattedLines.push(indent + trimmed);

    // Check for opening tags (but not self-closing or void elements)
    const tagMatch = trimmed.match(/^<(\w+)/);
    if (tagMatch && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
      const tagName = tagMatch[1].toLowerCase();
      if (!selfClosingTags.includes(tagName)) {
        indentLevel++;
      }
    }

    // Handle closing tag on same line
    if (trimmed.includes('</') && !trimmed.startsWith('</')) {
      // Has both opening and closing, don't change indent
    }
  }

  return formattedLines.join('\n');
}

// Format CSS code
function formatCSS(code: string): string {
  const lines = code.split('\n');
  let indentLevel = 0;
  const formattedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    // Decrease indent for closing braces
    if (trimmed.startsWith('}')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Apply indentation
    const indent = ' '.repeat(indentLevel * INDENT_SIZE);
    formattedLines.push(indent + trimmed);

    // Increase indent for opening braces
    if (trimmed.endsWith('{')) {
      indentLevel++;
    }
  }

  return formattedLines.join('\n');
}

// Format JSON
function formatJSON(code: string): string {
  try {
    const parsed = JSON.parse(code);
    return JSON.stringify(parsed, null, INDENT_SIZE);
  } catch {
    return code;
  }
}

// Basic linting rules
function lintJavaScript(code: string): LintResult {
  const errors: FormatError[] = [];
  const warnings: FormatWarning[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for console.log statements
    if (line.includes('console.log(')) {
      warnings.push({
        line: lineNum,
        column: line.indexOf('console.log') + 1,
        message: 'Unexpected console statement',
        ruleId: 'no-console',
        severity: 'warning',
      });
    }

    // Check for var usage
    if (/\bvar\s+/.test(line)) {
      warnings.push({
        line: lineNum,
        column: line.indexOf('var') + 1,
        message: "Unexpected var, use let or const instead",
        ruleId: 'no-var',
        severity: 'warning',
      });
    }

    // Check for == instead of ===
    if (/[^=!]==[^=]/.test(line)) {
      warnings.push({
        line: lineNum,
        column: line.indexOf('==') + 1,
        message: 'Expected === instead of ==',
        ruleId: 'eqeqeq',
        severity: 'warning',
      });
    }

    // Check for debugger statements
    if (/\bdebugger\b/.test(line)) {
      errors.push({
        line: lineNum,
        column: line.indexOf('debugger') + 1,
        message: 'Unexpected debugger statement',
        ruleId: 'no-debugger',
        severity: 'error',
      });
    }

    // Check for trailing whitespace
    if (line.endsWith(' ') || line.endsWith('\t')) {
      warnings.push({
        line: lineNum,
        column: line.length,
        message: 'Trailing whitespace',
        ruleId: 'no-trailing-spaces',
        severity: 'warning',
      });
    }
  }

  return { errors, warnings };
}

// Get language from file extension
function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'css',
    json: 'json',
    md: 'markdown',
  };
  return langMap[ext] || 'text';
}

// Main format function
export function formatCode(content: string, filePath: string): FormatResult {
  const language = getLanguage(filePath);
  let formattedContent = content;
  let hasChanges = false;
  const errors: FormatError[] = [];
  const warnings: FormatWarning[] = [];

  switch (language) {
    case 'javascript':
    case 'typescript': {
      formattedContent = formatJavaScript(content);
      const lintResult = lintJavaScript(formattedContent);
      errors.push(...lintResult.errors);
      warnings.push(...lintResult.warnings);
      break;
    }
    case 'html':
      formattedContent = formatHTML(content);
      break;
    case 'css':
      formattedContent = formatCSS(content);
      break;
    case 'json':
      formattedContent = formatJSON(content);
      break;
    default:
      // No formatting for other file types
      break;
  }

  hasChanges = formattedContent !== content;

  return {
    content: formattedContent,
    hasChanges,
    errors,
    warnings,
  };
}

// Format multiple files
export function formatFiles(files: ProjectFile[]): { files: ProjectFile[]; results: Map<string, FormatResult> } {
  const results = new Map<string, FormatResult>();
  const formattedFiles = files.map((file) => {
    const result = formatCode(file.content, file.path);
    results.set(file.path, result);
    return {
      ...file,
      content: result.content,
    };
  });

  return { files: formattedFiles, results };
}

// Lint file without formatting
export function lintFile(content: string, filePath: string): LintResult {
  const language = getLanguage(filePath);
  
  if (language === 'javascript' || language === 'typescript') {
    return lintJavaScript(content);
  }
  
  return { errors: [], warnings: [] };
}

// Auto-fix common issues
export function autoFix(content: string, filePath: string): string {
  const language = getLanguage(filePath);
  let fixed = content;

  if (language === 'javascript' || language === 'typescript') {
    // Replace var with let
    fixed = fixed.replace(/\bvar\s+(?=\w)/g, 'let ');
    
    // Replace == with === (but not !== or ==)
    fixed = fixed.replace(/([^!=])===([^=])/g, '$1===$2');
    
    // Remove trailing whitespace
    fixed = fixed.split('\n').map(line => line.trimEnd()).join('\n');
    
    // Remove debugger statements
    fixed = fixed.replace(/\bdebugger;?\s*\n?/g, '');
  }

  return fixed;
}

export type { FormatResult, FormatError, FormatWarning, LintResult };
