import type { ProjectFile } from '../types';

interface RelevantFile {
  file: ProjectFile;
  relevanceScore: number;
  reason: string;
}

// Keywords that indicate specific file types
const FILE_TYPE_KEYWORDS: Record<string, string[]> = {
  html: ['html', 'page', 'layout', 'structure', 'dom', 'element', 'div', 'template', 'markup'],
  css: ['css', 'style', 'color', 'font', 'layout', 'margin', 'padding', 'flexbox', 'grid', 'responsive', 'design', 'theme', 'animation'],
  js: ['javascript', 'js', 'function', 'event', 'click', 'api', 'fetch', 'async', 'logic', 'handler', 'listener'],
  ts: ['typescript', 'ts', 'type', 'interface', 'generic'],
  tsx: ['react', 'component', 'jsx', 'tsx', 'hook', 'state', 'props', 'render', 'useEffect', 'useState'],
  jsx: ['react', 'component', 'jsx', 'hook', 'state', 'props'],
  py: ['python', 'py', 'def', 'class', 'import', 'backend', 'server', 'api', 'route'],
  json: ['json', 'config', 'package', 'dependency', 'settings'],
  md: ['readme', 'documentation', 'docs', 'markdown'],
};

// Feature keywords that map to specific files
const FEATURE_KEYWORDS: Record<string, string[]> = {
  'index.html': ['homepage', 'main page', 'landing', 'index'],
  'style.css': ['styling', 'css', 'colors', 'fonts', 'design'],
  'app.js': ['main logic', 'app', 'application'],
  'script.js': ['functionality', 'interactive', 'behavior'],
  'package.json': ['dependencies', 'packages', 'npm', 'install'],
  'README.md': ['documentation', 'readme', 'instructions'],
};

// Extract keywords from user message
function extractKeywords(message: string): string[] {
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  // Also extract quoted strings and file paths
  const quotedMatches = message.match(/["']([^"']+)["']/g) || [];
  const filePathMatches = message.match(/[\w-]+\.\w+/g) || [];
  
  return [...new Set([...words, ...quotedMatches.map(q => q.replace(/["']/g, '')), ...filePathMatches])];
}

// Check if message mentions a specific file
function getDirectlyMentionedFiles(message: string, files: ProjectFile[]): ProjectFile[] {
  const mentioned: ProjectFile[] = [];
  const lowerMessage = message.toLowerCase();
  
  for (const file of files) {
    const fileName = file.path.split('/').pop()?.toLowerCase() || '';
    const filePath = file.path.toLowerCase();
    
    // Check if file name or path is directly mentioned
    if (lowerMessage.includes(fileName) || lowerMessage.includes(filePath)) {
      mentioned.push(file);
    }
  }
  
  return mentioned;
}

// Calculate relevance score for a file based on message
function calculateRelevance(file: ProjectFile, keywords: string[], message: string): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  
  const fileName = file.path.split('/').pop() || '';
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  const lowerContent = file.content.toLowerCase();
  const lowerMessage = message.toLowerCase();
  
  // Direct file mention (highest priority)
  if (lowerMessage.includes(fileName.toLowerCase())) {
    score += 100;
    reasons.push('directly mentioned');
  }
  
  // File type relevance
  const typeKeywords = FILE_TYPE_KEYWORDS[fileExt] || [];
  for (const keyword of typeKeywords) {
    if (keywords.includes(keyword)) {
      score += 15;
      reasons.push(`matches ${fileExt} keyword "${keyword}"`);
    }
  }
  
  // Feature keyword matching
  for (const [targetFile, featureKeywords] of Object.entries(FEATURE_KEYWORDS)) {
    if (fileName.toLowerCase().includes(targetFile.toLowerCase())) {
      for (const keyword of featureKeywords) {
        if (lowerMessage.includes(keyword)) {
          score += 20;
          reasons.push(`feature match "${keyword}"`);
        }
      }
    }
  }
  
  // Content contains keywords
  for (const keyword of keywords) {
    if (keyword.length > 3 && lowerContent.includes(keyword)) {
      score += 5;
    }
  }
  
  // Specific code patterns mentioned
  const codePatterns = [
    { pattern: /function\s+(\w+)/gi, type: 'function' },
    { pattern: /class\s+(\w+)/gi, type: 'class' },
    { pattern: /const\s+(\w+)\s*=/gi, type: 'variable' },
    { pattern: /def\s+(\w+)/gi, type: 'function' },
    { pattern: /<(\w+)[^>]*>/gi, type: 'element' },
  ];
  
  for (const { pattern, type } of codePatterns) {
    const matches = file.content.match(pattern);
    if (matches) {
      for (const match of matches) {
        const name = match.replace(pattern, '$1').toLowerCase();
        if (keywords.includes(name) || lowerMessage.includes(name)) {
          score += 25;
          reasons.push(`contains ${type} "${name}"`);
        }
      }
    }
  }
  
  // Boost main/entry files
  if (['index.html', 'index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts', 'App.tsx'].includes(fileName)) {
    score += 10;
    reasons.push('entry point file');
  }
  
  // Boost recently modified (if we had that info)
  // For now, boost smaller files as they're often more relevant for quick changes
  if (file.content.length < 2000) {
    score += 5;
  }
  
  return { 
    score, 
    reason: reasons.length > 0 ? reasons.slice(0, 3).join(', ') : 'general relevance' 
  };
}

// Main function to get relevant files based on user message
export function getRelevantFiles(
  message: string, 
  files: ProjectFile[], 
  maxFiles: number = 5
): RelevantFile[] {
  if (!message || files.length === 0) return [];
  
  const keywords = extractKeywords(message);
  const directlyMentioned = getDirectlyMentionedFiles(message, files);
  
  // Score all files
  const scoredFiles: RelevantFile[] = files.map(file => {
    const { score, reason } = calculateRelevance(file, keywords, message);
    return { file, relevanceScore: score, reason };
  });
  
  // Sort by relevance score
  scoredFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Filter out files with zero relevance and limit results
  const relevantFiles = scoredFiles
    .filter(f => f.relevanceScore > 0)
    .slice(0, maxFiles);
  
  // Always include directly mentioned files even if not in top results
  for (const mentioned of directlyMentioned) {
    if (!relevantFiles.some(rf => rf.file.path === mentioned.path)) {
      relevantFiles.push({
        file: mentioned,
        relevanceScore: 100,
        reason: 'directly mentioned',
      });
    }
  }
  
  return relevantFiles.slice(0, maxFiles);
}

// Build context string from relevant files
export function buildContextString(relevantFiles: RelevantFile[]): string {
  if (relevantFiles.length === 0) return '';
  
  const parts = relevantFiles.map(({ file, reason }) => {
    const truncatedContent = file.content.length > 3000 
      ? file.content.slice(0, 3000) + '\n... (truncated)'
      : file.content;
    
    return `### ${file.path} (${reason})\n\`\`\`\n${truncatedContent}\n\`\`\``;
  });
  
  return `\n\n**Relevant project files for context:**\n${parts.join('\n\n')}`;
}

// Get a summary of included context for display
export function getContextSummary(relevantFiles: RelevantFile[]): string {
  if (relevantFiles.length === 0) return 'No relevant files found';
  
  return relevantFiles
    .map(rf => `${rf.file.path} (${rf.reason})`)
    .join(', ');
}

export type { RelevantFile };
