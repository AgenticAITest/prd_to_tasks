import type { LLMResponse, LLMUsage } from '@/types/llm';

export async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096
): Promise<LLMResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();

  const usage: LLMUsage = {
    promptTokens: data.usage.input_tokens,
    completionTokens: data.usage.output_tokens,
    totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    estimatedCost: calculateCost(model, data.usage.input_tokens, data.usage.output_tokens),
  };

  return {
    content: data.content[0].text,
    usage,
    model: data.model,
    finishReason: mapFinishReason(data.stop_reason),
  };
}

function mapFinishReason(reason: string): LLMResponse['finishReason'] {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    default:
      return 'stop';
  }
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs: Record<string, { input: number; output: number }> = {
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  };

  const cost = costs[model] || costs['claude-3-5-sonnet-20241022'];
  return (inputTokens / 1000) * cost.input + (outputTokens / 1000) * cost.output;
}

export async function testAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    await callAnthropic(apiKey, 'claude-3-haiku-20240307', 'Test', 'Say "ok"', 10);
    return true;
  } catch {
    return false;
  }
}
