import { useState } from 'react';
import { Download, Copy, Check, FileJson, FileText, File } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTaskStore } from '@/store/taskStore';
import { toast } from 'sonner';
import type { TaskExportOptions } from '@/types/task';
import { cn } from '@/lib/utils';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

const FORMAT_OPTIONS = [
  { value: 'json', label: 'JSON', icon: FileJson },
  { value: 'yaml', label: 'YAML', icon: File },
  { value: 'markdown', label: 'Markdown', icon: FileText },
];

const GROUP_OPTIONS = [
  { value: 'none', label: 'No Grouping' },
  { value: 'type', label: 'By Type' },
  { value: 'module', label: 'By Module' },
  { value: 'tier', label: 'By Tier' },
  { value: 'priority', label: 'By Priority' },
];

export function ExportModal({ open, onClose }: ExportModalProps) {
  const { summary, exportTasks } = useTaskStore();

  const [options, setOptions] = useState<TaskExportOptions>({
    format: 'markdown',
    includeMetadata: true,
    includeTestCases: true,
    groupBy: 'module',
  });

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const content = exportTasks(options);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = exportTasks(options);
    const extensions: Record<string, string> = {
      json: 'json',
      yaml: 'yaml',
      markdown: 'md',
    };
    const mimeTypes: Record<string, string> = {
      json: 'application/json',
      yaml: 'text/yaml',
      markdown: 'text/markdown',
    };

    const blob = new Blob([content], { type: mimeTypes[options.format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-export.${extensions[options.format]}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export downloaded');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Tasks</DialogTitle>
          <DialogDescription>
            Export {summary?.totalTasks || 0} tasks in your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((fmt) => {
                const Icon = fmt.icon;
                return (
                  <button
                    key={fmt.value}
                    onClick={() =>
                      setOptions((o) => ({
                        ...o,
                        format: fmt.value as 'json' | 'yaml' | 'markdown',
                      }))
                    }
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                      options.format === fmt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/50'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group By */}
          <div className="space-y-2">
            <Label>Group By</Label>
            <Select
              value={options.groupBy}
              onValueChange={(v) =>
                setOptions((o) => ({
                  ...o,
                  groupBy: v as TaskExportOptions['groupBy'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="metadata">Include Metadata</Label>
              <Switch
                id="metadata"
                checked={options.includeMetadata}
                onCheckedChange={(checked) =>
                  setOptions((o) => ({ ...o, includeMetadata: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="testcases">Include Test Cases</Label>
              <Switch
                id="testcases"
                checked={options.includeTestCases}
                onCheckedChange={(checked) =>
                  setOptions((o) => ({ ...o, includeTestCases: checked }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCopy} className="w-full sm:w-auto">
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Copied' : 'Copy to Clipboard'}
          </Button>
          <Button onClick={handleDownload} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
