import { useRef } from 'react';
import { Plus, Trash2, Database, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useEntityStore } from '@/store/entityStore';
import { useProjectStore } from '@/store/projectStore';
import { usePRDStore } from '@/store/prdStore';
import { useSettingsStore } from '@/store/settingsStore';
import { extractEntitiesWithAI } from '@/core/entity-extractor/ai-extractor';
import { updateLLMRouter } from '@/core/llm/LLMRouter';
import { EntityExtractionReviewPanel } from './EntityExtractionReviewPanel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EntityType, DataType } from '@/types/entity';

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'master', label: 'Master' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'reference', label: 'Reference' },
  { value: 'lookup', label: 'Lookup' },
  { value: 'junction', label: 'Junction' },
];

const DATA_TYPES: { value: DataType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'text', label: 'Text' },
  { value: 'integer', label: 'Integer' },
  { value: 'bigint', label: 'Big Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'uuid', label: 'UUID' },
  { value: 'json', label: 'JSON' },
  { value: 'enum', label: 'Enum' },
];

export function EntityExtractionPhase() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const {
    entities,
    selectedEntityId,
    selectEntity,
    addEntity,
    updateEntity,
    removeEntity,
    addField,
    updateField,
    removeField,
    getSelectedEntity,
    // AI extraction state
    extractionMode,
    isExtracting,
    extractionProgress,
    pendingEntities,
    pendingRelationships,
    pendingSuggestions,
    setExtracting,
    setExtractionMode,
    setPendingExtraction,
    confirmExtraction,
    discardExtraction,
    setError,
  } = useEntityStore();
  const { setPhaseStatus, advancePhase } = useProjectStore();
  const { prd, rawContent } = usePRDStore();
  const { apiKeys, modelSelection } = useSettingsStore();

  const selectedEntity = getSelectedEntity();
  const hasApiKey = Object.values(apiKeys).some((key) => key && key.length > 0);
  const hasEntities = entities.length > 0;

  const handleCancelExtraction = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setExtracting(false, 0);
      setExtractionMode('idle');
      toast.info('Entity extraction cancelled');
    }
  };

  const handleAIExtraction = async () => {
    if (!prd) {
      toast.error('No PRD analyzed. Please complete Phase 1 first.');
      return;
    }

    if (!hasApiKey) {
      toast.error('No API key configured. Please add an API key in Settings.');
      return;
    }

    // Create new AbortController for this operation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Initialize LLM router with current settings
      updateLLMRouter({ apiKeys, modelSelection });

      setExtracting(true, 0);
      setExtractionMode('extracting');

      // Call AI extraction with progress updates and abort signal
      const result = await extractEntitiesWithAI(
        rawContent || '',
        prd,
        (progress) => {
          setExtracting(true, progress);
        },
        signal
      );

      // Store results for review
      setPendingExtraction(result.entities, result.relationships, result.suggestions);

      if (result.entities.length > 0) {
        toast.success(`Extracted ${result.entities.length} entities. Please review.`);
      } else {
        toast.warning('No entities were extracted. Try adding entities manually.');
        setExtractionMode('idle');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Don't show error for user-initiated cancellation
      if (message.includes('cancelled') || message.includes('aborted')) {
        return;
      }

      setError(message);
      setExtractionMode('idle');

      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        toast.error('Entity extraction failed: Network error', {
          description: 'This may be a CORS issue. Try using Google Gemini API key.',
          duration: 8000,
        });
      } else if (message.includes('401') || message.includes('403')) {
        toast.error('Entity extraction failed: Invalid API key', {
          description: 'Please check your API key in Settings.',
          duration: 5000,
        });
      } else {
        toast.error(`Entity extraction failed: ${message}`);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleAcceptExtraction = () => {
    confirmExtraction();
    toast.success('Entities confirmed! You can now edit them or proceed to ERD.');
  };

  const handleDiscardExtraction = () => {
    discardExtraction();
    toast.info('AI extraction discarded.');
  };

  const handleAddEntity = () => {
    addEntity({
      name: 'NewEntity',
      displayName: 'New Entity',
      tableName: 'new_entity',
      description: '',
      type: 'master',
      fields: [],
      isAuditable: true,
      isSoftDelete: true,
      source: { type: 'manual' },
      confidence: 1,
    });
  };

  const handleAddField = () => {
    if (!selectedEntityId) return;
    addField(selectedEntityId, {
      name: 'newField',
      columnName: 'new_field',
      displayName: 'New Field',
      dataType: 'string',
      constraints: {
        primaryKey: false,
        unique: false,
        nullable: true,
        indexed: false,
      },
      source: { type: 'manual' },
      confidence: 1,
    });
  };

  const handleProceed = () => {
    if (entities.length > 0) {
      setPhaseStatus(2, 'completed');
      advancePhase();
    }
  };

  // Show review panel when in reviewing mode
  if (extractionMode === 'reviewing') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Entity Extraction</h2>
            <p className="text-sm text-muted-foreground">
              Review AI-extracted entities before confirming
            </p>
          </div>
        </div>

        <EntityExtractionReviewPanel
          entities={pendingEntities}
          relationships={pendingRelationships}
          suggestions={pendingSuggestions}
          onAccept={handleAcceptExtraction}
          onDiscard={handleDiscardExtraction}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Entity Extraction</h2>
          <p className="text-sm text-muted-foreground">
            Define entities, fields, and relationships
          </p>
        </div>
        <div className="flex gap-2">
          {!hasEntities && (
            <Button
              onClick={handleAIExtraction}
              disabled={!prd || isExtracting || !hasApiKey}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isExtracting ? 'Extracting...' : 'Extract with AI'}
            </Button>
          )}
          {hasEntities && (
            <Button
              onClick={handleAIExtraction}
              disabled={!prd || isExtracting || !hasApiKey}
              variant="outline"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isExtracting ? 'Extracting...' : 'Re-extract with AI'}
            </Button>
          )}
          <Button onClick={handleAddEntity} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Entity
          </Button>
          <Button onClick={handleProceed} disabled={entities.length === 0}>
            Proceed to ERD
          </Button>
        </div>
      </div>

      {/* Progress indicator */}
      {isExtracting && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Extracting entities with AI...</span>
                <div className="flex items-center gap-2">
                  <span>{extractionProgress}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelExtraction}
                    className="h-7 px-3 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
              <Progress
                value={extractionProgress}
                className="bg-purple-100 [&>div]:bg-purple-600"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state - Show when no entities and not extracting */}
      {!hasEntities && !isExtracting && extractionMode === 'idle' && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Entities Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Extract entities from your PRD using AI, or add them manually.
              {!hasApiKey && (
                <span className="block mt-2 text-amber-600">
                  Configure an API key in Settings to use AI extraction.
                </span>
              )}
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={handleAIExtraction}
                disabled={!prd || !hasApiKey}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Extract with AI
              </Button>
              <Button onClick={handleAddEntity} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content - Show when has entities or confirmed */}
      {(hasEntities || extractionMode === 'confirmed') && (
        <div className="grid grid-cols-3 gap-4">
          {/* Entity List */}
          <Card className="col-span-1">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Entities ({entities.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="p-2 space-y-1">
                  {entities.map((entity) => (
                    <div
                      key={entity.id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
                        selectedEntityId === entity.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      )}
                      onClick={() => selectEntity(entity.id)}
                    >
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {entity.displayName}
                          {entity.source.type === 'ai-extracted' && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 h-4 px-1">
                              AI
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entity.fields.length} fields
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {entity.type}
                      </Badge>
                    </div>
                  ))}
                  {entities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No entities defined yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Entity Detail */}
          <Card className="col-span-2">
            {selectedEntity ? (
              <>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {selectedEntity.displayName}
                      {selectedEntity.source.type === 'ai-extracted' && (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                          AI Extracted
                        </Badge>
                      )}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        removeEntity(selectedEntity.id);
                        selectEntity(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Entity Properties */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input
                        value={selectedEntity.displayName}
                        onChange={(e) =>
                          updateEntity(selectedEntity.id, { displayName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Table Name</Label>
                      <Input
                        value={selectedEntity.tableName}
                        onChange={(e) =>
                          updateEntity(selectedEntity.id, { tableName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={selectedEntity.type}
                        onValueChange={(value) =>
                          updateEntity(selectedEntity.id, { type: value as EntityType })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTITY_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Fields */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Fields</Label>
                      <Button size="sm" variant="outline" onClick={handleAddField}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Field
                      </Button>
                    </div>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {selectedEntity.fields.map((field) => (
                          <div
                            key={field.id}
                            className="flex items-center gap-2 p-2 border rounded-md"
                          >
                            <Input
                              className="flex-1"
                              value={field.displayName}
                              placeholder="Field name"
                              onChange={(e) =>
                                updateField(selectedEntity.id, field.id, {
                                  displayName: e.target.value,
                                })
                              }
                            />
                            <Select
                              value={field.dataType}
                              onValueChange={(value) =>
                                updateField(selectedEntity.id, field.id, {
                                  dataType: value as DataType,
                                })
                              }
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DATA_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {field.source.type === 'ai-extracted' && (
                              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 shrink-0">
                                AI
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive shrink-0"
                              onClick={() => removeField(selectedEntity.id, field.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {selectedEntity.fields.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No fields defined
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-16 text-center">
                <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select an entity to view and edit its details
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
