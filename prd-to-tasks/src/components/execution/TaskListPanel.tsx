/**
 * Task List Panel (Left Panel)
 * Displays scrollable task list with execution status indicators
 */

import { useEffect } from 'react';
import {
  Check,
  Circle,
  Play,
  Loader2,
  AlertCircle,
  GitCommitHorizontal,
  ArrowLeft,
  SkipForward,
  User,
  CheckCircle2,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useTaskStore } from '@/store/taskStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useExecutionStore, type TaskExecutionStatus } from '@/store/executionStore';
import { cn } from '@/lib/utils';

function getStatusIcon(status: TaskExecutionStatus) {
  switch (status) {
    case 'committed':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'generating':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'review':
      return <Play className="h-4 w-4 text-yellow-500" />;
    case 'approved':
      return <GitCommitHorizontal className="h-4 w-4 text-blue-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-gray-400" />;
    case 'manual-pending':
      return <User className="h-4 w-4 text-orange-500" />;
    case 'manual-complete':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

export function TaskListPanel() {
  // Get tasks from taskStore
  const { tasks } = useTaskStore();
  const { exitExecutionMode } = useEnvironmentStore();

  // Get execution state
  const { selectedTaskId, selectTask, taskExecutionStatus, initializeTaskStatus } = useExecutionStore();

  // Initialize task statuses based on execution mode
  useEffect(() => {
    tasks.forEach((task) => {
      if (task.executionMode) {
        initializeTaskStatus(task.id, task.executionMode);
      }
    });
  }, [tasks, initializeTaskStatus]);

  // Calculate overall progress
  const completedCount = tasks.filter(
    (t) => taskExecutionStatus[t.id] === 'committed'
  ).length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const handleSelectTask = (taskId: string) => {
    selectTask(taskId);
  };

  const handleGoBack = () => {
    exitExecutionMode();
  };

  return (
    <div className="h-full flex flex-col border-r bg-background">
      {/* Header */}
      <div className="p-3 border-b shrink-0">
        <h3 className="font-medium text-sm">Tasks</h3>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {completedCount} of {tasks.length} completed
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1" />
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {!tasks || tasks.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground space-y-3">
              <AlertCircle className="h-8 w-8 mx-auto text-yellow-500" />
              <p className="font-medium">No tasks found</p>
              <p className="text-xs">
                Tasks need to be generated in Phase 4 before executing.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoBack}
                className="mt-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Go to Phase 4
              </Button>
            </div>
          ) : (
            tasks.map((task) => {
              const status = taskExecutionStatus[task.id] || 'pending';
              const isSelected = selectedTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={cn(
                    'p-2 rounded cursor-pointer transition-colors flex items-start gap-2',
                    isSelected
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted border border-transparent'
                  )}
                  onClick={() => handleSelectTask(task.id)}
                >
                  {/* Status Icon */}
                  <div className="mt-0.5 shrink-0">{getStatusIcon(status)}</div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1">
                        {task.id}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1">
                        {task.type}
                      </Badge>
                      {task.tier && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] px-1',
                            task.tier === 'T1' && 'bg-green-100 text-green-700',
                            task.tier === 'T2' && 'bg-blue-100 text-blue-700',
                            task.tier === 'T3' && 'bg-yellow-100 text-yellow-700',
                            task.tier === 'T4' && 'bg-red-100 text-red-700'
                          )}
                        >
                          {task.tier}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-medium truncate mt-0.5">
                      {task.title}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="p-2 border-t text-[10px] text-muted-foreground shrink-0">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <div className="flex items-center gap-1">
            <Circle className="h-3 w-3" />
            Pending
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-orange-500" />
            Manual
          </div>
          <div className="flex items-center gap-1">
            <SkipForward className="h-3 w-3 text-gray-400" />
            Skip
          </div>
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-green-500" />
            Done
          </div>
        </div>
      </div>
    </div>
  );
}
