import { useState, useRef } from 'react';
import { Play, Download, Filter, Search, RefreshCw, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTaskStore } from '@/store/taskStore';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { generateTasks, enrichTaskSet } from '@/core/task-generator';
import type { TaskSet } from '@/types/task';
import type { TaskGenerationContext } from '@/core';
import { updateLLMRouter } from '@/core/llm/LLMRouter';
import { useProject } from '@/hooks/useProject';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/settingsStore';
import { usePRDStore } from '@/store/prdStore';
import { useEntityStore } from '@/store/entityStore';
import { useERDStore } from '@/store/erdStore';
import { cn } from '@/lib/utils';
import { generateTaskPrompt } from '@/lib/prompt-generator';
import type { TaskType, TaskTier } from '@/types/task';

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  'database-migration': 'Database',
  'api-crud': 'API CRUD',
  'api-custom': 'API Custom',
  'ui-list': 'UI List',
  'ui-form': 'UI Form',
  'ui-detail': 'UI Detail',
  'ui-modal': 'UI Modal',
  'ui-dashboard': 'Dashboard',
  'ui-report': 'Report',
  'validation': 'Validation',
  'business-logic': 'Business Logic',
  'workflow': 'Workflow',
  'integration': 'Integration',
  'test': 'Test (Manual)',
  'documentation': 'Docs (Manual)',
  // Integration/orchestration task types
  'environment-setup': 'Env Setup',
  'service-layer': 'Service Layer',
  'api-client': 'API Client',
  'e2e-flow': 'E2E (Manual)',
  'test-setup': 'Test Setup',
  // Assembly/composition task types
  'page-composition': 'Page',
  'route-config': 'Routing',
  'navigation': 'Navigation',
};

const TIER_COLORS: Record<TaskTier, string> = {
  T1: 'bg-green-500',
  T2: 'bg-blue-500',
  T3: 'bg-orange-500',
  T4: 'bg-purple-500',
};

export function TaskGenerationPhase() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [promptCopied, setPromptCopied] = useState(false);

  const {
    tasks,
    summary,
    isGenerating,
    generateProgress,
    searchQuery,
    selectedTaskId,
    setSearchQuery,
    selectTask,
    setGenerating,
    setTaskSet,
    getFilteredTasks,
  } = useTaskStore();

  const { saveCurrentProject } = useProject();
  const { setPhaseStatus, addFile, setArchitectureGuide, getArchitectureGuide, getFilesByType, clearArchitectureGuide } = useProjectStore();
  const { openModal } = useUIStore();
  const prdStore = usePRDStore();
  const entityStore = useEntityStore();
  const erdStore = useERDStore();

  // Ref to the hidden architecture file input
  const archInputRef = useRef<HTMLInputElement | null>(null);

  const filteredTasks = getFilteredTasks().filter((task) => {
    if (typeFilter !== 'all' && task.type !== typeFilter) return false;
    if (tierFilter !== 'all' && task.tier !== tierFilter) return false;
    return true;
  });

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);


  // Status indicators
  // (computed later when needed)

  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{completed:number; total:number; currentTaskId?:string}>({ completed: 0, total: 0 });
  const [enrichingTaskIds, setEnrichingTaskIds] = useState<Set<string>>(new Set());
  const [enrichFinished, setEnrichFinished] = useState(false);
  const enrichAbortRef = useRef<AbortController | null>(null);

  const markEnriching = (id: string) => setEnrichingTaskIds((s) => new Set(Array.from(s).concat(id)));
  const unmarkEnriching = (id: string) => setEnrichingTaskIds((s) => { const arr = Array.from(s).filter(x => x !== id); return new Set(arr); });

  // Stop enrichment if running
  const stopEnrichment = () => {
    enrichAbortRef.current?.abort();
    enrichAbortRef.current = null;
    setIsEnriching(false);
    setEnrichFinished(true);
  };

  // Save results after enrichment (finished or stopped)
  const handleSaveResults = async () => {
    try {
      await saveCurrentProject();
      toast.success('Task results saved');
      setEnrichFinished(false);
    } catch (err) {
      console.error('Failed to save enriched results:', err);
      toast.error('Save failed');
    }
  };

  // Manual enrichment handlers
  const handleEnrichAll = async () => {
    if (tasks.length === 0) return;
    const settings = useSettingsStore.getState();
    try {
      updateLLMRouter({ apiKeys: settings.apiKeys, modelSelection: settings.modelSelection });
    } catch (err) {
      console.warn('Failed to initialize LLM router before enrichment:', err);
    }

    setIsEnriching(true);
    setEnrichProgress({ completed: 0, total: tasks.length, currentTaskId: undefined });

    try {
      const attached = getArchitectureGuide();
      const context: TaskGenerationContext = {
        prd: prdStore.prd || ({ id: 'prd-1', projectName: 'Sample Project', moduleName: 'auth', version: '1.0.0' } as any),
        entities: entityStore.entities,
        relationships: entityStore.relationships,
        dbml: erdStore.dbml,
        architectureGuide: attached ? { id: attached.id, name: attached.name, content: attached.content, format: attached.format } : undefined,
      } as TaskGenerationContext;

const controller = new AbortController();
      enrichAbortRef.current = controller;
      setEnrichFinished(false);

      const enriched = await enrichTaskSet(tasks, context, controller.signal, {
        onEnrichmentProgress: (completed: number, total: number, currentTaskId?: string) => {
          setEnrichProgress({ completed, total, currentTaskId });
          if (currentTaskId) {
            markEnriching(currentTaskId);
            // auto unmark after a short time so row UI shows progress
            setTimeout(() => unmarkEnriching(currentTaskId), 2000);
          }
        },
      }, 3);

      const currentSet = useTaskStore.getState().taskSet;
      if (currentSet) {
        const newSet: TaskSet = { ...currentSet, tasks: enriched.tasks, metadata: { ...(currentSet as any).metadata, ...(enriched.metadataUpdates || {}) } as any };
        setTaskSet(newSet);
      }

      // Persist and set phase status
      useProjectStore.getState().setPhaseDirect(4);
      useProjectStore.getState().setDirty(true);
      await saveCurrentProject();
      setPhaseStatus(4, enriched.failures && enriched.failures.length > 0 ? 'has-issues' : 'completed');

      toast.success('Tasks enriched successfully');
    } catch (err) {
      console.error('Enrich all failed:', err);
      toast.error('Enrichment failed; see console');
    } finally {
      setIsEnriching(false);
      setEnrichProgress({ completed: 0, total: 0, currentTaskId: undefined });
    }
  };

  const handleEnrichTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const settings = useSettingsStore.getState();
    try {
      updateLLMRouter({ apiKeys: settings.apiKeys, modelSelection: settings.modelSelection });
    } catch (err) {
      console.warn('Failed to initialize LLM router before enrichment:', err);
    }

    markEnriching(taskId);
    setIsEnriching(true);
    setEnrichProgress({ completed: 0, total: 1, currentTaskId: taskId });

    try {
      const attached = getArchitectureGuide();
      const context: TaskGenerationContext = {
        prd: prdStore.prd || ({ id: 'prd-1', projectName: 'Sample Project', moduleName: 'auth', version: '1.0.0' } as any),
        entities: entityStore.entities,
        relationships: entityStore.relationships,
        dbml: erdStore.dbml,
        architectureGuide: attached ? { id: attached.id, name: attached.name, content: attached.content, format: attached.format } : undefined,
      } as TaskGenerationContext;

      const enriched = await enrichTaskSet([task], context, undefined, {
        onEnrichmentProgress: (completed: number, total: number, currentTaskId?: string) => {
          setEnrichProgress({ completed, total, currentTaskId });
        },
      });

      const currentSet = useTaskStore.getState().taskSet;
      if (currentSet) {
        const newTasks = currentSet.tasks.map((t) => (t.id === taskId ? enriched.tasks[0] : t));
        const newSet: TaskSet = { ...currentSet, tasks: newTasks, metadata: { ...(currentSet as any).metadata, ...(enriched.metadataUpdates || {}) } as any };
        setTaskSet(newSet);
      }

      // Persist
      useProjectStore.getState().setDirty(true);
      await saveCurrentProject();

      toast.success('Task enriched');
    } catch (err) {
      console.error(`Enrich task ${taskId} failed:`, err);
      toast.error('Enrichment failed; see console');
    } finally {
      unmarkEnriching(taskId);
      setIsEnriching(false);
      setEnrichProgress({ completed: 0, total: 0, currentTaskId: undefined });
    }
  };

  const handleGenerate = async () => {
    const prd = prdStore.prd;
    const entities = entityStore.entities;
    const relationships = entityStore.relationships;
    const dbml = erdStore.dbml;

    // Validate that we have the required data from previous phases
    if (!prd) {
      toast.error('No PRD data available. Please complete Phase 1 first.');
      return;
    }

    if (!entities || entities.length === 0) {
      toast.error('No entities extracted. Please complete Phase 2 first.');
      return;
    }

    setGenerating(true, 0);

    // Simulate progress
    for (let i = 0; i <= 90; i += 10) {
      await new Promise((r) => setTimeout(r, 120));
      setGenerating(true, i);
    }

    const attached = getArchitectureGuide();

    if (attached && (!attached.content || attached.content.trim() === '')) {
      toast('Attached architecture guide appears to be empty or unreadable; extraction will be skipped.');
    }

    const context = {
      prd: prd || ({ id: 'prd-1', projectName: 'Sample Project', moduleName: 'auth', version: '1.0.0', overview: { description: '', objectives: [], scope: { included: [], excluded: [] }, assumptions: [], constraints: [] }, userRoles: [], functionalRequirements: [], dataRequirements: { entities: [], enums: [] }, nonFunctionalRequirements: {}, qualityScore: { overall: 0, breakdown: { completeness: 0, clarity: 0, consistency: 0, testability: 0 }, details: [] }, analysisResults: { crudCoverage: [], workflowSummary: [], screenCoverage: { totalScreens: 0, screensByType: {}, orphanedScreens: [], missingScreens: [] }, entityUsage: [] }, rawContent: '', createdAt: new Date(), updatedAt: new Date() } as any),
      entities: entities || [],
      relationships: relationships || [],
      dbml: dbml || '',
      architectureGuide: attached
        ? { id: attached.id, name: attached.name, content: attached.content, format: attached.format }
        : undefined,
    };

    try {
      setGenerating(true, 95);

      // Generate base tasks synchronously and show results immediately (no automatic LLM extraction/enrichment)
      const base = generateTasks(context as any);
      setTaskSet({ ...base, projectName: prd?.projectName || 'Sample Project' });

      // Mark phase as completed for generation; enrichment is manual
      try {
        useProjectStore.getState().setPhaseDirect(4);
        useProjectStore.getState().setDirty(true);
        setPhaseStatus(4, 'completed');
      } catch (err) {
        console.warn('Failed to set phase status after generation:', err);
      }

      // Finish progress
      setGenerating(true, 100);
      setIsEnriching(false);

      // Persist tasks and phase state immediately
      try {
        useProjectStore.getState().setPhaseDirect(4);
        useProjectStore.getState().setDirty(true);

        await saveCurrentProject();
        toast.success('Tasks saved');
      } catch (err) {
        console.error('Failed to save tasks after generation:', err);
        toast.error('Failed to save tasks; please save the project manually');
      }

      // Notify user about extraction/enrichment status
      const currentTaskSet = useTaskStore.getState().taskSet;
      if (currentTaskSet?.metadata?.architectureExtractionSkipped) {
        const reason = currentTaskSet.metadata.architectureExtractionSkipped;
        if (reason === 'no_api_key') {
          toast('Architecture extraction skipped: No LLM API key configured.');
        } else {
          toast(`Architecture extraction skipped: ${reason}`);
        }
      } else if (currentTaskSet?.metadata?.architectureExtractionRaw) {
        toast.success('Architecture recommendations applied from attached guide.');
      }

      const implStatusLocal = currentTaskSet?.metadata?.architectureImplementationStatus;
      if (implStatusLocal === 'skipped' && currentTaskSet?.metadata?.architectureImplementationSkipped) {
        const reason = currentTaskSet.metadata.architectureImplementationSkipped;
        if (reason === 'no_api_key') {
          toast('Implementation enrichment skipped: No LLM API key configured. Add an API key in Settings → API Keys to enable enrichment.');
        } else if (reason === 'implementation_enrichment_disabled') {
          toast('Implementation enrichment is disabled in Advanced settings.');
        } else {
          toast(`Implementation enrichment skipped: ${reason}`);
        }
      } else if (implStatusLocal === 'failed') {
        toast.error('Implementation enrichment attempted but failed. Check console for details.');
      } else if (implStatusLocal === 'enriched') {
        toast.success('Tasks enriched with technical implementation guidance.');
      }

      setGenerating(false);
      setPhaseStatus(4, 'completed');
      toast.success(`Generated ${useTaskStore.getState().taskSet?.tasks.length ?? 0} tasks successfully`);
    } catch (error) {
      console.error('Task generation failed:', error);
      setGenerating(false);
      toast.error('Failed to generate tasks. Please try again.');

      // Fallback to synchronous generator
      try {
        const fallback = generateTasks(context as any);
        setTaskSet({ ...fallback, projectName: prd?.projectName || 'Sample Project' });
      } catch (fallbackErr) {
        console.error('Fallback generation failed:', fallbackErr);
      }
    }
  };

  const handleExport = () => {
    openModal('export');
  };

  const handleCopyPrompt = async () => {
    if (!selectedTask) return;

    const prompt = generateTaskPrompt(selectedTask);
    await navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
    toast.success('Prompt copied to clipboard');
    setTimeout(() => setPromptCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Task Generation</h2>
          <p className="text-sm text-muted-foreground">
            Generate programmable development tasks
          </p>
        </div>

        {/* Architecture guide attach / select */}
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <div className="mb-1 font-medium">Architecture Guide</div>
            <div className="text-xs text-muted-foreground">
              Attach a technical / development guide to influence task generation
            </div>
          </div>

          <div className="flex items-center gap-2">
              {/* Hidden file input (triggered programmatically) */}
            <input
              id="arch-upload"
              ref={archInputRef}
              type="file"
              accept=".md,.txt,.html,.json,.yaml,.yml,.pdf"
              className="hidden"
              onChange={async (e) => {
                // Capture the input element synchronously to avoid React's event pooling
                const inputEl = e.currentTarget as HTMLInputElement;
                const file = inputEl.files?.[0];
                if (!file) return;
                const format = file.name.split('.').pop()?.toLowerCase();
                let content = '';
                try {
                  // Try to read text content; for binary (pdf) leave empty
                  content = await file.text();
                } catch (err) {
                  console.warn('Unable to read file as text');
                }

                const newId = addFile({
                  name: file.name,
                  type: 'other',
                  content: content,
                  format: (format as any) || 'txt',
                  size: file.size,
                });

                setArchitectureGuide(newId);
                // Clear input safely
                try {
                  inputEl.value = '';
                } catch (err) {
                  // ignore
                }
              }}
            />

            <Button
              size="sm"
              variant="outline"
              onClick={() => archInputRef.current?.click()}
            >
              Attach
            </Button>

            {/* Select existing other files */}
            <select
              className="border rounded px-2 py-1 text-sm"
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                setArchitectureGuide(id);
              }}
            >
              <option value="">Select existing</option>
              {getFilesByType('other').map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* Show attached file and remove */}
            {getArchitectureGuide() ? (
              <div className="flex items-center gap-2">
                <div className="text-sm">{getArchitectureGuide()?.name}</div>
                <Button size="sm" variant="ghost" onClick={() => clearArchitectureGuide()}>
                  Remove
                </Button>
              </div>
            ) : null}

            <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Tasks'}
            </Button>

            {tasks.length > 0 && (
              <>
                <Button onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>

                {/* <div className="flex items-center gap-2 ml-2">
                  {recommendationsApplied ? (
                    <Badge variant="default" className="bg-green-600 text-white text-xs">
                      Architecture recommendations applied
                    </Badge>
                  ) : extractionSkipped ? (
                    <Badge variant="destructive" className="text-xs">
                      Extraction skipped: {extractionSkipped}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      No recommendations
                    </Badge>
                  )}

                  {implStatus === 'enriched' || hasAnyEnriched ? (
                    <Badge variant="default" className="bg-emerald-600 text-white text-xs">
                      Implementation enriched
                    </Badge>
                  ) : implStatus === 'skipped' ? (
                    <Badge variant="destructive" className="text-xs">Enrichment skipped</Badge>
                  ) : implStatus === 'failed' ? (
                    <Badge variant="destructive" className="text-xs">Enrichment failed</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Not enriched</Badge>
                  )}
                </div> */}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      {(isGenerating || isEnriching) && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {isGenerating && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Generating tasks...</span>
                    <span>{generateProgress}%</span>
                  </div>
                  <Progress value={generateProgress} />
                </>
              )}

              {/* Enrichment progress */}
              {isEnriching && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span>Enriching implementations — {enrichProgress.completed}/{enrichProgress.total}</span>
                    <span>{enrichProgress.total > 0 ? Math.round((enrichProgress.completed / enrichProgress.total) * 100) : 0}%</span>
                  </div>
                  <Progress value={enrichProgress.total > 0 ? (enrichProgress.completed / enrichProgress.total) * 100 : 0} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{summary.totalTasks}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                {summary.byTier && Object.entries(summary.byTier).map(
                  ([tier, count]) =>
                    count > 0 && (
                      <Badge
                        key={tier}
                        className={cn(TIER_COLORS[tier as TaskTier], 'text-white')}
                      >
                        {tier}: {count}
                      </Badge>
                    )
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">By Tier</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{summary.criticalPath?.length ?? 0}</div>
              <div className="text-sm text-muted-foreground">Critical Path</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {typeof summary.estimatedComplexity === 'object'
                  ? (summary.estimatedComplexity.simple || 0) + (summary.estimatedComplexity.moderate || 0)
                  : 0}
              </div>
              <div className="text-sm text-muted-foreground">Moderate+ Tasks</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      {tasks.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="T1">T1</SelectItem>
                  <SelectItem value="T2">T2</SelectItem>
                  <SelectItem value="T3">T3</SelectItem>
                  <SelectItem value="T4">T4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task List and Detail */}
      {tasks.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Task List */}
          <Card>
            <CardHeader className="py-3 flex items-center justify-between">
              <CardTitle className="text-base">Tasks ({filteredTasks.length})</CardTitle>

              <div className="flex items-center gap-2">
                {isEnriching ? (
                  <Button size="sm" variant="destructive" onClick={() => stopEnrichment()}>
                    Stop
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleEnrichAll()} disabled={isEnriching || tasks.length === 0}>
                    Enrich All
                  </Button>
                )}

                <Button size="sm" variant="outline" onClick={() => handleSaveResults()} disabled={!enrichFinished && !useProjectStore.getState().isDirty}>
                  Save Results
                </Button>

                <Button size="sm" variant="ghost" onClick={() => handleExport()}>
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-2 space-y-1">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        'p-3 rounded-md cursor-pointer transition-colors border',
                        selectedTaskId === task.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted border-transparent'
                      )}
                      onClick={() => selectTask(task.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">{task.id}</Badge>

                        <div className="flex items-center gap-2">
                          <Badge className={cn(TIER_COLORS[task.tier], 'text-white text-xs')}>{task.tier}</Badge>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleEnrichTask(task.id); }}
                            disabled={isEnriching || enrichingTaskIds.has(task.id)}
                          >
                            {enrichingTaskIds.has(task.id) ? 'Enriching...' : 'Enrich'}
                          </Button>
                        </div>
                      </div>

                      <div className="font-medium text-sm">{task.title}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{TASK_TYPE_LABELS[task.type]}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Task Detail */}
          <Card>
            {selectedTask ? (
              <>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedTask.id}</Badge>
                    <CardTitle className="text-base">{selectedTask.title}</CardTitle>

                    <div className="ml-auto flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEnrichTask(selectedTask.id)} disabled={isEnriching || enrichingTaskIds.has(selectedTask.id)}>
                        {enrichingTaskIds.has(selectedTask.id) ? 'Enriching...' : 'Enrich this task'}
                      </Button>

                      <Button size="sm" variant="ghost" onClick={handleCopyPrompt} disabled={!selectedTask}>
                        <Copy className="h-4 w-4 mr-2" />
                        {promptCopied ? 'Copied' : 'Copy Prompt'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-1">Objective</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedTask.specification.objective}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Context</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedTask.specification.context}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Requirements</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {selectedTask.specification.requirements.map((req, i) => (
                            <li key={i}>{req}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Acceptance Criteria</h4>
                        <ul className="space-y-1">
                          {selectedTask.acceptanceCriteria.map((ac, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              {ac}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Technical implementation */}
                      {selectedTask.specification && (selectedTask.specification as any).technicalImplementation && (
                        <div>
                          <h4 className="font-medium mb-1">Technical Implementation</h4>
                          <div className="text-sm text-muted-foreground space-y-2">
                            {(selectedTask.specification as any).technicalImplementation.stack && (
                              <div>
                                <strong>Stack:</strong> {(selectedTask.specification as any).technicalImplementation.stack.join(', ')}
                              </div>
                            )}

                            {(selectedTask.specification as any).technicalImplementation.libraries && (
                              <div>
                                <strong>Libraries:</strong> {(selectedTask.specification as any).technicalImplementation.libraries.join(', ')}
                              </div>
                            )}

                            {(selectedTask.specification as any).technicalImplementation.steps && (
                              <div>
                                <strong>Implementation steps:</strong>
                                <ol className="list-decimal list-inside text-sm mt-1">
                                  {(selectedTask.specification as any).technicalImplementation.steps.map((s: string, i: number) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {(selectedTask.specification as any).technicalImplementation.codeExamples && (
                              <div>
                                <strong>Code / Commands:</strong>
                                <div className="mt-1 space-y-2">
                                  {(selectedTask.specification as any).technicalImplementation.codeExamples.map((c: string, i: number) => (
                                    <pre key={i} className="p-2 bg-surface rounded text-xs overflow-auto">{c}</pre>
                                  ))}
                                </div>
                              </div>
                            )}

                            {typeof (selectedTask.specification as any).technicalImplementation.estimatedEffortHours === 'number' && (
                              <div>
                                <strong>Estimated effort:</strong> {(selectedTask.specification as any).technicalImplementation.estimatedEffortHours} hours
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {selectedTask.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">
                  Select a task to view its details
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              Click "Generate Tasks" to create development tasks from your ERD
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
