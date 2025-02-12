import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceMonitor } from './performance-monitor';
import { GLOBAL_BUDGETS, COMPONENT_BUDGETS } from '@/config/performance-budgets';
import { MetricType } from '@/utils/performance';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.dispose();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Memory Tracking', () => {
    it('should collect memory snapshots at regular intervals', () => {
      const mockMemory = {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
      };

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      });

      // Advance time by 2 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);

      const trend = performanceMonitor.getMemoryTrend();
      expect(trend.length).toBe(2);
      expect(trend[0].usage).toBe(mockMemory.usedJSHeapSize);
    });

    it('should detect memory leaks', () => {
      const listener = vi.fn();
      performanceMonitor.subscribe(listener);

      const mockMemory = {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
      };

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      });

      // First snapshot
      vi.advanceTimersByTime(60 * 1000);

      // Simulate memory increase
      mockMemory.usedJSHeapSize = 1300000; // 30% increase
      vi.advanceTimersByTime(60 * 1000);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'event',
          severity: 'warning'
        })
      );
    });

    it('should limit memory snapshots to maximum count', () => {
      const mockMemory = {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
      };

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true
      });

      // Advance time by 61 minutes (more than max snapshots)
      vi.advanceTimersByTime(61 * 60 * 1000);

      const trend = performanceMonitor.getMemoryTrend();
      expect(trend.length).toBe(60); // MAX_MEMORY_SNAPSHOTS
    });
  });

  describe('Metric Management', () => {
    it('should track metrics and detect violations', () => {
      const metric = {
        id: 'Auth-render',
        type: 'render' as MetricType,
        duration: COMPONENT_BUDGETS['Auth'].error + 10,
        timestamp: Date.now(),
      };

      performanceMonitor.addMetric(metric);

      const slowMetrics = performanceMonitor.getSlowMetrics(COMPONENT_BUDGETS['Auth'].warning);
      expect(slowMetrics).toHaveLength(1);
      expect(slowMetrics[0].id).toBe('Auth-render');
    });

    it('should calculate moving averages correctly', () => {
      const metrics = Array.from({ length: 15 }, (_, i) => ({
        id: 'test-query',
        type: 'query' as MetricType,
        duration: 100 + i * 10,
        timestamp: Date.now() + i * 1000,
      }));

      metrics.forEach(metric => performanceMonitor.addMetric(metric));

      const average = performanceMonitor.getAverageMetric('query');
      expect(average).toBeGreaterThan(0);
    });

    it('should prune old metrics', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Add old metric
      performanceMonitor.addMetric({
        id: 'old-metric',
        type: 'render' as MetricType,
        duration: 100,
        timestamp: now - (61 * 60 * 1000), // 61 minutes ago
      });

      // Add recent metric
      performanceMonitor.addMetric({
        id: 'recent-metric',
        type: 'render' as MetricType,
        duration: 100,
        timestamp: now,
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].id).toBe('recent-metric');
    });
  });

  describe('Filtering and Analysis', () => {
    it('should filter metrics by type and component', () => {
      const metrics = [
        { id: 'Auth-render', type: 'render' as MetricType, duration: 100, timestamp: Date.now() },
        { id: 'Profile-query', type: 'query' as MetricType, duration: 200, timestamp: Date.now() },
        { id: 'Auth-query', type: 'query' as MetricType, duration: 300, timestamp: Date.now() },
      ];

      metrics.forEach(metric => performanceMonitor.addMetric(metric));

      const authMetrics = performanceMonitor.getMetrics({ component: 'Auth' });
      expect(authMetrics).toHaveLength(2);

      const queryMetrics = performanceMonitor.getMetrics({ type: 'query' });
      expect(queryMetrics).toHaveLength(2);
    });

    it('should filter metrics by time range', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const metrics = [
        { id: 'test-1', type: 'render' as MetricType, duration: 100, timestamp: now - 5000 },
        { id: 'test-2', type: 'render' as MetricType, duration: 200, timestamp: now - 3000 },
        { id: 'test-3', type: 'render' as MetricType, duration: 300, timestamp: now - 1000 },
      ];

      metrics.forEach(metric => performanceMonitor.addMetric(metric));

      const filteredMetrics = performanceMonitor.getMetrics({
        timeRange: {
          start: now - 4000,
          end: now - 2000,
        },
      });

      expect(filteredMetrics).toHaveLength(1);
      expect(filteredMetrics[0].id).toBe('test-2');
    });
  });

  describe('Event Handling', () => {
    it('should notify listeners of violations', () => {
      const listener = vi.fn();
      const unsubscribe = performanceMonitor.subscribe(listener);

      performanceMonitor.addMetric({
        id: 'slow-render',
        type: 'render' as MetricType,
        duration: GLOBAL_BUDGETS.render.error + 10,
        timestamp: Date.now(),
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'render',
          severity: 'error',
        })
      );

      unsubscribe();
    });

    it('should handle unsubscribe correctly', () => {
      const listener = vi.fn();
      const unsubscribe = performanceMonitor.subscribe(listener);

      unsubscribe();

      performanceMonitor.addMetric({
        id: 'test-render',
        type: 'render' as MetricType,
        duration: GLOBAL_BUDGETS.render.error + 10,
        timestamp: Date.now(),
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on dispose', () => {
      const listener = vi.fn();
      performanceMonitor.subscribe(listener);

      performanceMonitor.dispose();

      // Add metric after dispose
      performanceMonitor.addMetric({
        id: 'test',
        type: 'render' as MetricType,
        duration: 100,
        timestamp: Date.now(),
      });

      expect(listener).not.toHaveBeenCalled();
      expect(performanceMonitor.getMetrics()).toHaveLength(0);
      expect(performanceMonitor.getMemoryTrend()).toHaveLength(0);
    });
  });
}); 