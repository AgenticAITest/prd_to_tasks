import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { RotateCcw, Copy, Check, FileText, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PromptEditorProps {
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
  onReset: () => void;
  isCustomized: boolean;
  className?: string;
}

export function PromptEditor({
  value,
  defaultValue,
  onChange,
  onReset,
  isCustomized,
  className,
}: PromptEditorProps) {
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      if (newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Prompt copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    onReset();
    toast.success('Prompt reset to default');
  };

  // Estimate token count (rough approximation: ~4 chars per token)
  const estimatedTokens = Math.ceil(value.length / 4);
  const charCount = value.length;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {charCount.toLocaleString()} chars
          </span>
          <span className="text-xs text-muted-foreground">
            (~{estimatedTokens.toLocaleString()} tokens)
          </span>
          {isCustomized && (
            <Badge variant="secondary" className="text-xs">
              Modified
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDiff(!showDiff)}
            className="h-7 px-2"
            title={showDiff ? 'Hide default' : 'Show default'}
          >
            {showDiff ? (
              <EyeOff className="h-3.5 w-3.5 mr-1" />
            ) : (
              <Eye className="h-3.5 w-3.5 mr-1" />
            )}
            {showDiff ? 'Hide Default' : 'Show Default'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 px-2"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={!isCustomized}
            className="h-7 px-2"
            title="Reset to default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex">
        {/* Main Editor */}
        <div className={cn('flex-1', showDiff && 'w-1/2')}>
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={value}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 8 },
            }}
          />
        </div>

        {/* Default Preview (side by side) */}
        {showDiff && (
          <>
            <div className="w-px bg-border" />
            <div className="w-1/2 flex flex-col">
              <div className="px-2 py-1 bg-muted/50 border-b">
                <span className="text-xs text-muted-foreground">Default Prompt (read-only)</span>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  defaultLanguage="markdown"
                  value={defaultValue}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    padding: { top: 8 },
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
