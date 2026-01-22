import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PromptEditor } from './PromptEditor';
import { usePromptStore } from '@/store/promptStore';
import { DEFAULT_PROMPTS, getPromptMetadata, type PromptKey } from '@/core/llm/prompts/default-prompts';
import { toast } from 'sonner';

interface PromptEditorDialogProps {
  promptKey: PromptKey | null;
  open: boolean;
  onClose: () => void;
}

export function PromptEditorDialog({
  promptKey,
  open,
  onClose,
}: PromptEditorDialogProps) {
  const { getPrompt, setPrompt, resetPrompt } = usePromptStore();
  const [editedValue, setEditedValue] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const metadata = promptKey ? getPromptMetadata(promptKey) : null;
  const defaultValue = promptKey ? DEFAULT_PROMPTS[promptKey] : '';
  const currentValue = promptKey ? getPrompt(promptKey) : '';

  // Initialize edited value when dialog opens
  useEffect(() => {
    if (open && promptKey) {
      setEditedValue(getPrompt(promptKey));
      setHasChanges(false);
    }
  }, [open, promptKey, getPrompt]);

  const handleChange = (value: string) => {
    setEditedValue(value);
    setHasChanges(value !== currentValue);
  };

  const handleReset = () => {
    if (promptKey) {
      setEditedValue(defaultValue);
      setHasChanges(defaultValue !== currentValue);
    }
  };

  const handleSave = () => {
    if (promptKey) {
      // If the edited value equals the default, reset to null (use default)
      if (editedValue === defaultValue) {
        resetPrompt(promptKey);
      } else {
        setPrompt(promptKey, editedValue);
      }
      toast.success('Prompt saved successfully');
      onClose();
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      // Could add confirmation dialog here
    }
    onClose();
  };

  if (!promptKey || !metadata) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{metadata.name}</DialogTitle>
          <DialogDescription>
            {metadata.description}
            <span className="block text-xs mt-1 text-muted-foreground/70">
              {metadata.phase}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <PromptEditor
            value={editedValue}
            defaultValue={defaultValue}
            onChange={handleChange}
            onReset={handleReset}
            isCustomized={editedValue !== defaultValue}
          />
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-center gap-2 w-full justify-between">
            <div className="text-xs text-muted-foreground">
              {hasChanges && 'You have unsaved changes'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
