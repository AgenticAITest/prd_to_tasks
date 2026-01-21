import { FileText, Code, Database, File, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import type { ProjectFile } from '@/types/prd';

const FILE_TYPE_ICONS: Record<ProjectFile['type'], typeof FileText> = {
  prd: FileText,
  screen: Code,
  generated: Database,
  other: File,
};

const FILE_TYPE_LABELS: Record<ProjectFile['type'], string> = {
  prd: 'PRD Files',
  screen: 'Screen Files',
  generated: 'Generated',
  other: 'Other Files',
};

export function FileList() {
  const { files, removeFile, getFilesByType } = useProjectStore();
  const { selectedFileId, selectFile, setPreviewContent } = useUIStore();

  const prdFiles = getFilesByType('prd');
  const screenFiles = getFilesByType('screen');
  const generatedFiles = getFilesByType('generated');

  const handleFileClick = (file: ProjectFile) => {
    selectFile(file.id);
    setPreviewContent(file.content);
  };

  const handleRemoveFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    removeFile(fileId);
    if (selectedFileId === fileId) {
      selectFile(null);
      setPreviewContent(null);
    }
  };

  const handleDownload = (e: React.MouseEvent, file: ProjectFile) => {
    e.stopPropagation();
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderFileGroup = (type: ProjectFile['type'], files: ProjectFile[]) => {
    if (files.length === 0) return null;

    const Icon = FILE_TYPE_ICONS[type];

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
          <Icon className="h-3 w-3" />
          {FILE_TYPE_LABELS[type]}
        </div>
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                'group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors',
                selectedFileId === file.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              )}
              onClick={() => handleFileClick(file)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate" title={file.name}>
                {file.name}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {type === 'generated' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleDownload(e, file)}
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={(e) => handleRemoveFile(e, file.id)}
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (files.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No files uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderFileGroup('prd', prdFiles)}
      {renderFileGroup('screen', screenFiles)}
      {renderFileGroup('generated', generatedFiles)}
    </div>
  );
}
