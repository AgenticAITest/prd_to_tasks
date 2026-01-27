import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import { generateTasksWithArchitecture, generateTasks } from '@/core/task-generator';
import { useState } from 'react';
import { toast } from 'sonner';

export function ArchitecturePreviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const modalData = useUIStore((s) => s.modalData);
  const { setTaskSet } = useTaskStore();
  const [isApplying, setIsApplying] = useState(false);

  const recommendations = (modalData?.recommendations as any[]) || [];
  const context = modalData?.context;

  const handleApply = async () => {
    if (!context) return;
    setIsApplying(true);
    try {
      const taskSet = await generateTasksWithArchitecture(context as any, undefined, undefined, false);
      setTaskSet(taskSet as any);
      toast.success('Applied recommendations and enriched tasks');
      useUIStore.getState().closeModal();
    } catch (err) {
      console.error('Failed to apply recommendations:', err);
      toast.error('Failed to apply recommendations');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancel = async () => {
    // If there is no context, just close
    if (!context) {
      useUIStore.getState().closeModal();
      return;
    }

    setIsApplying(true);
    try {
      // Generate tasks without applying architecture recommendations (fallback behavior)
      const base = generateTasks(context as any);
      setTaskSet(base as any);
      toast('Generated tasks without applying architecture recommendations');
    } catch (err) {
      console.error('Failed to generate tasks on cancel:', err);
      toast.error('Failed to generate tasks');
    } finally {
      setIsApplying(false);
      useUIStore.getState().closeModal();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Architecture Recommendations Preview</DialogTitle>
          <DialogDescription>
            Review LLM-extracted recommendations. You can apply these changes to generate tasks enriched by the architecture guide.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-sm text-muted-foreground">No recommendations to preview.</div>
          ) : (
            recommendations.map((r, idx) => (
              <div key={idx} className="p-3 border rounded">
                <div className="font-medium">{r.title || r.action}</div>
                <pre className="text-xs mt-2 bg-surface p-2 rounded overflow-auto">{JSON.stringify(r, null, 2)}</pre>
              </div>
            ))
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onClose()}>Cancel</Button>
            <Button onClick={handleApply} disabled={isApplying || recommendations.length === 0}>
              {isApplying ? 'Applying...' : 'Apply Recommendations'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
