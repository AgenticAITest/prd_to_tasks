import type { LLMProvider, LLMResponse, TaskTierType } from '@/types/llm';
import type { ModelSelectionSettings, APIKeySettings } from '@/types/settings';
import { callAnthropic } from './providers/anthropic';
import { callGoogle } from './providers/google';
import { callDeepSeek } from './providers/deepseek';
import { callOpenAI } from './providers/openai';
import { callOpenRouter } from './providers/openrouter';

export interface LLMRouterConfig {
  apiKeys: APIKeySettings;
  modelSelection: ModelSelectionSettings;
}

export class LLMRouter {
  private config: LLMRouterConfig;

  constructor(config: LLMRouterConfig) {
    this.config = config;
  }

  updateConfig(config: LLMRouterConfig) {
    this.config = config;
  }

  async call(
    tier: TaskTierType,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 4096
  ): Promise<LLMResponse> {
    const tierConfig = this.config.modelSelection[tier];
    const apiKey = this.config.apiKeys[tierConfig.provider];

    if (!apiKey) {
      throw new Error(`No API key configured for provider: ${tierConfig.provider}`);
    }

    if (!tierConfig.enabled) {
      throw new Error(`Tier ${tier} is disabled`);
    }

    return this.callProvider(
      tierConfig.provider,
      apiKey,
      tierConfig.model,
      systemPrompt,
      userPrompt,
      maxTokens
    );
  }

  async callProvider(
    provider: LLMProvider,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 4096
  ): Promise<LLMResponse> {
    switch (provider) {
      case 'anthropic':
        return callAnthropic(apiKey, model, systemPrompt, userPrompt, maxTokens);

      case 'google':
        return callGoogle(apiKey, model, systemPrompt, userPrompt, maxTokens);

      case 'deepseek':
        return callDeepSeek(apiKey, model, systemPrompt, userPrompt, maxTokens);

      case 'openai':
        return callOpenAI(apiKey, model, systemPrompt, userPrompt, maxTokens);

      case 'openrouter':
        return callOpenRouter(apiKey, model, systemPrompt, userPrompt, maxTokens);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async callWithRetry(
    tier: TaskTierType,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 4096,
    maxRetries: number = 3
  ): Promise<LLMResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.call(tier, systemPrompt, userPrompt, maxTokens);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on auth errors
        if (lastError.message.includes('401') || lastError.message.includes('403')) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];

    if (this.config.apiKeys.anthropic) providers.push('anthropic');
    if (this.config.apiKeys.google) providers.push('google');
    if (this.config.apiKeys.deepseek) providers.push('deepseek');
    if (this.config.apiKeys.openai) providers.push('openai');
    if (this.config.apiKeys.openrouter) providers.push('openrouter');

    return providers;
  }

  hasAnyApiKey(): boolean {
    return this.getAvailableProviders().length > 0;
  }

  hasApiKeyForTier(tier: TaskTierType): boolean {
    const tierConfig = this.config.modelSelection[tier];
    return !!this.config.apiKeys[tierConfig.provider];
  }
}

// Singleton instance for use across the app
let routerInstance: LLMRouter | null = null;

export function getLLMRouter(config?: LLMRouterConfig): LLMRouter {
  if (!routerInstance && config) {
    routerInstance = new LLMRouter(config);
  }
  if (!routerInstance) {
    throw new Error('LLM Router not initialized. Provide config on first call.');
  }
  return routerInstance;
}

export function updateLLMRouter(config: LLMRouterConfig): void {
  if (routerInstance) {
    routerInstance.updateConfig(config);
  } else {
    routerInstance = new LLMRouter(config);
  }
}
