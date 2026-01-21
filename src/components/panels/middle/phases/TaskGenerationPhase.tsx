import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import type { TaskType, TaskTier, ProgrammableTask } from '@/types/task';

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
  const { setPhaseStatus } = useProjectStore();
  const { openModal } = useUIStore();

  const filteredTasks = getFilteredTasks().filter((task) => {
    if (typeFilter !== 'all' && task.type !== typeFilter) return false;
    if (tierFilter !== 'all' && task.tier !== tierFilter) return false;
    return true;
  });

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const handleGenerate = async () => {
    setGenerating(true, 0);

    // Simulate task generation
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 100));
      setGenerating(true, i);
    }

    // Generate sample tasks
    const sampleTasks: ProgrammableTask[] = [
      {
        id: 'TASK-001',
        title: 'Create users table migration',
        type: 'database-migration',
        tier: 'T1',
        module: 'auth',
        priority: 'critical',
        dependencies: [],
        dependents: ['TASK-002'],
        specification: {
          objective: 'Create the users table with all required fields',
          context: 'Foundation for user authentication and management',
          requirements: [
            'Create users table with id, email, password_hash, name fields',
            'Add unique constraint on email',
            'Add created_at and updated_at timestamps',
            'Add soft delete support with deleted_at field',
          ],
        },
        acceptanceCriteria: [
          'Migration runs successfully',
          'Table is created with correct schema',
          'Indexes are created for performance',
        ],
        estimatedComplexity: 'simple',
        tags: ['database', 'auth', 'users'],
      },
      {
        id: 'TASK-002',
        title: 'Implement User CRUD API endpoints',
        type: 'api-crud',
        tier: 'T2',
        module: 'auth',
        priority: 'high',
        dependencies: ['TASK-001'],
        dependents: ['TASK-003'],
        specification: {
          objective: 'Create RESTful API endpoints for user management',
          context: 'Provides API layer for user operations',
          requirements: [
            'GET /api/v1/users - List users with pagination',
            'GET /api/v1/users/:id - Get user by ID',
            'POST /api/v1/users - Create new user',
            'PUT /api/v1/users/:id - Update user',
            'DELETE /api/v1/users/:id - Soft delete user',
          ],
        },
        acceptanceCriteria: [
          'All endpoints return correct status codes',
          'Validation errors are handled properly',
          'Pagination works correctly',
        ],
        estimatedComplexity: 'moderate',
        tags: ['api', 'auth', 'users'],
      },
      {
        id: 'TASK-003',
        title: 'Build User List UI component',
        type: 'ui-list',
        tier: 'T2',
        module: 'auth',
        priority: 'medium',
        dependencies: ['TASK-002'],
        dependents: [],
        specification: {
          objective: 'Create a data table component for displaying users',
          context: 'Admin interface for user management',
          requirements: [
            'Display users in a sortable, filterable table',
            'Include columns: Name, Email, Status, Created Date, Actions',
            'Add pagination controls',
            'Include search functionality',
          ],
        },
        acceptanceCriteria: [
          'Table displays user data correctly',
          'Sorting works on all sortable columns',
          'Filtering and search work as expected',
        ],
        estimatedComplexity: 'moderate',
        tags: ['ui', 'auth', 'users'],
      },
    ];

    setTaskSet({
      id: 'taskset-1',
      projectName: 'Sample Project',
      moduleName: 'auth',
      version: '1.0.0',
      generatedAt: new Date(),
      tasks: sampleTasks,
      summary: {
        totalTasks: sampleTasks.length,
        byType: {
          'database-migration': 1,
          'api-crud': 1,
          'api-custom': 0,
          'ui-list': 1,
          'ui-form': 0,
          'ui-detail': 0,
          'ui-modal': 0,
          'ui-dashboard': 0,
          'ui-report': 0,
          'validation': 0,
          'business-logic': 0,
          'workflow': 0,
          'integration': 0,
          'test': 0,
          'documentation': 0,
        },
        byTier: { T1: 1, T2: 2, T3: 0, T4: 0 },
        byModule: { auth: 3 },
        byPriority: { critical: 1, high: 1, medium: 1, low: 0 },
        criticalPath: ['TASK-001', 'TASK-002', 'TASK-003'],
        estimatedComplexity: {
          trivial: 0,
          simple: 1,
          moderate: 2,
          complex: 0,
          veryComplex: 0,
        },
      },
      metadata: {
        generatorVersion: '1.0.0',
        prdId: 'prd-1',
        erdId: 'erd-1',
        standardsApplied: ['database', 'api'],
        exportFormats: ['json', 'yaml', 'markdown'],
      },
    });

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
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Tasks'}
          </Button>
          {tasks.length > 0 && (
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
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
