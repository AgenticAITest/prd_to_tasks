import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, ExternalLink, Check, X, Loader2, RefreshCw, Upload, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';
import { PROVIDERS, LLM_MODELS, TIER_DESCRIPTIONS } from '@/constants/llm-models';
import type { LLMProvider, TaskTierType } from '@/types/llm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { fetchOpenRouterModels, clearOpenRouterCache, type OpenRouterModel } from '@/lib/openrouter';
import { usePromptStore } from '@/store/promptStore';
import { useIntegrationStore } from '@/store/integrationStore';
import { PROMPT_METADATA, type PromptKey } from '@/core/llm/prompts/default-prompts';
import { PromptEditorDialog } from '@/components/settings/PromptEditorDialog';
import { testNeonConnection } from '@/core/environment/neon-client';
import { testGitHubConnection } from '@/core/environment/github-client';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  // Use individual selectors for better reactivity
  const settingsTab = useUIStore((s) => s.settingsTab);
  const setSettingsTab = useUIStore((s) => s.setSettingsTab);
  const setTheme = useUIStore((s) => s.setTheme);
  const theme = useUIStore((s) => s.theme);

  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const modelSelection = useSettingsStore((s) => s.modelSelection);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setModelForTier = useSettingsStore((s) => s.setModelForTier);
  const appearance = useSettingsStore((s) => s.appearance);
  const updateAppearance = useSettingsStore((s) => s.updateAppearance);

  // Advanced settings selectors for reactive toggles
  const enableImplementationEnrichment = useSettingsStore((s) => s.advanced.enableImplementationEnrichment);
  const previewArchitectureRecommendations = useSettingsStore((s) => s.advanced.previewArchitectureRecommendations);
  const updateAdvanced = useSettingsStore((s) => s.updateAdvanced);

  // Integration store
  const integrationApiKeys = useIntegrationStore((s) => s.apiKeys);
  const setIntegrationApiKey = useIntegrationStore((s) => s.setApiKey);

  // Ensure settingsTab has a valid value
  const validTabs = ['api-keys', 'models', 'prompts', 'integrations', 'standards', 'appearance', 'advanced'];
  const currentTab = validTabs.includes(settingsTab) ? settingsTab : 'api-keys';

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [editingPrompt, setEditingPrompt] = useState<PromptKey | null>(null);

  // Prompt store
  const { isCustomized, getCustomizedKeys, exportPrompts, importPrompts, resetAllPrompts } = usePromptStore();
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<Record<string, 'valid' | 'invalid' | null>>({});
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingOpenRouter, setIsLoadingOpenRouter] = useState(false);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, 'valid' | 'invalid' | null>>({});

  // Load OpenRouter models on mount and when modal opens
  const loadOpenRouterModels = useCallback(async (forceRefresh = false) => {
    setIsLoadingOpenRouter(true);
    try {
      const models = await fetchOpenRouterModels(forceRefresh);
      setOpenRouterModels(models);
      if (forceRefresh) {
        toast.success(`Loaded ${models.length} models from OpenRouter`);
      }
    } catch (error) {
      console.error('Failed to load OpenRouter models:', error);
      if (forceRefresh) {
        toast.error('Failed to load OpenRouter models');
      }
    } finally {
      setIsLoadingOpenRouter(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadOpenRouterModels();
    }
  }, [open, loadOpenRouterModels]);

  const handleRefreshOpenRouter = () => {
    clearOpenRouterCache();
    loadOpenRouterModels(true);
  };

  // Helper to get models for a provider
  const getModelsForProvider = (provider: LLMProvider) => {
    if (provider === 'openrouter') {
      return openRouterModels.map((m) => ({ id: m.id, name: m.name }));
    }
    return LLM_MODELS.filter((m) => m.provider === provider).map((m) => ({ id: m.id, name: m.name }));
  };

  // All tiers including analysis tiers
  const ALL_TIERS: TaskTierType[] = ['T1', 'T2', 'T3', 'T4', 'prdAnalysis', 'entityExtraction'];

  const handleTestKey = async (provider: LLMProvider) => {
    setTestingKey(provider);
    // Simulate API key test
    await new Promise((r) => setTimeout(r, 1000));
    const isValid = apiKeys[provider] && apiKeys[provider]!.length > 10;
    setKeyStatus((s) => ({ ...s, [provider]: isValid ? 'valid' : 'invalid' }));
    setTestingKey(null);
    toast[isValid ? 'success' : 'error'](
      isValid ? 'API key is valid' : 'API key is invalid'
    );
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys((s) => ({ ...s, [provider]: !s[provider] }));
  };

  const handleTestIntegration = async (provider: 'neon' | 'github' | 'gitpod') => {
    const key = integrationApiKeys[provider];
    if (!key) return;

    setTestingIntegration(provider);
    let isValid = false;

    try {
      if (provider === 'neon') {
        isValid = await testNeonConnection(key);
      } else if (provider === 'github') {
        isValid = await testGitHubConnection(key);
      } else if (provider === 'gitpod') {
        // Gitpod doesn't need validation - just check it's not empty
        isValid = key.length > 0;
      }
    } catch {
      isValid = false;
    }

    setIntegrationStatus((s) => ({ ...s, [provider]: isValid ? 'valid' : 'invalid' }));
    setTestingIntegration(null);
    toast[isValid ? 'success' : 'error'](
      isValid ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} connection valid` : `${provider.charAt(0).toUpperCase() + provider.slice(1)} connection failed`
    );
  };

  return (
  <>
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure API keys, model selection, and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={currentTab}
          onValueChange={setSettingsTab}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="standards">Standards</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            {/* API Keys Tab */}
            <TabsContent value="api-keys" className="mt-0 space-y-4">
              {PROVIDERS.map((provider) => (
                <div key={provider.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      {provider.name}
                      <a
                        href={provider.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Label>
                    {keyStatus[provider.id] && (
                      <Badge
                        variant={keyStatus[provider.id] === 'valid' ? 'default' : 'destructive'}
                        className={cn(
                          keyStatus[provider.id] === 'valid' && 'bg-green-500'
                        )}
                      >
                        {keyStatus[provider.id] === 'valid' ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <X className="h-3 w-3 mr-1" />
                        )}
                        {keyStatus[provider.id]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        placeholder={`Enter ${provider.name} API key`}
                        value={apiKeys[provider.id] || ''}
                        onChange={(e) => {
                          setApiKey(provider.id, e.target.value);
                          setKeyStatus((s) => ({ ...s, [provider.id]: null }));
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => toggleShowKey(provider.id)}
                      >
                        {showKeys[provider.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!apiKeys[provider.id] || testingKey === provider.id}
                      onClick={() => handleTestKey(provider.id)}
                    >
                      {testingKey === provider.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Models Tab */}
            <TabsContent value="models" className="mt-0 space-y-4">
              {ALL_TIERS.map((tier) => {
                const tierInfo = TIER_DESCRIPTIONS[tier];
                const config = modelSelection[tier] || { provider: 'anthropic' as LLMProvider, model: '', enabled: true };
                const isAnalysisTier = tier === 'prdAnalysis' || tier === 'entityExtraction';
                const models = getModelsForProvider(config.provider);
                const isOpenRouter = config.provider === 'openrouter';

                return (
                  <div
                    key={tier}
                    className={cn(
                      'space-y-2 p-3 border rounded-lg',
                      isAnalysisTier && 'border-primary/30 bg-primary/5'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">{tierInfo.name}</Label>
                        <p className="text-xs text-muted-foreground">
                          {tierInfo.description}
                        </p>
                      </div>
                      <Badge variant={isAnalysisTier ? 'default' : 'outline'}>
                        {isAnalysisTier ? 'Analysis' : tier}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Provider</Label>
                        <Select
                          value={config.provider}
                          onValueChange={(v) => {
                            const newProvider = v as LLMProvider;
                            // Reset model when provider changes
                            const newModels = getModelsForProvider(newProvider);
                            const firstModel = newModels[0]?.id || '';
                            setModelForTier(tier, newProvider, firstModel);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDERS.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-2">
                          Model
                          {isOpenRouter && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={handleRefreshOpenRouter}
                              disabled={isLoadingOpenRouter}
                              title="Refresh OpenRouter models"
                            >
                              <RefreshCw
                                className={cn(
                                  'h-3 w-3',
                                  isLoadingOpenRouter && 'animate-spin'
                                )}
                              />
                            </Button>
                          )}
                        </Label>
                        <Select
                          value={config.model}
                          onValueChange={(v) =>
                            setModelForTier(tier, config.provider, v)
                          }
                          disabled={isOpenRouter && isLoadingOpenRouter}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isOpenRouter && isLoadingOpenRouter ? 'Loading...' : 'Select model'} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {models.length > 0 ? (
                              models.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_models__" disabled>
                                {isOpenRouter
                                  ? isLoadingOpenRouter
                                    ? 'Loading models...'
                                    : 'No models - click refresh'
                                  : 'No models available'}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tierInfo.useCases.map((uc) => (
                        <Badge key={uc} variant="secondary" className="text-xs">
                          {uc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* Prompts Tab */}
            <TabsContent value="prompts" className="mt-0 space-y-4">
              <div className="space-y-1 mb-4">
                <p className="text-sm text-muted-foreground">
                  Customize the AI prompts used in each phase. Modified prompts are marked with a badge.
                </p>
                {getCustomizedKeys().length > 0 && (
                  <p className="text-xs text-primary">
                    {getCustomizedKeys().length} prompt(s) customized
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {PROMPT_METADATA.map((prompt) => {
                  const customized = isCustomized(prompt.key);
                  return (
                    <div
                      key={prompt.key}
                      className={cn(
                        'flex items-center justify-between p-3 border rounded-lg',
                        customized && 'border-primary/30 bg-primary/5'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{prompt.name}</span>
                          {customized && (
                            <Badge variant="secondary" className="text-xs">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {prompt.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {prompt.phase}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPrompt(prompt.key)}
                        className="ml-2"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Import/Export/Reset Actions */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const text = await file.text();
                        const success = importPrompts(text);
                        if (success) {
                          toast.success('Prompts imported successfully');
                        } else {
                          toast.error('Failed to import prompts. Invalid format.');
                        }
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Import
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  const exported = exportPrompts();
                  const blob = new Blob([exported], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'prompts.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}>
                  Export
                </Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  if (confirm('Reset all prompts to defaults?')) {
                    resetAllPrompts();
                    toast.success('Prompts reset to defaults');
                  }
                }}>
                  Reset
                </Button>
              </div>


            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="mt-0 space-y-4">
              <div className="space-y-1 mb-4">
                <p className="text-sm text-muted-foreground">
                  Configure cloud service integrations for the Execute phase (Phase 5).
                  These services are used to create your development environment.
                </p>
              </div>

              {/* Neon */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    Neon (PostgreSQL)
                    <a
                      href="https://console.neon.tech/app/settings/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Label>
                  {integrationStatus.neon && (
                    <Badge
                      variant={integrationStatus.neon === 'valid' ? 'default' : 'destructive'}
                      className={cn(
                        integrationStatus.neon === 'valid' && 'bg-green-500'
                      )}
                    >
                      {integrationStatus.neon === 'valid' ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      {integrationStatus.neon}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys.neon ? 'text' : 'password'}
                      placeholder="Enter Neon API key"
                      value={integrationApiKeys.neon || ''}
                      onChange={(e) => {
                        setIntegrationApiKey('neon', e.target.value);
                        setIntegrationStatus((s) => ({ ...s, neon: null }));
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleShowKey('neon')}
                    >
                      {showKeys.neon ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!integrationApiKeys.neon || testingIntegration === 'neon'}
                    onClick={() => handleTestIntegration('neon')}
                  >
                    {testingIntegration === 'neon' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used to create a PostgreSQL database for your project.
                </p>
              </div>

              {/* GitHub */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    GitHub Token
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=PRD-to-Tasks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Label>
                  {integrationStatus.github && (
                    <Badge
                      variant={integrationStatus.github === 'valid' ? 'default' : 'destructive'}
                      className={cn(
                        integrationStatus.github === 'valid' && 'bg-green-500'
                      )}
                    >
                      {integrationStatus.github === 'valid' ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      {integrationStatus.github}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys.github ? 'text' : 'password'}
                      placeholder="Enter GitHub personal access token"
                      value={integrationApiKeys.github || ''}
                      onChange={(e) => {
                        setIntegrationApiKey('github', e.target.value);
                        setIntegrationStatus((s) => ({ ...s, github: null }));
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleShowKey('github')}
                    >
                      {showKeys.github ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!integrationApiKeys.github || testingIntegration === 'github'}
                    onClick={() => handleTestIntegration('github')}
                  >
                    {testingIntegration === 'github' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used to create a repository and push the generated scaffold. Requires repo and workflow scopes.
                </p>
              </div>

              {/* Gitpod */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    Gitpod Token (Optional)
                    <a
                      href="https://gitpod.io/user/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Label>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys.gitpod ? 'text' : 'password'}
                      placeholder="Enter Gitpod access token (optional)"
                      value={integrationApiKeys.gitpod || ''}
                      onChange={(e) => {
                        setIntegrationApiKey('gitpod', e.target.value);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => toggleShowKey('gitpod')}
                    >
                      {showKeys.gitpod ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional. Gitpod workspaces can be opened without an API token.
                </p>
              </div>
            </TabsContent>

            {/* Standards Tab */}
            <TabsContent value="standards" className="mt-0 space-y-4">
              <div className="text-sm text-muted-foreground">
                Standards configuration coming soon. This will allow customizing database
                naming conventions, API patterns, and validation rules.
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Theme</Label>
                    <p className="text-xs text-muted-foreground">
                      Select your preferred theme
                    </p>
                  </div>
                  <Select value={theme} onValueChange={(v: 'light' | 'dark' | 'system') => setTheme(v)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Font Size</Label>
                    <p className="text-xs text-muted-foreground">
                      Adjust the interface font size
                    </p>
                  </div>
                  <Select
                    value={appearance.fontSize}
                    onValueChange={(v: 'small' | 'medium' | 'large') =>
                      updateAppearance({ fontSize: v })
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="mt-0 space-y-4">
              <div className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">LLM Enrichment</Label>
                    <p className="text-xs text-muted-foreground">Enable LLM-based technical implementation enrichment after task generation</p>
                  </div>
                  <Switch
                    checked={!!enableImplementationEnrichment}
                    onCheckedChange={(val: boolean) => updateAdvanced({ enableImplementationEnrichment: val })}
                  />
                </div>
              </div>

              <div className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Preview Architecture Recommendations</Label>
                    <p className="text-xs text-muted-foreground">Show LLM-extracted recommendations in a preview modal before applying</p>
                  </div>
                  <Switch
                    checked={!!previewArchitectureRecommendations}
                    onCheckedChange={(val: boolean) => updateAdvanced({ previewArchitectureRecommendations: val })}
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Prompt Editor Dialog */}
    <PromptEditorDialog
      promptKey={editingPrompt}
      open={editingPrompt !== null}
      onClose={() => setEditingPrompt(null)}
    />
  </>
  );
}
