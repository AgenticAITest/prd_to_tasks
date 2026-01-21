import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, ExternalLink, Check, X, Loader2, RefreshCw } from 'lucide-react';
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

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settingsTab, setSettingsTab, setTheme, theme } = useUIStore();
  const {
    apiKeys,
    modelSelection,
    setApiKey,
    setModelForTier,
    appearance,
    updateAppearance,
  } = useSettingsStore();

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<Record<string, 'valid' | 'invalid' | null>>({});
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingOpenRouter, setIsLoadingOpenRouter] = useState(false);

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

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure API keys, model selection, and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={settingsTab}
          onValueChange={setSettingsTab}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="standards">Standards</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
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
                              <SelectItem value="" disabled>
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
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
