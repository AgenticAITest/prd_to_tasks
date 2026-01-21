/**
 * Environment configuration loader
 * Loads API keys from .env file (via Vite's import.meta.env)
 */

import type { APIKeySettings } from '@/types/settings';

/**
 * Get API keys from environment variables.
 * Only returns keys that have non-empty values.
 */
export function getEnvApiKeys(): Partial<APIKeySettings> {
  const keys: Partial<APIKeySettings> = {};

  const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey.trim()) {
    keys.anthropic = anthropicKey.trim();
  }

  const googleKey = import.meta.env.VITE_GOOGLE_API_KEY;
  if (googleKey && googleKey.trim()) {
    keys.google = googleKey.trim();
  }

  const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (deepseekKey && deepseekKey.trim()) {
    keys.deepseek = deepseekKey.trim();
  }

  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (openaiKey && openaiKey.trim()) {
    keys.openai = openaiKey.trim();
  }

  const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (openrouterKey && openrouterKey.trim()) {
    keys.openrouter = openrouterKey.trim();
  }

  return keys;
}

/**
 * Check if any API keys are configured in environment variables
 */
export function hasEnvApiKeys(): boolean {
  return Object.keys(getEnvApiKeys()).length > 0;
}
