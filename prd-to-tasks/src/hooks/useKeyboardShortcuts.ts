import { useEffect, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

const defaultShortcuts: Omit<KeyboardShortcut, 'action'>[] = [
  { key: 's', ctrl: true, description: 'Save project' },
  { key: 'o', ctrl: true, description: 'Open project' },
  { key: 'e', ctrl: true, description: 'Export tasks' },
  { key: '1', ctrl: true, description: 'Go to Phase 1 (PRD Analysis)' },
  { key: '2', ctrl: true, description: 'Go to Phase 2 (Entity Extraction)' },
  { key: '3', ctrl: true, description: 'Go to Phase 3 (ERD Builder)' },
  { key: '4', ctrl: true, description: 'Go to Phase 4 (Task Generation)' },
  { key: '[', ctrl: true, description: 'Toggle left panel' },
  { key: ']', ctrl: true, description: 'Toggle right panel' },
  { key: ',', ctrl: true, description: 'Open settings' },
  { key: '/', ctrl: true, description: 'Show keyboard shortcuts' },
  { key: 'Escape', description: 'Close modal / Cancel' },
];

export function useKeyboardShortcuts(customShortcuts?: KeyboardShortcut[]) {
  const uiStore = useUIStore();
  const projectStore = useProjectStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only allow Escape in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;

      // Check custom shortcuts first
      if (customShortcuts) {
        for (const shortcut of customShortcuts) {
          if (
            event.key.toLowerCase() === shortcut.key.toLowerCase() &&
            !!shortcut.ctrl === isCtrl &&
            !!shortcut.shift === isShift &&
            !!shortcut.alt === isAlt
          ) {
            event.preventDefault();
            shortcut.action();
            return;
          }
        }
      }

      // Built-in shortcuts
      if (isCtrl && !isShift && !isAlt) {
        switch (event.key.toLowerCase()) {
          case 's':
            event.preventDefault();
            // Trigger save (handled by useAutoSave or project actions)
            document.dispatchEvent(new CustomEvent('app:save'));
            break;

          case 'o':
            event.preventDefault();
            // Could open a file picker or project browser
            document.dispatchEvent(new CustomEvent('app:open'));
            break;

          case 'e':
            event.preventDefault();
            uiStore.openModal('export');
            break;

          case '1':
            event.preventDefault();
            projectStore.setPhase(1);
            break;

          case '2':
            event.preventDefault();
            if (projectStore.phaseStatus[2] !== 'locked') {
              projectStore.setPhase(2);
            }
            break;

          case '3':
            event.preventDefault();
            if (projectStore.phaseStatus[3] !== 'locked') {
              projectStore.setPhase(3);
            }
            break;

          case '4':
            event.preventDefault();
            if (projectStore.phaseStatus[4] !== 'locked') {
              projectStore.setPhase(4);
            }
            break;

          case '[':
            event.preventDefault();
            uiStore.setLeftPanelCollapsed(!uiStore.leftPanelCollapsed);
            break;

          case ']':
            event.preventDefault();
            uiStore.setRightPanelCollapsed(!uiStore.rightPanelCollapsed);
            break;

          case ',':
            event.preventDefault();
            uiStore.openModal('settings');
            break;

          case '/':
            event.preventDefault();
            // Show keyboard shortcuts modal or tooltip
            uiStore.addNotification({
              type: 'info',
              title: 'Keyboard Shortcuts',
              description: 'Ctrl+S: Save, Ctrl+O: Open, Ctrl+E: Export, Ctrl+1-4: Phases, Ctrl+[/]: Toggle panels, Ctrl+,: Settings',
            });
            break;
        }
      }

      // Escape key
      if (event.key === 'Escape') {
        if (uiStore.activeModal) {
          uiStore.closeModal();
        }
      }
    },
    [customShortcuts, uiStore, projectStore]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: defaultShortcuts,
  };
}

// Hook for registering a single shortcut
export function useShortcut(
  key: string,
  action: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        !!options.ctrl === isCtrl &&
        !!options.shift === isShift &&
        !!options.alt === isAlt
      ) {
        event.preventDefault();
        action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [key, action, options.ctrl, options.shift, options.alt]);
}
