import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ModalType =
  | 'settings'
  | 'first-time-setup'
  | 'export'
  | 'confirmation'
  | 'new-project'
  | 'entity-edit'
  | 'field-edit'
  | 'relationship-edit'
  | 'preview-architecture'
  | null;

export interface ConfirmationConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface UIState {
  // Panel states
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;

  // Modal states
  activeModal: ModalType;
  modalData: Record<string, unknown>;
  confirmationConfig: ConfirmationConfig | null;

  // Settings modal tab
  settingsTab: string;

  // Theme
  theme: 'light' | 'dark' | 'system';

  // Selected items
  selectedFileId: string | null;
  previewContent: string | null;

  // Notifications
  notifications: Notification[];

  // Actions
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;

  openModal: (modal: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setSettingsTab: (tab: string) => void;

  showConfirmation: (config: ConfirmationConfig) => void;

  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  selectFile: (fileId: string | null) => void;
  setPreviewContent: (content: string | null) => void;

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  timestamp: Date;
  duration?: number;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      leftPanelWidth: 280,
      rightPanelWidth: 400,
      activeModal: null,
      modalData: {},
      confirmationConfig: null,
      settingsTab: 'api-keys',
      theme: 'system',
      selectedFileId: null,
      previewContent: null,
      notifications: [],

      // Actions
      toggleLeftPanel: () => {
        set(state => ({ leftPanelCollapsed: !state.leftPanelCollapsed }));
      },

      toggleRightPanel: () => {
        set(state => ({ rightPanelCollapsed: !state.rightPanelCollapsed }));
      },

      setLeftPanelCollapsed: (collapsed: boolean) => {
        set({ leftPanelCollapsed: collapsed });
      },

      setRightPanelCollapsed: (collapsed: boolean) => {
        set({ rightPanelCollapsed: collapsed });
      },

      setLeftPanelWidth: (width: number) => {
        set({ leftPanelWidth: width });
      },

      setRightPanelWidth: (width: number) => {
        set({ rightPanelWidth: width });
      },

      openModal: (modal: ModalType, data?: Record<string, unknown>) => {
        set({ activeModal: modal, modalData: data || {} });
      },

      closeModal: () => {
        set({ activeModal: null, modalData: {}, confirmationConfig: null });
      },

      setSettingsTab: (tab: string) => {
        set({ settingsTab: tab });
      },

      showConfirmation: (config: ConfirmationConfig) => {
        set({ activeModal: 'confirmation', confirmationConfig: config });
      },

      setTheme: (theme: 'light' | 'dark' | 'system') => {
        set({ theme });

        // Apply theme to document
        const root = document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.add(prefersDark ? 'dark' : 'light');
        } else {
          root.classList.add(theme);
        }
      },

      selectFile: (fileId: string | null) => {
        set({ selectedFileId: fileId });
      },

      setPreviewContent: (content: string | null) => {
        set({ previewContent: content });
      },

      addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
        const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: new Date(),
        };

        set(state => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove after duration
        const duration = notification.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, duration);
        }
      },

      removeNotification: (id: string) => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },
    }),
    {
      name: 'prd-to-tasks-ui',
      partialize: (state) => ({
        leftPanelCollapsed: state.leftPanelCollapsed,
        rightPanelCollapsed: state.rightPanelCollapsed,
        leftPanelWidth: state.leftPanelWidth,
        rightPanelWidth: state.rightPanelWidth,
        theme: state.theme,
        settingsTab: state.settingsTab,
      }),
    }
  )
);

// Initialize theme on load
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('prd-to-tasks-ui');
  if (savedTheme) {
    try {
      const { state } = JSON.parse(savedTheme);
      const theme = state?.theme || 'system';
      const root = document.documentElement;
      root.classList.remove('light', 'dark');

      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(prefersDark ? 'dark' : 'light');
      } else {
        root.classList.add(theme);
      }
    } catch {
      // Ignore parse errors
    }
  }
}
