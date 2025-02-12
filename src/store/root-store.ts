
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
      (set) => ({
        // UI State - with memoized setters to prevent infinite loops
        theme: 'dark',
        isSidebarOpen: false,
        isModalOpen: false,
        setTheme: (theme) => {
          console.log('Setting theme:', theme);
          set(() => ({ theme }), false, 'setTheme');
        },
        toggleSidebar: () => {
          set(
            (state) => ({ isSidebarOpen: !state.isSidebarOpen }),
            false,
            'toggleSidebar'
          );
        },
        setModalOpen: (isOpen) => {
          set(() => ({ isModalOpen: isOpen }), false, 'setModalOpen');
        },

        // Performance State
        slowThreshold: 100,
        isRecording: true,
        setSlowThreshold: (threshold) => {
          set(() => ({ slowThreshold: threshold }), false, 'setSlowThreshold');
        },
        setRecording: (isRecording) => {
          set(() => ({ isRecording }), false, 'setRecording');
        },

        // App State
        isInitialized: false,
        isLoading: false,
        error: null,
        setInitialized: (isInitialized) => {
          set(() => ({ isInitialized }), false, 'setInitialized');
        },
        setLoading: (isLoading) => {
          set(() => ({ isLoading }), false, 'setLoading');
        },
        setError: (error) => {
          set(() => ({ error }), false, 'setError');
        },
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

// Selector hooks with memoization to prevent unnecessary updates
export const useTheme = () => useStore((state) => state.theme);
export const useSidebar = () => useStore((state) => state.isSidebarOpen);
export const useModal = () => useStore((state) => state.isModalOpen);

// Memoized selectors for app state
export const useAppState = () => 
  useStore((state) => ({
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    error: state.error,
  }));

// Memoized selectors for performance state
export const usePerformanceState = () => 
  useStore((state) => ({
    slowThreshold: state.slowThreshold,
    isRecording: state.isRecording,
  }));

// Action hooks with stable references
export const useUIActions = () => 
  useStore((state) => ({
    setTheme: state.setTheme,
    toggleSidebar: state.toggleSidebar,
    setModalOpen: state.setModalOpen,
  }));

export const useAppActions = () => 
  useStore((state) => ({
    setInitialized: state.setInitialized,
    setLoading: state.setLoading,
    setError: state.setError,
  }));

export const usePerformanceActions = () => 
  useStore((state) => ({
    setSlowThreshold: state.setSlowThreshold,
    setRecording: state.setRecording,
  }));
