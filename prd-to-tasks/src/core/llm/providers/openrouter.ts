import type { LLMResponse, LLMUsage } from '@/types/llm';

/**
 * OpenRouter API Provider
 *
 * OpenRouter supports CORS for browser-based requests, making it ideal
 * for client-side LLM calls. It provides access to multiple models
 * including Claude, GPT-4, Gemini, and more.
 *
 * API Docs: https://openrouter.ai/docs
 */
export async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096
): Promise<LLMResponse> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin, // Required by OpenRouter
      'X-Title': 'PRD-to-Tasks', // Optional: shows in OpenRouter dashboard
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    let errorMessage = `OpenRouter API error: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error?.message || errorMessage;
    } catch {
      // If we can't parse the error, use the status
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response generated from OpenRouter');
  }

  const usage: LLMUsage = {
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0,
    estimatedCost: data.usage?.total_cost || calculateCost(model, data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0),
  };

  return {
    content: data.choices[0].message.content,
    usage,
    model: data.model || model,
    finishReason: mapFinishReason(data.choices[0].finish_reason),
  };
}

function mapFinishReason(reason: string): LLMResponse['finishReason'] {
  switch (reason) {
    case 'stop':
    case 'end_turn':
      return 'stop';
    case 'length':
    case 'max_tokens':
      return 'length';
    case 'content_filter':
      return 'content_filter';
    default:
      return 'stop';
  }
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  // OpenRouter provides cost in the response, but fallback pricing for common models
  const costs: Record<string, { input: number; output: number }> = {
    'anthropic/claude-3.5-sonnet': { input: 0.003, output: 0.015 },
    'anthropic/claude-3-sonnet': { input: 0.003, output: 0.015 },
    'anthropic/claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'openai/gpt-4o': { input: 0.005, output: 0.015 },
    'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'google/gemini-pro-1.5': { input: 0.00125, output: 0.005 },
    'google/gemini-flash-1.5': { input: 0.000075, output: 0.0003 },
    'deepseek/deepseek-chat': { input: 0.00014, output: 0.00028 },
  };

  // Try to find a matching model
  const modelKey = Object.keys(costs).find(key => model.includes(key) || key.includes(model));
  const cost = modelKey ? costs[modelKey] : { input: 0.001, output: 0.002 }; // Default fallback

  return (inputTokens / 1000) * cost.input + (outputTokens / 1000) * cost.output;
}

export async function testOpenRouterKey(apiKey: string): Promise<boolean> {
  try {
    // Use a cheap model for testing
    await callOpenRouter(apiKey, 'openai/gpt-4o-mini', 'Test', 'Say "ok"', 10);
    return true;
  } catch {
    return false;
  }
}
