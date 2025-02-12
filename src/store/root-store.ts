import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { measureExecutionTime } from '@/utils/performance';

// Define store slices
interface UIState {
  theme: 'light' | 'dark';
  isSidebarOpen: boolean;
  isModalOpen: boolean;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setModalOpen: (isOpen: boolean) => void;
}

interface PerformanceState {
  slowThreshold: number;
  isRecording: boolean;
  setSlowThreshold: (threshold: number) => void;
  setRecording: (isRecording: boolean) => void;
}

interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  setInitialized: (isInitialized: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

// Combined store type
interface RootStore extends UIState, PerformanceState, AppState {}

// Create store with middleware
export const useStore = create<RootStore>()(
  devtools(
    persist(
      (set, get) => ({
        // UI State
        theme: 'dark',
        isSidebarOpen: false,
        isModalOpen: false,
        setTheme: async (theme) => {
          await measureExecutionTime(
            async () => set({ theme }),
            'set-theme',
            'event',
            { metadata: { theme } }
          );
        },
        toggleSidebar: () => {
          measureExecutionTime(
            () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
            'toggle-sidebar',
            'event'
          );
        },
        setModalOpen: (isOpen) => {
          measureExecutionTime(
            () => set({ isModalOpen: isOpen }),
            'set-modal-open',
            'event',
            { metadata: { isOpen } }
          );
        },

        // Performance State
        slowThreshold: 100,
        isRecording: true,
        setSlowThreshold: (threshold) => {
          set({ slowThreshold: threshold });
        },
        setRecording: (isRecording) => {
          set({ isRecording });
        },

        // App State
        isInitialized: false,
        isLoading: false,
        error: null,
        setInitialized: (isInitialized) => {
          measureExecutionTime(
            () => set({ isInitialized }),
            'set-initialized',
            'event',
            { metadata: { isInitialized } }
          );
        },
        setLoading: (isLoading) => {
          measureExecutionTime(
            () => set({ isLoading }),
            'set-loading',
            'event',
            { metadata: { isLoading } }
          );
        },
        setError: (error) => {
          measureExecutionTime(
            () => set({ error }),
            'set-error',
            'event',
            { metadata: { error } }
          );
        },
      }),
      {
        name: 'root-store',
        partialize: (state) => ({
          theme: state.theme,
          slowThreshold: state.slowThreshold,
        }),
      }
    )
  )
);

// Selector hooks for better performance
export const useTheme = () => useStore(state => state.theme);
export const useSidebar = () => useStore(state => state.isSidebarOpen);
export const useModal = () => useStore(state => state.isModalOpen);
export const useAppState = () => useStore(state => ({
  isInitialized: state.isInitialized,
  isLoading: state.isLoading,
  error: state.error,
}));
export const usePerformanceState = () => useStore(state => ({
  slowThreshold: state.slowThreshold,
  isRecording: state.isRecording,
}));

// Action hooks
export const useUIActions = () => useStore(state => ({
  setTheme: state.setTheme,
  toggleSidebar: state.toggleSidebar,
  setModalOpen: state.setModalOpen,
}));
export const useAppActions = () => useStore(state => ({
  setInitialized: state.setInitialized,
  setLoading: state.setLoading,
  setError: state.setError,
}));
export const usePerformanceActions = () => useStore(state => ({
  setSlowThreshold: state.setSlowThreshold,
  setRecording: state.setRecording,
})); 