/**
 * CodeEditor Component
 * Monaco editor wrapper for code viewing and editing
 */

import { useRef, useCallback } from 'react';
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useUIStore } from '@/store/uiStore';
import { Loader2 } from 'lucide-react';

interface CodeEditorProps {
  value: string;
  language?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  height?: string | number;
  className?: string;
}

export function CodeEditor({
  value,
  language = 'typescript',
  readOnly = true,
  onChange,
  height = '100%',
  className = '',
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const theme = useUIStore((s) => s.theme);

  // Determine Monaco theme based on app theme
  const monacoTheme = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ? 'vs-dark'
    : 'light';

  const handleEditorDidMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      tabSize: 2,
      automaticLayout: true,
    });
  }, []);

  const handleChange: OnChange = useCallback(
    (newValue) => {
      if (onChange && newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <Editor
        value={value}
        language={language}
        theme={monacoTheme}
        onMount={handleEditorDidMount}
        onChange={handleChange}
        options={{
          readOnly,
          domReadOnly: readOnly,
          cursorStyle: readOnly ? 'line-thin' : 'line',
        }}
        loading={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      />
    </div>
  );
}
