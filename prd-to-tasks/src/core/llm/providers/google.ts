import type { LLMResponse, LLMUsage } from '@/types/llm';

export async function callGoogle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4096,
  signal?: AbortSignal
): Promise<LLMResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Google AI API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response generated from Google AI');
  }

  const candidate = data.candidates[0];
  const content = candidate.content.parts.map((p: { text: string }) => p.text).join('');

  const usage: LLMUsage = {
    promptTokens: data.usageMetadata?.promptTokenCount || 0,
    completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
    totalTokens: data.usageMetadata?.totalTokenCount || 0,
    estimatedCost: calculateCost(
      model,
      data.usageMetadata?.promptTokenCount || 0,
      data.usageMetadata?.candidatesTokenCount || 0
    ),
  };

  return {
    content,
    usage,
    model,
    finishReason: mapFinishReason(candidate.finishReason),
  };
}

function mapFinishReason(reason: string): LLMResponse['finishReason'] {
  switch (reason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
      return 'content_filter';
    default:
      return 'stop';
  }
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs: Record<string, { input: number; output: number }> = {
    'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  };

  const cost = costs[model] || costs['gemini-1.5-flash'];
  return (inputTokens / 1000) * cost.input + (outputTokens / 1000) * cost.output;
}

export async function testGoogleKey(apiKey: string): Promise<boolean> {
  try {
    await callGoogle(apiKey, 'gemini-1.5-flash', 'Test', 'Say "ok"', 10);
    return true;
  } catch {
    return false;
  }
}
