/**
 * Utility functions for execution workspace components
 */

/**
 * Get Monaco language from file extension
 */
export function getMonacoLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';

  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    prisma: 'graphql', // Closest match for Prisma syntax highlighting
    sql: 'sql',
    css: 'css',
    scss: 'scss',
    html: 'html',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'shell',
    bash: 'shell',
    env: 'ini',
    gitignore: 'ini',
  };

  return languageMap[ext] || 'plaintext';
}
