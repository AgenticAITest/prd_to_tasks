import { useEffect } from 'react';
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
import { useSettingsStore } from '@/store/settingsStore';
import { useUIStore } from '@/store/uiStore';

export function AppLayout() {
  const hasValidApiKey = useSettingsStore((s) => s.hasValidApiKey());
  const initializeFromEnv = useSettingsStore((s) => s.initializeFromEnv);
  const { activeModal, openModal } = useUIStore();

  // Initialize API keys from environment variables on startup
  useEffect(() => {
    initializeFromEnv();
  }, [initializeFromEnv]);

  // Show first-time setup modal if no API keys configured
  useEffect(() => {
    if (!hasValidApiKey) {
      openModal('first-time-setup');
    }
  }, [hasValidApiKey, openModal]);

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

      {/* Toast notifications */}
      <Toaster position="top-right" richColors />
    </div>
  );
}
