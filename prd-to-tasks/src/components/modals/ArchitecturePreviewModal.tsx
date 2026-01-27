import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUIStore } from '@/store/uiStore';
import { useTaskStore } from '@/store/taskStore';
import { generateTasksWithArchitecture, generateTasks } from '@/core/task-generator';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/settingsStore';
import { updateLLMRouter } from '@/core/llm/LLMRouter';

export function ArchitecturePreviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const modalData = useUIStore((s) => s.modalData);
  const { setTaskSet } = useTaskStore();
  const [isApplying, setIsApplying] = useState(false);

  const recommendations = (modalData?.recommendations as any[]) || [];
  const context = modalData?.context;
  const metadata = (modalData?.metadata as any) || {};

  const handleApply = async () => {
    if (!context) return;
    setIsApplying(true);

    // Ensure LLM router is initialized with settings before applying
    const settings = useSettingsStore.getState();
    try {
      updateLLMRouter({ apiKeys: settings.apiKeys, modelSelection: settings.modelSelection });
    } catch (err) {
      console.warn('Failed to initialize LLM router before apply:', err);
    }

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
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">No recommendations to preview.</div>

              {/* If extraction was skipped, show the reason and guidance */}
              {metadata?.architectureExtractionSkipped ? (
                <div className="text-sm text-muted-foreground">
                  Extraction skipped: <strong>{metadata.architectureExtractionSkipped}</strong>.
                  {metadata.architectureExtractionSkipped === 'no_api_key' ? (
                    <div className="text-xs text-muted-foreground mt-1">No LLM API key configured. Add an API key in Settings → API Keys to enable architecture extraction.</div>
                  ) : null}
                </div>
              ) : null}

              {/* If raw extraction output exists, show it for debugging */}
              {metadata?.architectureExtractionRaw ? (
                <div className="mt-2">
                  <div className="text-xs font-medium">Raw extraction output (truncated):</div>
                  <pre className="text-xs mt-1 bg-surface p-2 rounded max-h-40 overflow-auto">{String(metadata.architectureExtractionRaw).slice(0, 2000)}</pre>
                </div>
              ) : null}

              {/* If implementation enrichment failed or produced raw output, show it */}
              {metadata?.architectureImplementationRaw || metadata?.architectureImplementationFailed ? (
                <div className="mt-2">
                  <div className="text-xs font-medium">Implementation enrichment diagnostics:</div>
                  {metadata?.architectureImplementationFailed ? (
                    <div className="text-xs text-destructive">Enrichment failed: {String(metadata?.architectureImplementationSkipped || 'unknown reason')}</div>
                  ) : null}
                  {metadata?.architectureImplementationRaw ? (
                    <pre className="text-xs mt-1 bg-surface p-2 rounded max-h-40 overflow-auto">{String(metadata.architectureImplementationRaw).slice(0, 2000)}</pre>
                  ) : null}
                </div>
              ) : null}
            </div>
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
