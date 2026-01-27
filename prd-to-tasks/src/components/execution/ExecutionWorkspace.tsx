/**
 * Execution Workspace
 * Main container for the 3-panel execution layout.
 * This component renders when isExecutionMode === true
 */

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TaskListPanel } from './TaskListPanel';
import { CodeViewerPanel } from './CodeViewerPanel';
import { PreviewPanel } from './PreviewPanel';
import { useEnvironmentStore } from '@/store/environmentStore';

export function ExecutionWorkspace() {
  const { environment, exitExecutionMode } = useEnvironmentStore();

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
          >
            <ArrowLeft className="h-4 w-4" />
            Back to PRD
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="font-medium text-sm">
            Execution Workspace
          </span>
          {environment?.projectName && (
            <span className="text-sm text-muted-foreground">
              - {environment.projectName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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

      {/* Three Panel Layout */}
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Left Panel - Task List */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <TaskListPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Middle Panel - Code Viewer */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <CodeViewerPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Preview */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <PreviewPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
