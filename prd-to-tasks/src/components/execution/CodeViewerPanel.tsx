/**
 * Code Viewer Panel (Middle Panel)
 * Shows generated/modified files with syntax highlighting
 * Supports diff view for changes
 */

import { useState } from 'react';
import { FileCode2, Copy, Check, Eye, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTaskStore } from '@/store/taskStore';

type ViewMode = 'code' | 'diff';

export function CodeViewerPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  const [copied, setCopied] = useState(false);
  const { selectedTaskId, tasks } = useTaskStore();

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const handleCopy = async () => {
    if (!selectedTask) return;
    // Copy the task specification or code to clipboard
    const content = JSON.stringify(selectedTask.specification, null, 2);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!selectedTask) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <FileCode2 className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">Select a task to view its code</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="h-10 border-b flex items-center justify-between px-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{selectedTask.id}</span>
          <span className="text-sm text-muted-foreground">- {selectedTask.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <SelectTrigger className="h-7 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code">
                <div className="flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  Code
                </div>
              </SelectItem>
              <SelectItem value="diff">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-3 w-3" />
                  Diff
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Copy Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Code Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {viewMode === 'code' ? (
            <pre className="text-sm font-mono bg-muted/50 p-4 rounded-lg overflow-x-auto">
              <code>{JSON.stringify(selectedTask.specification, null, 2)}</code>
            </pre>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              <GitCompare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Diff view coming soon</p>
              <p className="text-xs mt-1">
                Will show changes made during task execution
              </p>
            </div>
          )}

          {/* Task Details */}
          <div className="mt-6 space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Objective</h4>
              <p className="text-sm text-muted-foreground">
                {selectedTask.specification.objective}
              </p>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Requirements</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {selectedTask.specification.requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Acceptance Criteria</h4>
              <ul className="space-y-1">
                {selectedTask.acceptanceCriteria.map((ac, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {ac}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
