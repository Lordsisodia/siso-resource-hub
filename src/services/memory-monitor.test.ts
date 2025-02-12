import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { memoryMonitor } from './memory-monitor';
import { performanceMonitor } from './performance-monitor';
import type { PerformanceMetric } from './performance-monitor';

// Mock performance.memory
const mockMemory = {
  jsHeapSizeLimit: 2172649472,
  totalJSHeapSize: 50000000,
  usedJSHeapSize: 25000000
};

// Mock performance monitor
vi.mock('./performance-monitor', () => ({
  performanceMonitor: {
    addMetric: vi.fn(),
    getMetrics: vi.fn(() => [])
  }
}));

describe('MemoryMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window.performance, 'memory', {
      value: mockMemory,
      configurable: true
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    memoryMonitor.dispose();
  });

  describe('Snapshot Management', () => {
    it('should take memory snapshots at regular intervals', () => {
      const snapshots = memoryMonitor.getSnapshots();
      expect(snapshots.length).toBe(1); // Initial snapshot

      vi.advanceTimersByTime(10000); // 10 seconds
      const newSnapshots = memoryMonitor.getSnapshots();
      expect(newSnapshots.length).toBe(2);
    });

    it('should prune old snapshots when limit is reached', () => {
      // Advance time to create many snapshots
      for (let i = 0; i < 400; i++) {
        vi.advanceTimersByTime(10000);
      }

      const snapshots = memoryMonitor.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(360); // MAX_SNAPSHOTS
    });

    it('should filter snapshots by time range', () => {
      const now = Date.now();
      const timeRange = {
        start: now - 30000,
        end: now
      };

      vi.advanceTimersByTime(50000); // Create multiple snapshots
      const filteredSnapshots = memoryMonitor.getSnapshots(timeRange);
      
      filteredSnapshots.forEach(snapshot => {
        expect(snapshot.timestamp).toBeGreaterThanOrEqual(timeRange.start);
        expect(snapshot.timestamp).toBeLessThanOrEqual(timeRange.end);
      });
    });
  });

  describe('Leak Detection', () => {
    it('should detect memory leaks when usage increases significantly', () => {
      const listener = vi.fn();
      memoryMonitor.onMemoryLeak(listener);

      // Simulate increasing memory usage
      Object.defineProperty(window.performance, 'memory', {
        value: {
          ...mockMemory,
          usedJSHeapSize: mockMemory.usedJSHeapSize * 1.3 // 30% increase
        }
      });

      vi.advanceTimersByTime(10000);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          usageIncrease: expect.any(Number)
        })
      );
    });

    it('should identify suspicious components in leak reports', () => {
      const listener = vi.fn();
      memoryMonitor.onMemoryLeak(listener);

      // Mock performance metrics with suspicious component
      vi.mocked(performanceMonitor.getMetrics).mockReturnValue([{
        id: 'LeakyComponent-render',
        type: 'render',
        duration: 100,
        timestamp: Date.now(),
        metadata: { component: 'LeakyComponent' }
      } as PerformanceMetric]);

      // Simulate memory leak
      Object.defineProperty(window.performance, 'memory', {
        value: {
          ...mockMemory,
          usedJSHeapSize: mockMemory.usedJSHeapSize * 1.3
        }
      });

      vi.advanceTimersByTime(10000);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'LeakyComponent'
        })
      );
    });
  });

  describe('Performance Integration', () => {
    it('should track memory metrics in performance monitor', () => {
      vi.advanceTimersByTime(10000);
      expect(performanceMonitor.addMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'memory-usage',
          type: 'memory',
          duration: expect.any(Number),
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Cleanup', () => {
    it('should properly clean up resources on dispose', () => {
      const listener = vi.fn();
      memoryMonitor.onMemoryLeak(listener);
      
      memoryMonitor.dispose();
      
      // Verify cleanup
      vi.advanceTimersByTime(10000);
      expect(listener).not.toHaveBeenCalled();
      
      // Verify snapshots are cleared
      expect(memoryMonitor.getSnapshots()).toHaveLength(0);
    });
  });
}); 