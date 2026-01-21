import { useCallback, useState } from 'react';
import { Upload, FileText, Code } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ACCEPTED_TYPES = {
  prd: ['.md', '.txt', '.pdf'],
  screen: ['.html', '.htm'],
};

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const { addFile } = useProjectStore();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = useCallback(async (file: File) => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    let fileType: 'prd' | 'screen' | null = null;
    let format: 'md' | 'txt' | 'pdf' | 'html' = 'md';

    if (ACCEPTED_TYPES.prd.includes(extension)) {
      fileType = 'prd';
      format = extension.slice(1) as 'md' | 'txt' | 'pdf';
    } else if (ACCEPTED_TYPES.screen.includes(extension)) {
      fileType = 'screen';
      format = 'html';
    }

    if (!fileType) {
      toast.error(`Unsupported file type: ${extension}`);
      return;
    }

    try {
      const content = await file.text();
      addFile({
        name: file.name,
        type: fileType,
        content,
        format,
        size: file.size,
      });
      toast.success(`Added ${file.name}`);
    } catch (error) {
      toast.error(`Failed to read ${file.name}`);
    }
  }, [addFile]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        await processFile(file);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        await processFile(file);
      }
      e.target.value = '';
    },
    [processFile]
  );

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".md,.txt,.pdf,.html,.htm"
        multiple
        onChange={handleFileSelect}
      />
      <label
        htmlFor="file-upload"
        className="cursor-pointer flex flex-col items-center gap-2"
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm">
          <span className="font-medium text-primary">Upload files</span>
          <span className="text-muted-foreground"> or drag & drop</span>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            PRD (.md, .txt)
          </span>
          <span className="flex items-center gap-1">
            <Code className="h-3 w-3" />
            Screens (.html)
          </span>
        </div>
      </label>
    </div>
  );
}
