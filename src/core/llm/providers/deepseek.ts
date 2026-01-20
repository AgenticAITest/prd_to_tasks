import type { LLMResponse, LLMUsage } from '@/types/llm';

export async function callDeepSeek(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096
): Promise<LLMResponse> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
    const error = await response.json();
    throw new Error(error.error?.message || `DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();

  const usage: LLMUsage = {
    promptTokens: data.usage.prompt_tokens,
    completionTokens: data.usage.completion_tokens,
    totalTokens: data.usage.total_tokens,
    estimatedCost: calculateCost(model, data.usage.prompt_tokens, data.usage.completion_tokens),
  };

  return {
    content: data.choices[0].message.content,
    usage,
    model: data.model,
    finishReason: mapFinishReason(data.choices[0].finish_reason),
  };
}

function mapFinishReason(reason: string): LLMResponse['finishReason'] {
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'content_filter':
      return 'content_filter';
    default:
      return 'stop';
  }
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs: Record<string, { input: number; output: number }> = {
    'deepseek-chat': { input: 0.00014, output: 0.00028 },
    'deepseek-coder': { input: 0.00014, output: 0.00028 },
  };

  const cost = costs[model] || costs['deepseek-chat'];
  return (inputTokens / 1000) * cost.input + (outputTokens / 1000) * cost.output;
}

export async function testDeepSeekKey(apiKey: string): Promise<boolean> {
  try {
    await callDeepSeek(apiKey, 'deepseek-chat', 'Test', 'Say "ok"', 10);
    return true;
  } catch {
    return false;
  }
}
