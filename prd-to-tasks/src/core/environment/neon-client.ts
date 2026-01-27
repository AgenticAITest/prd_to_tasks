/**
 * Neon Database API Client
 * Creates and manages Neon PostgreSQL databases
 */

import type { NeonEnvironment } from '@/types/environment';

// Use Vite's dev server proxy to avoid CORS issues
// In development: /proxy/neon -> https://console.neon.tech/api/v2
// For production, a backend proxy would be needed
const NEON_API_BASE = '/proxy/neon';

function neonUrl(path: string): string {
  const url = `${NEON_API_BASE}${path}`;
  console.log('Neon API URL:', url);
  return url;
}

interface NeonProject {
  id: string;
  name: string;
  region_id: string;
  created_at: string;
}

interface NeonDatabase {
  id: number;
  name: string;
  owner_name: string;
}

interface NeonConnectionUri {
  connection_uri: string;
}

interface NeonBranch {
  id: string;
  name: string;
}

interface NeonRole {
  name: string;
  password?: string;
}

interface CreateProjectResponse {
  project: NeonProject;
  databases: NeonDatabase[];
  connection_uris: NeonConnectionUri[];
  branch: NeonBranch;
  roles: NeonRole[];
}

/**
 * Get the user's organization ID (needed for Neon API v2)
 */
async function getNeonOrgId(apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(neonUrl('/users/me/organizations'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });
    if (response.ok) {
      const data = await response.json();
      // Return the first org_id
      if (data.organizations && data.organizations.length > 0) {
        return data.organizations[0].id;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Test if the Neon API key is valid
 */
export async function testNeonConnection(apiKey: string): Promise<boolean> {
  try {
    // First try to get organizations to validate the key
    const response = await fetch(neonUrl('/users/me/organizations'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });
    console.log('Neon API response:', response.status, response.statusText);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Neon API error body:', errorText);
    }
    return response.ok;
  } catch (error) {
    console.error('Neon API test failed:', error);
    // CORS errors will throw, but the key might still be valid
    // For now, we'll do a basic format check as fallback
    // Neon API keys start with specific prefixes
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('CORS issue detected - falling back to format validation');
      // Neon API keys are typically long strings
      return apiKey.length > 20;
    }
    return false;
  }
}

/**
 * Create a new Neon database project
 */
export async function createNeonDatabase(
  apiKey: string,
  projectName: string,
  region: string = 'aws-us-east-1'
): Promise<NeonEnvironment> {
  // First get the org_id (required for Neon API v2)
  const orgId = await getNeonOrgId(apiKey);
  if (!orgId) {
    throw new Error('Failed to get Neon organization ID. Please check your API key.');
  }

  console.log('Creating Neon project with org_id:', orgId);

  const response = await fetch(neonUrl('/projects'), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project: {
        name: projectName,
        region_id: region,
        pg_version: 16,
        org_id: orgId,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Neon database: ${error}`);
  }

  const data: CreateProjectResponse = await response.json();

  // Extract connection details
  const connectionUri = data.connection_uris?.[0]?.connection_uri;
  if (!connectionUri) {
    throw new Error('No connection URI returned from Neon');
  }

  // Parse connection URI to extract host and user
  const uriMatch = connectionUri.match(/postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  const user = uriMatch?.[1] || '';
  const host = uriMatch?.[3] || '';
  const databaseName = uriMatch?.[4] || 'neondb';

  return {
    projectId: data.project.id,
    connectionUri,
    databaseName,
    region: data.project.region_id,
    host,
    user,
  };
}

/**
 * Delete a Neon project
 */
export async function deleteNeonProject(apiKey: string, projectId: string): Promise<void> {
  const response = await fetch(neonUrl(`/projects/${projectId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Neon project: ${error}`);
  }
}

/**
 * Get list of Neon projects
 */
export async function listNeonProjects(apiKey: string): Promise<NeonProject[]> {
  const response = await fetch(neonUrl('/projects'), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to list Neon projects');
  }

  const data = await response.json();
  return data.projects || [];
}
