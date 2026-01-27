import { useState, useRef } from 'react';
import { Play, Download, Filter, Search, RefreshCw, CheckCircle2 } from 'lucide-react';
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
import { usePRDStore } from '@/store/prdStore';
import { useEntityStore } from '@/store/entityStore';
import { useERDStore } from '@/store/erdStore';
import { generateTasks, generateTasksWithArchitecture } from '@/core/task-generator';
import { useProject } from '@/hooks/useProject';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';
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
  'test': 'Test',
  'documentation': 'Documentation',
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
  const taskSet = useTaskStore((s) => s.taskSet);

  // Status indicators
  const recommendationsApplied = !!(taskSet && taskSet.metadata && Array.isArray(taskSet.metadata.architectureRecommendations) && taskSet.metadata.architectureRecommendations.length > 0);
  const extractionSkipped = taskSet?.metadata?.architectureExtractionSkipped;
  const implStatus = taskSet?.metadata?.architectureImplementationStatus as 'enriched' | 'skipped' | 'not_enriched' | 'failed' | undefined;
  const hasAnyEnriched = implStatus === 'enriched' || tasks.some((t) => {
    const impl = (t.specification as any).technicalImplementation;
    return impl && Object.keys(impl).length > 0;
  });

  const handleGenerate = async () => {
    setGenerating(true, 0);

    // Simulate progress
    for (let i = 0; i <= 90; i += 10) {
      await new Promise((r) => setTimeout(r, 120));
      setGenerating(true, i);
    }

    // Ensure we have PRD and entities
    const prd = prdStore.prd;
    const entities = entityStore.entities;
    const relationships = entityStore.relationships;
    const dbml = erdStore.dbml;

    if (!prd) {
      // Fallback to sample if PRD is missing
      console.warn('PRD missing — generating sample tasks');
    }

    // Get attached architecture guide, if any
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

    // Call the async generator that may use LLM if architecture guide attached
    try {
      setGenerating(true, 95);

      // Respect preview setting in advanced settings
      const settings = useSettingsStore.getState();
      if (settings.advanced.previewArchitectureRecommendations && attached && attached.content) {
        // Request preview only
        const previewSet = await generateTasksWithArchitecture(context as any, undefined, undefined, true);

        // Open preview modal with recommendations
        useUIStore.getState().openModal('preview-architecture', {
          recommendations: previewSet.metadata?.architectureRecommendations || [],
          context,
        });

        setGenerating(false);
        return;
      }

      // Otherwise apply directly
      const taskSet = await generateTasksWithArchitecture(context as any, undefined);

      // Finish progress
      setGenerating(true, 100);

      setTaskSet({
        ...taskSet,
        projectName: prd?.projectName || 'Sample Project',
      });

      // Persist tasks and phase state immediately
      try {
        // Force current phase to 4 so it is remembered on reload
        useProjectStore.getState().setPhaseDirect(4);
        useProjectStore.getState().setDirty(true);

        await saveCurrentProject();
        toast.success('Tasks saved');
      } catch (err) {
        console.error('Failed to save tasks after generation:', err);
        toast.error('Failed to save tasks; please save the project manually');
      }

      // Notify user if architecture extraction was skipped or failed
      if (taskSet.metadata?.architectureExtractionSkipped) {
        const reason = taskSet.metadata.architectureExtractionSkipped;
        if (reason === 'no_api_key') {
          toast('Architecture extraction skipped: No LLM API key configured.');
        } else {
          toast(`Architecture extraction skipped: ${reason}`);
        }
      } else if (taskSet.metadata?.architectureExtractionRaw) {
        toast.success('Architecture recommendations applied from attached guide.');
      }

      // Notify user if implementation enrichment was skipped/failed
      const implStatus = taskSet.metadata?.architectureImplementationStatus;
      if (implStatus === 'skipped' && taskSet.metadata?.architectureImplementationSkipped) {
        const reason = taskSet.metadata.architectureImplementationSkipped;
        if (reason === 'no_api_key') {
          toast('Implementation enrichment skipped: No LLM API key configured. Add an API key in Settings → API Keys to enable enrichment.');
        } else if (reason === 'implementation_enrichment_disabled') {
          toast('Implementation enrichment is disabled in Advanced settings.');
        } else {
          toast(`Implementation enrichment skipped: ${reason}`);
        }
      } else if (implStatus === 'failed') {
        toast.error('Implementation enrichment attempted but failed. Check console for details.');
      } else if (implStatus === 'enriched') {
        toast.success('Tasks enriched with technical implementation guidance.');
      }
    } catch (err) {
      console.error('Task generation failed:', err);
      setGenerating(false);
      toast.error('Task generation failed. See console for details.');
      // Fallback to synchronous generator
      const fallback = generateTasks(context as any);
      setTaskSet({ ...fallback, projectName: prd?.projectName || 'Sample Project' });
    }

    setGenerating(false);
    setPhaseStatus(4, 'completed');
  };

  const handleExport = () => {
    openModal('export');
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
              Attach a technical architecture guide to influence task generation
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

                <div className="flex items-center gap-2 ml-2">
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
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating tasks...</span>
                <span>{generateProgress}%</span>
              </div>
              <Progress value={generateProgress} />
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
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                Tasks ({filteredTasks.length})
              </CardTitle>
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
                        <Badge variant="outline" className="text-xs">
                          {task.id}
                        </Badge>
                        <Badge
                          className={cn(TIER_COLORS[task.tier], 'text-white text-xs')}
                        >
                          {task.tier}
                        </Badge>
                      </div>
                      <div className="font-medium text-sm">{task.title}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {TASK_TYPE_LABELS[task.type]}
                        </Badge>
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
