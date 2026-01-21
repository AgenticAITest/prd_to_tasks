import { useState, useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { LLMRouter } from '@/core/llm/LLMRouter';
import type { TaskTierType } from '@/types/llm';

export interface UseLLMOptions {
  onStart?: () => void;
  onSuccess?: (response: string) => void;
  onError?: (error: Error) => void;
  onFinish?: () => void;
}

export interface LLMCallResult {
  success: boolean;
  response?: string;
  error?: string;
}

export function useLLM(options: UseLLMOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const settings = useSettingsStore();

  const call = useCallback(
    async (
      tier: TaskTierType,
      systemPrompt: string,
      userPrompt: string
    ): Promise<LLMCallResult> => {
      setIsLoading(true);
      setError(null);
      options.onStart?.();

      try {
        const router = new LLMRouter({
          apiKeys: settings.apiKeys,
          modelSelection: settings.modelSelection,
        });
        const llmResponse = await router.call(tier, systemPrompt, userPrompt);
        const responseContent = llmResponse.content;

        setLastResponse(responseContent);
        options.onSuccess?.(responseContent);

        return { success: true, response: responseContent };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        options.onError?.(err instanceof Error ? err : new Error(errorMessage));

        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
        options.onFinish?.();
      }
    },
    [settings, options]
  );

  const callWithRetry = useCallback(
    async (
      tier: TaskTierType,
      systemPrompt: string,
      userPrompt: string,
      maxRetries: number = 3
    ): Promise<LLMCallResult> => {
      let lastError: string | undefined;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const result = await call(tier, systemPrompt, userPrompt);

        if (result.success) {
          return result;
        }

        lastError = result.error;

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }

      return { success: false, error: lastError || 'Max retries exceeded' };
    },
    [call]
  );

  const parseJSONResponse = useCallback(
    async <T>(
      tier: TaskTierType,
      systemPrompt: string,
      userPrompt: string
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      const result = await call(tier, systemPrompt, userPrompt);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      try {
        // Try to extract JSON from the response
        const jsonMatch = result.response?.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (!jsonMatch) {
          return { success: false, error: 'No JSON found in response' };
        }

        const data = JSON.parse(jsonMatch[0]) as T;
        return { success: true, data };
      } catch (err) {
        return {
          success: false,
          error: `Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`,
        };
      }
    },
    [call]
  );

  const hasValidConfiguration = useCallback(() => {
    return settings.hasValidApiKey();
  }, [settings]);

  const getConfiguredProviders = useCallback(() => {
    const providers: string[] = [];
    if (settings.apiKeys.anthropic) providers.push('anthropic');
    if (settings.apiKeys.google) providers.push('google');
    if (settings.apiKeys.deepseek) providers.push('deepseek');
    if (settings.apiKeys.openai) providers.push('openai');
    if (settings.apiKeys.openrouter) providers.push('openrouter');
    return providers;
  }, [settings]);

  const getModelForTier = useCallback(
    (tier: TaskTierType) => {
      return settings.modelSelection[tier];
    },
    [settings]
  );

  return {
    // State
    isLoading,
    error,
    lastResponse,

    // Actions
    call,
    callWithRetry,
    parseJSONResponse,

    // Utils
    hasValidConfiguration,
    getConfiguredProviders,
    getModelForTier,
    clearError: () => setError(null),
  };
}

// Hook for batch LLM calls with progress tracking
export function useLLMBatch() {
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<LLMCallResult[]>([]);

  const llm = useLLM();

  const runBatch = useCallback(
    async (
      calls: Array<{
        tier: TaskTierType;
        systemPrompt: string;
        userPrompt: string;
      }>
    ): Promise<LLMCallResult[]> => {
      setIsRunning(true);
      setProgress({ current: 0, total: calls.length });
      setResults([]);

      const batchResults: LLMCallResult[] = [];

      for (let i = 0; i < calls.length; i++) {
        const { tier, systemPrompt, userPrompt } = calls[i];
        const result = await llm.call(tier, systemPrompt, userPrompt);
        batchResults.push(result);
        setResults([...batchResults]);
        setProgress({ current: i + 1, total: calls.length });
      }

      setIsRunning(false);
      return batchResults;
    },
    [llm]
  );

  const cancel = useCallback(() => {
    setIsRunning(false);
  }, []);

  return {
    progress,
    isRunning,
    results,
    runBatch,
    cancel,
  };
}
