import { useState } from 'react';
import { Copy, Check, Download, Code, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTaskStore } from '@/store/taskStore';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ExportFormat = 'json' | 'yaml' | 'markdown';

export function OutputPreview() {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');

  const { tasks, summary, exportTasks, getSelectedTask } = useTaskStore();
  const selectedTask = getSelectedTask();

  const getExportContent = (): string => {
    if (selectedTask) {
      // Export selected task only
      return exportTasks({
        format,
        includeMetadata: true,
        includeTestCases: true,
        groupBy: 'none',
      });
    }
    return exportTasks({
      format,
      includeMetadata: true,
      includeTestCases: true,
      groupBy: 'module',
    });
  };

  const handleCopy = async () => {
    const content = getExportContent();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = getExportContent();
    const extensions: Record<ExportFormat, string> = {
      json: 'json',
      yaml: 'yaml',
      markdown: 'md',
    };
    const mimeTypes: Record<ExportFormat, string> = {
      json: 'application/json',
      yaml: 'text/yaml',
      markdown: 'text/markdown',
    };

    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks.${extensions[format]}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Generate tasks to see output preview
          </p>
        </CardContent>
      </Card>
    );
  }

  const exportContent = getExportContent();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Output Preview</h3>
        <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="markdown">Markdown</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="yaml">YAML</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 mr-1" />
          ) : (
            <Copy className="h-4 w-4 mr-1" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
      </div>

      {/* Preview */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-2">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="source">
                <Code className="h-4 w-4 mr-1" />
                Source
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-0">
            <TabsContent value="preview" className="mt-0">
              <ScrollArea className="h-[400px]">
                {format === 'markdown' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {exportContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {exportContent}
                  </pre>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="source" className="mt-0">
              <ScrollArea className="h-[400px]">
                <pre className="text-xs font-mono bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {exportContent}
                </pre>
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Summary */}
      {summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Export Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tasks</span>
              <span>{summary.totalTasks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format</span>
              <span className="uppercase">{format}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size</span>
              <span>{(exportContent.length / 1024).toFixed(1)} KB</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
