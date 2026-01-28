/**
 * Execution Workspace
 * Main container for the 3-panel execution layout.
 * This component renders when isExecutionMode === true
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Zap,
  Upload,
  Check,
  Trash2,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TaskListPanel } from './TaskListPanel';
import { CodeViewerPanel } from './CodeViewerPanel';
import { PreviewPanel } from './PreviewPanel';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useTaskStore } from '@/store/taskStore';
import { useEntityStore } from '@/store/entityStore';
import { useERDStore } from '@/store/erdStore';
import { useIntegrationStore } from '@/store/integrationStore';
import { useAutoExecute } from '@/hooks/useAutoExecute';
import { useBatchGenerationStore } from '@/store/batchGenerationStore';
import { cn } from '@/lib/utils';

type ExecutionMode = 'sequential' | 'batch';

export function ExecutionWorkspace() {
  const [execMode, setExecMode] = useState<ExecutionMode>('batch');

  const { environment, exitExecutionMode } = useEnvironmentStore();
  const tasks = useTaskStore((s) => s.tasks);
  const { entities, relationships } = useEntityStore();
  const { dbml } = useERDStore();
  const { apiKeys } = useIntegrationStore();

  // Sequential execution hook
  const {
    status,
    currentTaskId,
    progress,
    error,
    isRunning,
    isPaused,
    isCompleted,
    start,
    resume,
    stop,
  } = useAutoExecute();

  // Batch generation store
  const {
    status: batchStatus,
    currentTaskIndex,
    totalTasks,
    generatedCount,
    approvedCount,
    totalFiles,
    pendingFiles,
    approvedFiles,
    startBatchGeneration,
    pauseBatchGeneration,
    stopBatchGeneration,
    approveAllPendingFiles,
    pushAllToGitHub,
    loadFromDB,
    clearAll,
  } = useBatchGenerationStore();

  // Load batch state from DB on mount
  useEffect(() => {
    if (environment?.projectId) {
      loadFromDB(environment.projectId);
    }
  }, [environment?.projectId, loadFromDB]);

  const handleBatchGenerate = () => {
    if (!environment?.projectId) return;
    startBatchGeneration(environment.projectId, tasks, {
      projectName: environment.projectName || 'project',
      entities,
      relationships,
      dbml: dbml || '',
    });
  };

  const handleApproveAll = () => {
    if (!environment?.projectId) return;
    approveAllPendingFiles(environment.projectId);
  };

  const handlePushToGitHub = () => {
    if (!environment?.projectId || !environment?.github || !apiKeys.github) return;
    pushAllToGitHub(
      environment.projectId,
      apiKeys.github,
      environment.github.owner,
      environment.github.repoName,
      environment.github.defaultBranch
    );
  };

  const handleClearAll = () => {
    if (!environment?.projectId) return;
    if (confirm('Clear all generated files? This cannot be undone.')) {
      clearAll(environment.projectId);
    }
  };

  const progressPercent =
    progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 border-b flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={exitExecutionMode}
            className="gap-2"
            disabled={isRunning}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to PRD
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="font-medium text-sm">Execution Workspace</span>
          {environment?.projectName && (
            <span className="text-sm text-muted-foreground">
              - {environment.projectName}
            </span>
          )}
        </div>

        {/* Execution Controls */}
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            <Button
              size="sm"
              variant={execMode === 'batch' ? 'default' : 'ghost'}
              onClick={() => setExecMode('batch')}
              className="h-7 px-2 text-xs"
            >
              <Zap className="h-3 w-3 mr-1" />
              Batch
            </Button>
            <Button
              size="sm"
              variant={execMode === 'sequential' ? 'default' : 'ghost'}
              onClick={() => setExecMode('sequential')}
              className="h-7 px-2 text-xs"
            >
              <Play className="h-3 w-3 mr-1" />
              Sequential
            </Button>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Batch Mode Controls */}
          {execMode === 'batch' && (
            <>
              {/* Status badges */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {generatedCount} generated
                </Badge>
                {pendingFiles > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {pendingFiles} pending
                  </Badge>
                )}
                {approvedFiles > 0 && (
                  <Badge className="text-xs bg-green-600">
                    {approvedFiles} approved
                  </Badge>
                )}
              </div>

              {/* Batch action buttons */}
              {batchStatus === 'idle' || batchStatus === 'completed' ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleBatchGenerate}
                    className="gap-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Zap className="h-4 w-4" />
                    Generate All
                  </Button>
                  {pendingFiles > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleApproveAll}
                      className="gap-1"
                    >
                      <Check className="h-4 w-4" />
                      Approve All
                    </Button>
                  )}
                  {approvedFiles > 0 && (
                    <Button
                      size="sm"
                      onClick={handlePushToGitHub}
                      className="gap-1 bg-green-600 hover:bg-green-700"
                      disabled={!environment?.github || !apiKeys.github}
                    >
                      <Upload className="h-4 w-4" />
                      Push to GitHub
                    </Button>
                  )}
                  {totalFiles > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearAll}
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : batchStatus === 'generating' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-xs text-muted-foreground">
                    {currentTaskIndex}/{totalTasks}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={pauseBatchGeneration}
                    className="gap-1"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={stopBatchGeneration}
                    className="gap-1"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                </div>
              ) : batchStatus === 'pushing' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    Pushing to GitHub...
                  </span>
                </div>
              ) : null}
            </>
          )}

          {/* Sequential Mode Controls */}
          {execMode === 'sequential' && (
            <>
              {/* Status indicator when running/paused */}
              {(isRunning || isPaused) && (
                <div className="flex items-center gap-2 mr-2">
                  {isRunning && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-xs text-muted-foreground">
                        {currentTaskId || 'Starting...'}
                      </span>
                    </>
                  )}
                  {status === 'paused-manual' && (
                    <>
                      <Pause className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs text-yellow-600">
                        Manual task - complete and resume
                      </span>
                    </>
                  )}
                  {status === 'paused-error' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-600 max-w-[200px] truncate">
                        Error: {error}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Completed indicator */}
              {isCompleted && (
                <div className="flex items-center gap-2 mr-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600">All tasks completed!</span>
                </div>
              )}

              {/* Progress bar when running */}
              {(isRunning || isPaused) && (
                <div className="flex items-center gap-2 min-w-[150px]">
                  <Progress value={progressPercent} className="h-2 w-24" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              {status === 'idle' && (
                <Button
                  size="sm"
                  onClick={start}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4" />
                  Run All Tasks
                </Button>
              )}

              {isRunning && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={stop}
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              )}

              {isPaused && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={resume}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4" />
                    Resume
                  </Button>
                  <Button size="sm" variant="outline" onClick={stop} className="gap-2">
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                </div>
              )}

              {isCompleted && (
                <Button size="sm" variant="outline" onClick={start} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Run Again
                </Button>
              )}
            </>
          )}

          <div className="h-4 w-px bg-border" />

          {/* Quick links to services */}
          {environment?.github && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(environment.github?.repoUrl, '_blank')}
            >
              GitHub
            </Button>
          )}
          {environment?.gitpod && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(environment.gitpod?.workspaceUrl, '_blank')}
            >
              Gitpod
            </Button>
          )}
        </div>
      </header>

      {/* Auto-Execute Progress Bar (when running) */}
      {(isRunning || isPaused) && (
        <div className="h-1 bg-muted">
          <div
            className={cn(
              'h-full transition-all duration-300',
              isRunning && 'bg-blue-500',
              status === 'paused-manual' && 'bg-yellow-500',
              status === 'paused-error' && 'bg-red-500'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Three Panel Layout - Simple Flex */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Task List (fixed width) */}
        <div className="w-72 border-r bg-muted/30 flex flex-col overflow-hidden">
          <TaskListPanel />
        </div>

        {/* Middle Panel - Code Viewer (flexible) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeViewerPanel />
        </div>

        {/* Right Panel - Preview (fixed width) */}
        <div className="w-80 border-l bg-muted/30 flex flex-col overflow-hidden">
          <PreviewPanel />
        </div>
      </div>

      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}
