
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

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
        setTheme: (theme) => set({ theme }, false, 'setTheme'),
        toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen }), false, 'toggleSidebar'),
        setModalOpen: (isOpen) => set({ isModalOpen: isOpen }, false, 'setModalOpen'),

        // Performance State
        slowThreshold: 100,
        isRecording: true,
        setSlowThreshold: (threshold) => set({ slowThreshold: threshold }, false, 'setSlowThreshold'),
        setRecording: (isRecording) => set({ isRecording }, false, 'setRecording'),

        // App State
        isInitialized: false,
        isLoading: false,
        error: null,
        setInitialized: (isInitialized) => set({ isInitialized }, false, 'setInitialized'),
        setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),
        setError: (error) => set({ error }, false, 'setError'),
      }),
      {
        name: 'root-store',
        partialize: (state) => ({
          theme: state.theme,
          slowThreshold: state.slowThreshold,
        }),
        version: 1,
      }
    )
  )
);

// Create selector hooks
export const useTheme = () => useStore((state) => state.theme);
export const useSidebar = () => useStore((state) => state.isSidebarOpen);
export const useModal = () => useStore((state) => state.isModalOpen);

// App state selectors
export const useAppState = () => ({
  isInitialized: useStore((state) => state.isInitialized),
  isLoading: useStore((state) => state.isLoading),
  error: useStore((state) => state.error),
});

// Performance state selectors
export const usePerformanceState = () => ({
  slowThreshold: useStore((state) => state.slowThreshold),
  isRecording: useStore((state) => state.isRecording),
});

// Action selectors
export const useUIActions = () => ({
  setTheme: useStore((state) => state.setTheme),
  toggleSidebar: useStore((state) => state.toggleSidebar),
  setModalOpen: useStore((state) => state.setModalOpen),
});

export const useAppActions = () => ({
  setInitialized: useStore((state) => state.setInitialized),
  setLoading: useStore((state) => state.setLoading),
  setError: useStore((state) => state.setError),
});

export const usePerformanceActions = () => ({
  setSlowThreshold: useStore((state) => state.setSlowThreshold),
  setRecording: useStore((state) => state.setRecording),
});
