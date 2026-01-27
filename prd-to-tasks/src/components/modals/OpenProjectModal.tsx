import { useEffect, useState } from 'react';
import { Trash, FolderOpen, RefreshCw, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { listProjects, deleteProject } from '@/db';
import type { DBProject } from '@/db/database';
import { useProject } from '@/hooks/useProject';
import { useProjectStore } from '@/store/projectStore';
import { toast } from 'sonner';

interface OpenProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function OpenProjectModal({ open, onClose }: OpenProjectModalProps) {
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { loadExistingProject } = useProject();
  const projectStore = useProjectStore();

  const load = async () => {
    setIsLoading(true);
    try {
      const list = await listProjects();
      setProjects(list);
    } catch (error) {
      console.error('Failed to list projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleOpen = async (projectId: string) => {
    try {
      await loadExistingProject(projectId);
      toast.success('Project loaded');
      onClose();
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to open project');
    }
  };

  const handleDelete = async (projectId: string) => {
    const isCurrent = projectStore.project?.id === projectId;

    try {
      await deleteProject(projectId);
      toast.success('Project deleted');
      // If we deleted the current opened project, reset stores
      if (isCurrent) {
        // useProject's deleteCurrentProject already handles resetting when called by user
        // but here we simply close it from DB and reset UI state
        projectStore.closeProject();
      }
      await load();
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Open Project</DialogTitle>
              <DialogDescription>
                Select a project to open from local storage (IndexedDB)
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={load}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4 mr-1" /> Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-2 overflow-auto max-h-[60vh] p-2">
          {isLoading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {!isLoading && projects.length === 0 && (
            <div className="text-sm text-muted-foreground">No saved projects</div>
          )}

          {projects.map((p) => (
            <div key={p.projectId} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">Updated: {p.updatedAt?.toString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => handleOpen(p.projectId)}>
                  <FolderOpen className="h-4 w-4 mr-1" /> Open
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(p.projectId)}>
                  <Trash className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
