// LLM (Large Language Model) Types

export type LLMProvider =
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'openai'
  | 'openrouter'

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  capabilities: LLMCapability[];
  recommendedTier: TaskTierType[];
}

export type LLMCapability =
  | 'code-generation'
  | 'analysis'
  | 'reasoning'
  | 'extraction'
  | 'summarization'
  | 'json-mode'
  | 'function-calling'

export type TaskTierType = 'T1' | 'T2' | 'T3' | 'T4' | 'prdAnalysis' | 'entityExtraction'

export interface LLMTierConfig {
  tier: TaskTierType;
  description: string;
  provider: LLMProvider;
  model: string;
  useCases: string[];
}

// API Request/Response types
export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  jsonSchema?: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  model: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

// Provider-specific types
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
  temperature?: number;
  top_p?: number;
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: { type: 'text'; text: string }[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface GoogleMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GoogleRequest {
  contents: GoogleMessage[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    responseMimeType?: string;
  };
}

export interface GoogleResponse {
  candidates: {
    content: { role: string; parts: { text: string }[] };
    finishReason: string;
  }[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  response_format?: { type: 'text' | 'json_object' };
}

export interface OpenAIResponse {
  id: string;
  object: string;
  model: string;
  choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Error types
export interface LLMError {
  provider: LLMProvider;
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

// Streaming types (for future use)
export interface LLMStreamChunk {
  content: string;
  done: boolean;
  usage?: LLMUsage;
}
