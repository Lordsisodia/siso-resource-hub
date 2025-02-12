import { performanceMonitor } from '@/services/optimized-performance-monitor';

// Performance metric types
export type MetricType = 'render' | 'event' | 'query' | 'error' | 'memory';

export interface PerformanceMetric {
  id: string;
  type: MetricType;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface MemorySnapshot {
  timestamp: number;
  usage: number;
  heapSize: number;
  heapLimit: number;
}

interface PerformanceOptions {
  shouldLog?: boolean;
  metadata?: Record<string, any>;
}

// Custom profiler callback type
type ProfilerCallback = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
  interactions: Set<{ id: number; name: string; timestamp: number }>
) => void;

// Singleton performance store
class PerformanceStore {
  private static instance: PerformanceStore;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;
  private isEnabled: boolean = true;
  private memorySnapshots: MemorySnapshot[] = [];
  private readonly MEMORY_SNAPSHOT_INTERVAL = 60000; // 1 minute
  private memoryInterval?: NodeJS.Timeout;
  private readonly MAX_MEMORY_SNAPSHOTS = 60; // Keep 1 hour of snapshots
  private readonly MEMORY_LEAK_THRESHOLD = 20; // 20% increase threshold
  private metricsCache: Map<string, { value: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    if (typeof window !== 'undefined') {
      this.startMemoryTracking();
      this.setupPerformanceObserver();
    }
  }

  private setupPerformanceObserver() {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.addMetric({
            id: entry.name,
            type: this.getMetricTypeFromEntry(entry),
            duration: entry.duration || (entry.startTime && performance.now() - entry.startTime) || 0,
            metadata: {
              entryType: entry.entryType,
              ...entry.toJSON()
            }
          });
        });
      });

      observer.observe({ 
        entryTypes: ['resource', 'paint', 'largest-contentful-paint', 'layout-shift'] 
      });
    }
  }

  private getMetricTypeFromEntry(entry: PerformanceEntry): MetricType {
    switch (entry.entryType) {
      case 'resource':
        return 'event';
      case 'paint':
      case 'layout-shift':
        return 'render';
      default:
        return 'event';
    }
  }

  private getCachedMetric(key: string): number | null {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }
    return null;
  }

  private setCachedMetric(key: string, value: number) {
    this.metricsCache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  private startMemoryTracking() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }

    this.memoryInterval = setInterval(() => {
      if (!this.isEnabled) return;
      
      const memory = (performance as any).memory;
      if (memory) {
        const snapshot: MemorySnapshot = {
          timestamp: Date.now(),
          usage: memory.usedJSHeapSize,
          heapSize: memory.totalJSHeapSize,
          heapLimit: memory.jsHeapSizeLimit,
        };

        this.memorySnapshots.push(snapshot);
        this.pruneMemorySnapshots();
        this.checkMemoryLeaks(snapshot);
      }
    }, this.MEMORY_SNAPSHOT_INTERVAL);
  }

  private pruneMemorySnapshots() {
    if (this.memorySnapshots.length > this.MAX_MEMORY_SNAPSHOTS) {
      this.memorySnapshots = this.memorySnapshots.slice(-this.MAX_MEMORY_SNAPSHOTS);
    }
  }

  private checkMemoryLeaks(currentSnapshot: MemorySnapshot) {
    if (this.memorySnapshots.length < 2) return;

    const previousSnapshot = this.memorySnapshots[this.memorySnapshots.length - 2];
    const usageIncrease = currentSnapshot.usage - previousSnapshot.usage;
    const usageIncreasePercent = (usageIncrease / previousSnapshot.usage) * 100;

    if (usageIncreasePercent > this.MEMORY_LEAK_THRESHOLD) {
      const heapUsagePercent = (currentSnapshot.usage / currentSnapshot.heapLimit) * 100;
      
      console.warn(
        `[Performance] Memory usage increased by ${usageIncreasePercent.toFixed(2)}% in the last minute`,
        {
          previous: Math.round(previousSnapshot.usage / 1024 / 1024) + 'MB',
          current: Math.round(currentSnapshot.usage / 1024 / 1024) + 'MB',
          increase: Math.round(usageIncrease / 1024 / 1024) + 'MB',
          heapUsage: `${heapUsagePercent.toFixed(1)}%`,
          timestamp: new Date(currentSnapshot.timestamp).toISOString(),
        }
      );
    }
  }

  addMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const memory = (performance as any).memory;
    
    const newMetric: PerformanceMetric = {
      ...metric,
      timestamp,
      metadata: {
        ...metric.metadata,
        memory: memory ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          heapUsagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        } : undefined,
      },
    };

    this.metrics.push(newMetric);
    this.pruneMetrics();
    this.analyzeMetric(newMetric);
  }

  private analyzeMetric(metric: PerformanceMetric) {
    const recentMetrics = this.getMetrics({
      type: metric.type,
      timeRange: {
        start: Date.now() - 5 * 60 * 1000, // Last 5 minutes
        end: Date.now(),
      },
    });
    
    if (recentMetrics.length > 0) {
      const average = this.calculateAverageMetric(recentMetrics);
      const percentile95 = this.calculatePercentileMetric(recentMetrics, 95);
      
      if (metric.duration > percentile95 * 1.5) {
        console.warn(
          `[Performance] ${metric.id} took ${metric.duration}ms (${(metric.duration / average).toFixed(1)}x average, ${(metric.duration / percentile95).toFixed(1)}x p95)`,
          {
            type: metric.type,
            average: Math.round(average) + 'ms',
            p95: Math.round(percentile95) + 'ms',
            current: Math.round(metric.duration) + 'ms',
            metadata: metric.metadata,
          }
        );
      }
    }
  }

  private calculateAverageMetric(metrics: PerformanceMetric[]): number {
    return metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
  }

  private calculatePercentileMetric(metrics: PerformanceMetric[], percentile: number): number {
    const sorted = metrics.map(m => m.duration).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private pruneMetrics() {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    this.metrics = this.metrics
      .filter(metric => now - metric.timestamp < ONE_HOUR)
      .slice(-this.maxMetrics);
  }

  getMetrics(options?: {
    type?: MetricType;
    timeRange?: { start: number; end: number };
    component?: string;
  }) {
    let filteredMetrics = [...this.metrics];

    if (options?.type) {
      filteredMetrics = filteredMetrics.filter(m => m.type === options.type);
    }

    if (options?.timeRange) {
      filteredMetrics = filteredMetrics.filter(
        m => m.timestamp >= options.timeRange!.start && m.timestamp <= options.timeRange!.end
      );
    }

    if (options?.component) {
      filteredMetrics = filteredMetrics.filter(m => m.id.startsWith(options.component!));
    }

    return filteredMetrics;
  }

  getMemoryTrend(timeRange?: { start: number; end: number }) {
    let snapshots = [...this.memorySnapshots];

    if (timeRange) {
      snapshots = snapshots.filter(
        s => s.timestamp >= timeRange.start && s.timestamp <= timeRange.end
      );
    }

    return snapshots.map(({ timestamp, usage, heapSize, heapLimit }) => ({
      timestamp,
      usage: Math.round(usage / 1024 / 1024), // Convert to MB
      heapSize: Math.round(heapSize / 1024 / 1024),
      heapLimit: Math.round(heapLimit / 1024 / 1024),
      usagePercent: (usage / heapLimit) * 100,
    }));
  }

  getAverageMetric(
    typeOrOptions: MetricType | {
      type: MetricType;
      timeRange?: { start: number; end: number };
      component?: string;
    }
  ) {
    const options = typeof typeOrOptions === 'string'
      ? { type: typeOrOptions }
      : typeOrOptions;

    const metrics = this.getMetrics(options);
    if (metrics.length === 0) return 0;

    return this.calculateAverageMetric(metrics);
  }

  getSlowMetrics(threshold: number, options?: {
    type?: MetricType;
    timeRange?: { start: number; end: number };
    component?: string;
  }) {
    const metrics = this.getMetrics(options);
    return metrics.filter(m => m.duration > threshold);
  }

  clearMetrics() {
    this.metrics = [];
    this.memorySnapshots = [];
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;

    if (!enabled && this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = undefined;
    } else if (enabled && !this.memoryInterval && typeof window !== 'undefined') {
      this.startMemoryTracking();
    }
  }

  dispose() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    this.metrics = [];
    this.memorySnapshots = [];
    this.metricsCache.clear();
    this.isEnabled = false;
  }

  static getInstance(): PerformanceStore {
    if (!PerformanceStore.instance) {
      PerformanceStore.instance = new PerformanceStore();
    }
    return PerformanceStore.instance;
  }
}

// Performance measurement utilities
export async function measureExecutionTime<T>(
  fn: () => Promise<T> | T,
  id: string,
  type: 'render' | 'event' | 'query' | 'error' | 'memory',
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;

    performanceMonitor.addMetric({
      id,
      type,
      duration,
      metadata: {
        success: true,
        ...metadata
      }
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    performanceMonitor.addMetric({
      id,
      type: 'error',
      duration,
      metadata: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...metadata
      }
    });

    throw error;
  }
}

// React component performance tracking
export const logPerformance: ProfilerCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
  interactions
) => {
  performanceMonitor.addMetric({
    id,
    type: 'render',
    duration: actualDuration,
    timestamp: Date.now(),
    metadata: {
      phase,
      baseDuration,
      startTime,
      commitTime,
      interactionCount: interactions.size,
    },
  });
};

// Performance profiler component
export interface PerformanceProfilerProps {
  id: string;
  children: React.ReactNode;
}

export const PerformanceProfiler = React.memo<PerformanceProfilerProps>(({ id, children }) => (
  <Profiler id={id} onRender={logPerformance}>
    {children}
  </Profiler>
));

PerformanceProfiler.displayName = 'PerformanceProfiler';

// Export singleton instance methods
export const getPerformanceMetrics = () => PerformanceStore.getInstance().getMetrics();
export const clearPerformanceMetrics = () => PerformanceStore.getInstance().clearMetrics();
export const setPerformanceEnabled = (enabled: boolean) => PerformanceStore.getInstance().setEnabled(enabled);
export const getSlowMetrics = (threshold: number) => PerformanceStore.getInstance().getSlowMetrics(threshold);

// Utility functions
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      fn(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => ReturnType<T> {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;

  return function executedFunction(...args: Parameters<T>): ReturnType<T> {
    if (!inThrottle) {
      lastResult = fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  };
}

export function memoizeWithTTL<T extends (...args: any[]) => any>(
  fn: T,
  ttl: number = 1000 * 60 // 1 minute default
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  return function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < ttl) {
      return cached.value;
    }

    const result = fn(...args);
    cache.set(key, { value: result, timestamp: now });

    // Clean up expired entries
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp >= ttl) {
        cache.delete(key);
      }
    }

    return result;
  } as T;
}

export function measureMemoryUsage(): {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
} {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const { heapUsed, heapTotal, external, arrayBuffers } = process.memoryUsage();
    return { heapUsed, heapTotal, external, arrayBuffers };
  }

  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    return {
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
      external: 0,
      arrayBuffers: 0
    };
  }

  return {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    arrayBuffers: 0
  };
} 