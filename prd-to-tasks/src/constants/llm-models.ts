import type { LLMModel, LLMProvider, TaskTierType } from '@/types/llm';

export const LLM_MODELS: LLMModel[] = [
  // Anthropic Models
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    capabilities: ['code-generation', 'analysis', 'reasoning', 'extraction', 'json-mode'],
    recommendedTier: ['T2', 'T3'],
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    capabilities: ['code-generation', 'analysis', 'reasoning', 'extraction', 'json-mode'],
    recommendedTier: ['T4'],
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
    capabilities: ['code-generation', 'extraction', 'summarization'],
    recommendedTier: ['T1'],
  },

  // Google Models
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    capabilities: ['code-generation', 'analysis', 'reasoning', 'extraction', 'json-mode'],
    recommendedTier: ['T2', 'T3'],
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
    capabilities: ['code-generation', 'extraction', 'summarization'],
    recommendedTier: ['T1', 'T2'],
  },

  // DeepSeek Models
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    contextWindow: 64000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.00014,
    costPer1kOutput: 0.00028,
    capabilities: ['code-generation', 'analysis', 'extraction'],
    recommendedTier: ['T1', 'T2'],
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: 'deepseek',
    contextWindow: 64000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.00014,
    costPer1kOutput: 0.00028,
    capabilities: ['code-generation', 'analysis'],
    recommendedTier: ['T1', 'T2'],
  },

  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    capabilities: ['code-generation', 'analysis', 'reasoning', 'extraction', 'json-mode', 'function-calling'],
    recommendedTier: ['T3', 'T4'],
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    capabilities: ['code-generation', 'extraction', 'summarization', 'json-mode', 'function-calling'],
    recommendedTier: ['T1', 'T2'],
  },
];

export const PROVIDERS: { id: LLMProvider; name: string; apiKeyUrl: string }[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'google',
    name: 'Google AI',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    apiKeyUrl: 'https://openrouter.ai/keys',
  },
];

export const DEFAULT_TIER_MODELS: Record<TaskTierType, { provider: LLMProvider; model: string }> = {
  T1: { provider: 'deepseek', model: 'deepseek-chat' },
  T2: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  T3: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  T4: { provider: 'anthropic', model: 'claude-3-opus-20240229' },
  prdAnalysis: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  entityExtraction: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
};

export const TIER_DESCRIPTIONS: Record<TaskTierType, { name: string; description: string; useCases: string[] }> = {
  T1: {
    name: 'Tier 1 - Simple Tasks',
    description: 'Fast, cost-effective models for straightforward tasks',
    useCases: [
      'Simple CRUD operations',
      'Basic validation rules',
      'Boilerplate code generation',
      'Data extraction',
    ],
  },
  T2: {
    name: 'Tier 2 - Standard Tasks',
    description: 'Balanced models for typical development tasks',
    useCases: [
      'API endpoint implementation',
      'Form components with validation',
      'Business rule implementation',
      'Unit test generation',
    ],
  },
  T3: {
    name: 'Tier 3 - Complex Tasks',
    description: 'Powerful models for complex logic and reasoning',
    useCases: [
      'Complex business logic',
      'Workflow state machines',
      'Data migration scripts',
      'Integration code',
    ],
  },
  T4: {
    name: 'Tier 4 - Architecture Tasks',
    description: 'Most capable models for design and architecture',
    useCases: [
      'System architecture design',
      'Database schema design',
      'API design decisions',
      'Technical specifications',
    ],
  },
  prdAnalysis: {
    name: 'PRD Analysis',
    description: 'Parsing and analyzing Product Requirements Documents',
    useCases: [
      'PRD completeness evaluation',
      'Requirements extraction',
      'Business rules identification',
      'Workflow detection',
    ],
  },
  entityExtraction: {
    name: 'Entity Extraction',
    description: 'Extracting data models from requirements',
    useCases: [
      'Entity identification',
      'Field extraction',
      'Relationship detection',
      'Data type inference',
    ],
  },
};

export function getModelsByProvider(provider: LLMProvider): LLMModel[] {
  return LLM_MODELS.filter(m => m.provider === provider);
}

export function getModelById(modelId: string): LLMModel | undefined {
  return LLM_MODELS.find(m => m.id === modelId);
}

export function getRecommendedModelsForTier(tier: TaskTierType): LLMModel[] {
  return LLM_MODELS.filter(m => m.recommendedTier.includes(tier));
}
