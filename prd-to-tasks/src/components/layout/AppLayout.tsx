import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { Header } from './Header';
import { ThreeColumnLayout } from './ThreeColumnLayout';
import { LeftPanel } from '@/components/panels/left/LeftPanel';
import { MiddlePanel } from '@/components/panels/middle/MiddlePanel';
import { RightPanel } from '@/components/panels/right/RightPanel';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { FirstTimeSetupModal } from '@/components/modals/FirstTimeSetupModal';
import { ExportModal } from '@/components/modals/ExportModal';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { ArchitecturePreviewModal } from '@/components/modals/ArchitecturePreviewModal';
import { useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';
import { hasEnvApiKeys } from '@/lib/env-config';

export function AppLayout() {
  const hasValidApiKey = useSettingsStore((s) => s.hasValidApiKey());
  const initializeFromEnv = useSettingsStore((s) => s.initializeFromEnv);
  const activeModal = useUIStore((s) => s.activeModal);
  const hasShownSetupModal = useRef(false);
  const [envInitialized, setEnvInitialized] = useState(false);

  // Initialize API keys from environment variables on startup
  useEffect(() => {
    initializeFromEnv();
    setEnvInitialized(true);
  }, [initializeFromEnv]);

  // Show first-time setup modal if no API keys configured (only once on initial load)
  // Wait for env initialization to complete before checking
  useEffect(() => {
    if (!envInitialized) return;

    // Check both store keys and env keys
    const hasEnvKeys = hasEnvApiKeys();

    if (!hasValidApiKey && !hasEnvKeys && !hasShownSetupModal.current) {
      hasShownSetupModal.current = true;
      useUIStore.getState().openModal('first-time-setup');
    }
  }, [envInitialized, hasValidApiKey]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <ThreeColumnLayout
        leftPanel={<LeftPanel />}
        middlePanel={<MiddlePanel />}
        rightPanel={<RightPanel />}
      />

      {/* Modals */}
      <SettingsModal
        open={activeModal === 'settings'}
        onClose={() => useUIStore.getState().closeModal()}
      />
      <FirstTimeSetupModal
        open={activeModal === 'first-time-setup'}
        onClose={() => useUIStore.getState().closeModal()}
      />
      <ExportModal
        open={activeModal === 'export'}
        onClose={() => useUIStore.getState().closeModal()}
      />
      <ConfirmationModal
        open={activeModal === 'confirmation'}
        onClose={() => useUIStore.getState().closeModal()}
      />

      <ArchitecturePreviewModal
        open={activeModal === 'preview-architecture'}
        onClose={() => useUIStore.getState().closeModal()}
      />

      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}
