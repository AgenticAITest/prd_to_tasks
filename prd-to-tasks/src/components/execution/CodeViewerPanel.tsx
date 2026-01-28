/**
 * Code Viewer Panel (Middle Panel)
 * Shows generated/modified files with Monaco editor
 * Includes file tabs and execution controls
 */

import { useMemo } from 'react';
import {
  FileCode2,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  Circle,
  File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useTaskStore } from '@/store/taskStore';
import { useExecutionStore } from '@/store/executionStore';
import { CodeEditor } from './CodeEditor';
import { getMonacoLanguage } from './utils';
import { TaskExecutionControls } from './TaskExecutionControls';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CodeViewerPanel() {
  const { tasks } = useTaskStore();
  const {
    selectedTaskId,
    generatedFiles,
    activeFileIndex,
    setActiveFile,
    approveFile,
    rejectFile,
    getTaskStatus,
  } = useExecutionStore();

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId),
    [tasks, selectedTaskId]
  );

  const taskStatus = selectedTaskId ? getTaskStatus(selectedTaskId) : 'pending';

  const handleCopy = async () => {
    if (generatedFiles.length > 0 && generatedFiles[activeFileIndex]) {
      await navigator.clipboard.writeText(generatedFiles[activeFileIndex].content);
      toast.success('Code copied to clipboard');
    } else if (selectedTask) {
      const content = JSON.stringify(selectedTask.specification, null, 2);
      await navigator.clipboard.writeText(content);
      toast.success('Task specification copied');
    }
  };

  const handleApproveCurrentFile = () => {
    approveFile(activeFileIndex);
    toast.success('File approved');
  };

  const handleRejectCurrentFile = () => {
    rejectFile(activeFileIndex);
    toast.info('File rejected');
  };

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Circle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  // No task selected
  if (!selectedTask) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <FileCode2 className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">Select a task to view its code</p>
      </div>
    );
  }

  const activeFile = generatedFiles[activeFileIndex];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-10 border-b flex items-center justify-between px-3 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{selectedTask.id}</span>
          <span className="text-sm text-muted-foreground truncate hidden sm:block">
            - {selectedTask.title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">
            {selectedTask.type}
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* File Tabs */}
      {generatedFiles.length > 0 && (
        <div className="border-b bg-muted/20 shrink-0">
          <ScrollArea className="w-full">
            <div className="flex items-center gap-1 p-1">
              {generatedFiles.map((file, index) => (
                <button
                  key={file.path}
                  onClick={() => setActiveFile(index)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded text-xs whitespace-nowrap transition-colors',
                    index === activeFileIndex
                      ? 'bg-background border shadow-sm'
                      : 'hover:bg-muted'
                  )}
                >
                  {getFileStatusIcon(file.status)}
                  <File className="h-3 w-3 text-muted-foreground" />
                  <span className="max-w-[120px] truncate">{getFileName(file.path)}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* File Path Bar (when file is selected) */}
      {activeFile && (
        <div className="h-8 border-b flex items-center justify-between px-3 bg-muted/10 shrink-0">
          <span className="text-xs text-muted-foreground font-mono truncate">
            {activeFile.path}
          </span>
          {taskStatus !== 'committed' && (
            <div className="flex items-center gap-1">
              {activeFile.status === 'pending' ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleApproveCurrentFile}
                    className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRejectCurrentFile}
                    className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </>
              ) : (
                <Badge
                  variant={activeFile.status === 'approved' ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs',
                    activeFile.status === 'approved' && 'bg-green-500'
                  )}
                >
                  {activeFile.status}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {generatedFiles.length > 0 && activeFile ? (
          /* Monaco Editor for generated files */
          <CodeEditor
            value={activeFile.content}
            language={getMonacoLanguage(activeFile.path)}
            readOnly
            height="100%"
          />
        ) : (
          /* Task Specification View */
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Objective */}
              <div>
                <h4 className="font-medium text-sm mb-2">Objective</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedTask.specification.objective}
                </p>
              </div>

              {/* Context */}
              <div>
                <h4 className="font-medium text-sm mb-2">Context</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedTask.specification.context}
                </p>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="font-medium text-sm mb-2">Requirements</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {selectedTask.specification.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>

              {/* Acceptance Criteria */}
              <div>
                <h4 className="font-medium text-sm mb-2">Acceptance Criteria</h4>
                <ul className="space-y-1">
                  {selectedTask.acceptanceCriteria.map((ac, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {ac}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Technical Details */}
              {selectedTask.specification.database && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Database Specification</h4>
                  <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedTask.specification.database, null, 2)}
                  </pre>
                </div>
              )}

              {selectedTask.specification.api && (
                <div>
                  <h4 className="font-medium text-sm mb-2">API Specification</h4>
                  <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedTask.specification.api, null, 2)}
                  </pre>
                </div>
              )}

              {selectedTask.specification.ui && (
                <div>
                  <h4 className="font-medium text-sm mb-2">UI Specification</h4>
                  <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedTask.specification.ui, null, 2)}
                  </pre>
                </div>
              )}

              {/* Dependencies */}
              {selectedTask.dependencies.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Dependencies</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedTask.dependencies.map((dep) => (
                      <Badge key={dep} variant="outline" className="text-xs">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Execution Controls */}
      {selectedTaskId && <TaskExecutionControls taskId={selectedTaskId} />}
    </div>
  );
}
