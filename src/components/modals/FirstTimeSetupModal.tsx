import { Sparkles, Settings, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';

interface FirstTimeSetupModalProps {
  open: boolean;
  onClose: () => void;
}

export function FirstTimeSetupModal({ open, onClose }: FirstTimeSetupModalProps) {
  const { openModal, setSettingsTab } = useUIStore();

  const handleGoToSettings = () => {
    onClose();
    setSettingsTab('api-keys');
    openModal('settings');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Welcome to PRD to Tasks</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Transform your Product Requirements Documents into actionable development tasks
            powered by AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <h4 className="font-medium">To get started, you'll need:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  An API key from at least one AI provider (Anthropic, OpenAI, Google, or DeepSeek)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </span>
                <span>A PRD document in Markdown, text, or PDF format</span>
              </li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground">
              Your API keys are stored locally in your browser and are never sent to our servers.
              All processing is done directly between your browser and the AI providers.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={onClose}>
            Skip for now
          </Button>
          <Button onClick={handleGoToSettings} className="gap-2">
            <Settings className="h-4 w-4" />
            Configure API Keys
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
