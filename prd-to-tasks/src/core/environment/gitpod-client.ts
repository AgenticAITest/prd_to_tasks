/**
 * Gitpod Client
 * Generates Gitpod workspace URLs
 */

import type { GitpodEnvironment } from '@/types/environment';

/**
 * Generate a Gitpod workspace URL for a repository
 */
export function generateGitpodUrl(repoUrl: string): string {
  // Strip .git suffix if present
  const cleanUrl = repoUrl.replace(/\.git$/, '');
  return `https://gitpod.io/#${cleanUrl}`;
}

/**
 * Create a Gitpod environment reference
 */
export function createGitpodEnvironment(repoUrl: string): GitpodEnvironment {
  return {
    workspaceUrl: generateGitpodUrl(repoUrl),
  };
}

/**
 * Open a Gitpod workspace in a new browser tab
 */
export function openGitpodWorkspace(repoUrl: string): void {
  const url = generateGitpodUrl(repoUrl);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Test if Gitpod is accessible (basic connectivity check)
 * Note: Gitpod doesn't require an API key for basic URL-based workspace creation
 */
export async function testGitpodConnection(): Promise<boolean> {
  try {
    // Just check if gitpod.io is reachable
    await fetch('https://gitpod.io', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    // With no-cors, we can't actually check the response, but if it doesn't throw, we're good
    return true;
  } catch {
    return false;
  }
}
