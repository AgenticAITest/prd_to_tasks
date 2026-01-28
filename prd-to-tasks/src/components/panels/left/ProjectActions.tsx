import { Save, FolderOpen, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { toast } from 'sonner';
import { useProject } from '@/hooks/useProject';

interface ProjectActionsProps {
  collapsed?: boolean;
}

export function ProjectActions({ collapsed = false }: ProjectActionsProps) {
  const { project, isDirty, setDirty } = useProjectStore();
  const { openModal } = useUIStore();
  const { saveCurrentProject } = useProject();

  const handleSave = async () => {
    if (!project) return;

    try {
      await saveCurrentProject();
      // saveCurrentProject sets dirty flag itself via projectStore
      setDirty(false);
      toast.success('Project saved');
    } catch (error) {
      console.error('Failed to save project', error);
      toast.error('Failed to save project');
    }
  };

  const handleNewProject = () => {
    openModal('new-project');
  };

  const handleExport = () => {
    openModal('export');
  };

  if (collapsed) {
    return (
      <TooltipProvider>
        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNewProject}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New Project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openModal('open-project')}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Open Project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSave}
                disabled={!project || !isDirty}
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Save Project</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleExport}
                disabled={!project}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Export</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1 min-w-[80px]"
        onClick={handleNewProject}
      >
        <Plus className="h-4 w-4 mr-1" />
        New
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 min-w-[80px]"
        onClick={() => openModal('open-project')}
      >
        <FolderOpen className="h-4 w-4 mr-1" />
        Open
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 min-w-[80px]"
        onClick={handleSave}
        disabled={!project || !isDirty}
      >
        <Save className="h-4 w-4 mr-1" />
        Save
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 min-w-[80px]"
        onClick={handleExport}
        disabled={!project}
      >
        <Download className="h-4 w-4 mr-1" />
        Export
      </Button>
    </div>
  );
}
