import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from './root-store';
import { resetStore } from '@/test/utils';

describe('Root Store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('UI State', () => {
    it('should initialize with default values', () => {
      const state = useStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.isSidebarOpen).toBe(false);
      expect(state.isModalOpen).toBe(false);
    });

    it('should update theme', async () => {
      const { setTheme } = useStore.getState();
      await setTheme('light');
      expect(useStore.getState().theme).toBe('light');
    });

    it('should toggle sidebar', () => {
      const { toggleSidebar } = useStore.getState();
      toggleSidebar();
      expect(useStore.getState().isSidebarOpen).toBe(true);
      toggleSidebar();
      expect(useStore.getState().isSidebarOpen).toBe(false);
    });

    it('should update modal state', () => {
      const { setModalOpen } = useStore.getState();
      setModalOpen(true);
      expect(useStore.getState().isModalOpen).toBe(true);
    });
  });

  describe('Performance State', () => {
    it('should initialize with default values', () => {
      const state = useStore.getState();
      expect(state.slowThreshold).toBe(100);
      expect(state.isRecording).toBe(true);
    });

    it('should update slow threshold', () => {
      const { setSlowThreshold } = useStore.getState();
      setSlowThreshold(200);
      expect(useStore.getState().slowThreshold).toBe(200);
    });

    it('should update recording state', () => {
      const { setRecording } = useStore.getState();
      setRecording(false);
      expect(useStore.getState().isRecording).toBe(false);
    });
  });

  describe('App State', () => {
    it('should initialize with default values', () => {
      const state = useStore.getState();
      expect(state.isInitialized).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should update initialization state', () => {
      const { setInitialized } = useStore.getState();
      setInitialized(true);
      expect(useStore.getState().isInitialized).toBe(true);
    });

    it('should update loading state', () => {
      const { setLoading } = useStore.getState();
      setLoading(true);
      expect(useStore.getState().isLoading).toBe(true);
    });

    it('should update error state', () => {
      const { setError } = useStore.getState();
      const errorMessage = 'Test error';
      setError(errorMessage);
      expect(useStore.getState().error).toBe(errorMessage);
    });
  });
}); 