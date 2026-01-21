/**
 * OpenRouter API utilities for fetching available models
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

interface CachedModels {
  models: OpenRouterModel[];
  timestamp: number;
}

const CACHE_KEY = 'openrouter-models-cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached OpenRouter models from localStorage
 */
function getCachedModels(): OpenRouterModel[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedModels = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - parsed.timestamp < CACHE_DURATION_MS) {
      return parsed.models;
    }

    // Cache expired
    return null;
  } catch {
    return null;
  }
}

/**
 * Save models to localStorage cache
 */
function setCachedModels(models: OpenRouterModel[]): void {
  try {
    const cacheData: CachedModels = {
      models,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear the cached models
 */
export function clearOpenRouterCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch available models from OpenRouter API
 * Uses caching to avoid repeated API calls
 */
export async function fetchOpenRouterModels(forceRefresh = false): Promise<OpenRouterModel[]> {
  // Try cache first unless force refresh
  if (!forceRefresh) {
    const cached = getCachedModels();
    if (cached) {
      return cached;
    }
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data: OpenRouterModelsResponse = await response.json();

    // Filter to only include text/chat models (exclude image models)
    const textModels = data.data.filter((model) => {
      // Exclude known image/vision-only models
      const id = model.id.toLowerCase();
      return !id.includes('dall-e') &&
             !id.includes('stable-diffusion') &&
             !id.includes('midjourney') &&
             !id.includes('image');
    });

    // Sort by name
    textModels.sort((a, b) => a.name.localeCompare(b.name));

    // Cache the results
    setCachedModels(textModels);

    return textModels;
  } catch (error) {
    console.error('Failed to fetch OpenRouter models:', error);

    // Return cached models even if expired, as fallback
    const cached = getCachedModels();
    if (cached) {
      return cached;
    }

    throw error;
  }
}

/**
 * Check if we have cached OpenRouter models
 */
export function hasOpenRouterCache(): boolean {
  return getCachedModels() !== null;
}

/**
 * Get the cache timestamp
 */
export function getOpenRouterCacheTimestamp(): Date | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedModels = JSON.parse(cached);
    return new Date(parsed.timestamp);
  } catch {
    return null;
  }
}
