import { FileUploader } from './FileUploader';
import { FileList } from './FileList';
import { ProjectActions } from './ProjectActions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUIStore } from '@/store/uiStore';

export function LeftPanel() {
  const leftPanelCollapsed = useUIStore((s) => s.leftPanelCollapsed);

  if (leftPanelCollapsed) {
    return (
      <div className="p-2 flex flex-col items-center gap-2">
        <ProjectActions collapsed />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <FileUploader />
          <FileList />
        </div>
      </ScrollArea>
      <div className="border-t p-3">
        <ProjectActions />
      </div>
    </div>
  );
}
