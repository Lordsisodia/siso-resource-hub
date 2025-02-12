import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createSelectors } from '@/utils/store-utils';

export interface Theme {
  mode: 'light' | 'dark' | 'system';
  accent: string;
  radius: number;
}

interface UIState {
  theme: Theme;
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  isSettingsOpen: boolean;
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
  }>;
  breadcrumbs: Array<{
    label: string;
    path: string;
  }>;
  // Actions
  setTheme: (theme: Partial<Theme>) => void;
  toggleSidebar: () => void;
  toggleSearch: () => void;
  toggleSettings: () => void;
  addToast: (toast: Omit<UIState['toasts'][0], 'id'>) => void;
  removeToast: (id: string) => void;
  setBreadcrumbs: (breadcrumbs: UIState['breadcrumbs']) => void;
  reset: () => void;
}

const initialState = {
  theme: {
    mode: 'system',
    accent: 'zinc',
    radius: 0.5
  } as Theme,
  isSidebarOpen: true,
  isSearchOpen: false,
  isSettingsOpen: false,
  toasts: [],
  breadcrumbs: []
};

export const useUIStore = createSelectors(
  create<UIState>()(
    persist(
      (set, get) => ({
        ...initialState,

        setTheme: (theme) =>
          set((state) => ({
            theme: { ...state.theme, ...theme }
          })),

        toggleSidebar: () =>
          set((state) => ({
            isSidebarOpen: !state.isSidebarOpen
          })),

        toggleSearch: () =>
          set((state) => ({
            isSearchOpen: !state.isSearchOpen
          })),

        toggleSettings: () =>
          set((state) => ({
            isSettingsOpen: !state.isSettingsOpen
          })),

        addToast: (toast) =>
          set((state) => ({
            toasts: [
              ...state.toasts,
              {
                id: Math.random().toString(36).substring(7),
                ...toast
              }
            ]
          })),

        removeToast: (id) =>
          set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id)
          })),

        setBreadcrumbs: (breadcrumbs) =>
          set(() => ({
            breadcrumbs
          })),

        reset: () => set(initialState)
      }),
      {
        name: 'ui-store',
        partialize: (state) => ({
          theme: state.theme,
          isSidebarOpen: state.isSidebarOpen
        })
      }
    )
  )
); 