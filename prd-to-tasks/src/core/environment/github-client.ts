/**
 * GitHub API Client
 * Creates repositories and pushes files
 */

import type { GitHubEnvironment, GeneratedFile } from '@/types/environment';

// Use Vite's dev server proxy to avoid CORS issues
// In development: /proxy/github -> https://api.github.com
// For production, a backend proxy would be needed
const GITHUB_API_BASE = '/proxy/github';

function githubUrl(path: string): string {
  return `${GITHUB_API_BASE}${path}`;
}

interface GitHubUser {
  login: string;
  name: string | null;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
  owner: {
    login: string;
  };
}

interface GitHubTree {
  sha: string;
  url: string;
}

interface GitHubCommit {
  sha: string;
  url: string;
}

interface GitHubRef {
  ref: string;
  object: {
    sha: string;
  };
}

/**
 * Test if the GitHub token is valid
 */
export async function testGitHubConnection(token: string): Promise<boolean> {
  try {
    const response = await fetch(githubUrl('/user'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get the authenticated user
 */
export async function getGitHubUser(token: string): Promise<GitHubUser> {
  const response = await fetch(githubUrl('/user'), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get GitHub user');
  }

  return response.json();
}

/**
 * Get an existing GitHub repository
 */
export async function getGitHubRepo(
  token: string,
  owner: string,
  repoName: string
): Promise<GitHubEnvironment | null> {
  const response = await fetch(githubUrl(`/repos/${owner}/${repoName}`), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    return null;
  }

  const repo: GitHubRepo = await response.json();

  return {
    repoName: repo.name,
    repoUrl: repo.html_url,
    cloneUrl: repo.clone_url,
    owner: repo.owner.login,
    defaultBranch: repo.default_branch,
  };
}

/**
 * Create a new GitHub repository, or return existing one if it already exists
 */
export async function createGitHubRepo(
  token: string,
  repoName: string,
  description: string = '',
  isPrivate: boolean = true
): Promise<GitHubEnvironment> {
  // First, get the current user to check for existing repo
  const user = await getGitHubUser(token);

  // Check if repo already exists
  const existingRepo = await getGitHubRepo(token, user.login, repoName);
  if (existingRepo) {
    console.log(`Repository ${repoName} already exists, using existing repo`);
    return existingRepo;
  }

  // Create new repo
  const response = await fetch(githubUrl('/user/repos'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: repoName,
      description,
      private: isPrivate,
      auto_init: true, // Initialize with README
      gitignore_template: 'Node',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create GitHub repository: ${error}`);
  }

  const repo: GitHubRepo = await response.json();

  return {
    repoName: repo.name,
    repoUrl: repo.html_url,
    cloneUrl: repo.clone_url,
    owner: repo.owner.login,
    defaultBranch: repo.default_branch,
  };
}

// Track last successful commit time for cooldown
let lastCommitTime = 0;
const COMMIT_COOLDOWN_MS = 10000; // 10 seconds between commits
const RETRY_DELAY_MS = 10000; // 10 seconds between retries

/**
 * Push multiple files to a repository in a single commit
 * Includes retry logic to handle race conditions when multiple commits happen concurrently
 */
export async function pushFilesToRepo(
  token: string,
  owner: string,
  repo: string,
  files: GeneratedFile[],
  commitMessage: string = 'Initial scaffold',
  branch: string = 'main',
  maxRetries: number = 3
): Promise<void> {
  // Enforce cooldown between commits to let GitHub propagate
  const timeSinceLastCommit = Date.now() - lastCommitTime;
  if (lastCommitTime > 0 && timeSinceLastCommit < COMMIT_COOLDOWN_MS) {
    const waitTime = COMMIT_COOLDOWN_MS - timeSinceLastCommit;
    console.log(`[GitHub] Waiting ${Math.ceil(waitTime / 1000)}s for commit cooldown...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await pushFilesToRepoOnce(token, owner, repo, files, commitMessage, branch);
      lastCommitTime = Date.now(); // Record successful commit time
      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on branch reference update failures (race condition)
      if (!lastError.message.includes('Failed to update branch reference')) {
        throw lastError;
      }

      // Wait 10 seconds before retrying
      if (attempt < maxRetries - 1) {
        console.log(`[GitHub] Retry ${attempt + 1}/${maxRetries} after ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError || new Error('Failed to push files after retries');
}

/**
 * Internal function to push files in a single attempt
 */
async function pushFilesToRepoOnce(
  token: string,
  owner: string,
  repo: string,
  files: GeneratedFile[],
  commitMessage: string,
  branch: string
): Promise<void> {
  // Get the latest commit SHA for the branch
  const refResponse = await fetch(
    githubUrl(`/repos/${owner}/${repo}/git/ref/heads/${branch}`),
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!refResponse.ok) {
    throw new Error('Failed to get branch reference');
  }

  const ref: GitHubRef = await refResponse.json();
  const latestCommitSha = ref.object.sha;

  // Get the tree SHA from the latest commit
  const commitResponse = await fetch(
    githubUrl(`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`),
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!commitResponse.ok) {
    throw new Error('Failed to get commit details');
  }

  const commitData = await commitResponse.json();
  const baseTreeSha = commitData.tree.sha;

  // Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const blobResponse = await fetch(
        githubUrl(`/repos/${owner}/${repo}/git/blobs`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: file.content,
            encoding: 'utf-8',
          }),
        }
      );

      if (!blobResponse.ok) {
        throw new Error(`Failed to create blob for ${file.path}`);
      }

      const blob = await blobResponse.json();
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      };
    })
  );

  // Create a new tree
  const treeResponse = await fetch(
    githubUrl(`/repos/${owner}/${repo}/git/trees`),
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    }
  );

  if (!treeResponse.ok) {
    throw new Error('Failed to create tree');
  }

  const tree: GitHubTree = await treeResponse.json();

  // Create a new commit
  const newCommitResponse = await fetch(
    githubUrl(`/repos/${owner}/${repo}/git/commits`),
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        tree: tree.sha,
        parents: [latestCommitSha],
      }),
    }
  );

  if (!newCommitResponse.ok) {
    throw new Error('Failed to create commit');
  }

  const newCommit: GitHubCommit = await newCommitResponse.json();

  // Update the branch reference
  const updateRefResponse = await fetch(
    githubUrl(`/repos/${owner}/${repo}/git/refs/heads/${branch}`),
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: newCommit.sha,
        force: false,
      }),
    }
  );

  if (!updateRefResponse.ok) {
    throw new Error('Failed to update branch reference');
  }
}

/**
 * Delete a GitHub repository
 */
export async function deleteGitHubRepo(
  token: string,
  owner: string,
  repo: string
): Promise<void> {
  const response = await fetch(
    githubUrl(`/repos/${owner}/${repo}`),
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete repository');
  }
}

/**
 * Check if a repository exists
 */
export async function repoExists(
  token: string,
  owner: string,
  repo: string
): Promise<boolean> {
  const response = await fetch(
    githubUrl(`/repos/${owner}/${repo}`),
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );
  return response.ok;
}
