import { MetricType, PerformanceMetric } from '@/utils/performance';
import {
  checkPerformanceBudget,
  aggregateMetrics,
  COMPONENT_BUDGETS,
} from '@/config/performance-budgets';

interface PerformanceViolation {
  type: MetricType;
  component?: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'error';
  timestamp: number;
}

interface MemorySnapshot {
  timestamp: number;
  usage: number;
  heapSize: number;
  heapLimit: number;
}

export interface PerformanceMetric {
  id: string;
  type: MetricType;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface MetricListener {
  (metric: PerformanceMetric): void;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private violations: PerformanceViolation[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private listeners: Set<MetricListener> = new Set();
  private readonly MEMORY_SNAPSHOT_INTERVAL = 60000; // 1 minute
  private memoryInterval?: NodeJS.Timeout;
  private readonly MAX_MEMORY_SNAPSHOTS = 60; // Keep 1 hour of snapshots
  private readonly MEMORY_LEAK_THRESHOLD = 20; // 20% increase threshold
  private maxMetrics: number = 1000;

  private constructor() {
    this.startMemoryTracking();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private startMemoryTracking(): void {
    // Clear existing interval if any
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }

    this.memoryInterval = setInterval(() => {
      if (performance.memory) {
        const snapshot: MemorySnapshot = {
          timestamp: Date.now(),
          usage: performance.memory.usedJSHeapSize,
          heapSize: performance.memory.totalJSHeapSize,
          heapLimit: performance.memory.jsHeapSizeLimit,
        };

        this.memorySnapshots.push(snapshot);
        this.pruneMemorySnapshots();
        this.checkMemoryLeaks(snapshot);
      }
    }, this.MEMORY_SNAPSHOT_INTERVAL);
  }

  private pruneMemorySnapshots(): void {
    if (this.memorySnapshots.length > this.MAX_MEMORY_SNAPSHOTS) {
      this.memorySnapshots = this.memorySnapshots.slice(-this.MAX_MEMORY_SNAPSHOTS);
    }
  }

  private checkMemoryLeaks(currentSnapshot: MemorySnapshot): void {
    if (this.memorySnapshots.length < 2) return;

    const previousSnapshot = this.memorySnapshots[this.memorySnapshots.length - 2];
    const memoryIncrease = ((currentSnapshot.usage - previousSnapshot.usage) / previousSnapshot.usage) * 100;

    if (memoryIncrease > this.MEMORY_LEAK_THRESHOLD) {
      this.reportViolation({
        type: 'event',
        value: currentSnapshot.usage,
        threshold: previousSnapshot.usage * (1 + this.MEMORY_LEAK_THRESHOLD / 100),
        severity: 'warning',
        timestamp: currentSnapshot.timestamp,
      });
    }
  }

  addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    this.listeners.forEach(listener => listener(metric));

    // Prune old metrics if we exceed maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.analyzeMetric(metric);
    this.pruneMetrics();
  }

  private analyzeMetric(metric: PerformanceMetric): void {
    const { id, type, duration, timestamp } = metric;
    const componentName = id.split('-')[0];

    // Calculate moving average for this metric type
    const recentMetrics = this.metrics
      .filter(m => m.type === type)
      .slice(-10)
      .map(m => m.duration);
    
    const average = recentMetrics.reduce((sum, val) => sum + val, 0) / recentMetrics.length;

    // Calculate 95th percentile
    const sorted = [...recentMetrics].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    // Check component-specific budget
    if (COMPONENT_BUDGETS[componentName]) {
      const result = checkPerformanceBudget(type, duration, componentName);
      if (result.isError || result.isWarning) {
        this.reportViolation({
          type,
          component: componentName,
          value: duration,
          threshold: result.isError ? result.budget.error : result.budget.warning,
          severity: result.isError ? 'error' : 'warning',
          timestamp,
        });
      }
    }

    // Check global budget
    const result = checkPerformanceBudget(type, duration);
    if (result.isError || result.isWarning) {
      this.reportViolation({
        type,
        value: duration,
        threshold: result.isError ? result.budget.error : result.budget.warning,
        severity: result.isError ? 'error' : 'warning',
        timestamp,
      });
    }
  }

  private pruneMetrics(): void {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    
    // Keep only last hour of metrics
    this.metrics = this.metrics
      .filter(metric => now - metric.timestamp < ONE_HOUR)
      .slice(-1000); // Keep maximum 1000 metrics
    
    // Prune violations
    this.violations = this.violations
      .filter(violation => now - violation.timestamp < ONE_HOUR);
  }

  private reportViolation(violation: PerformanceViolation): void {
    this.violations.push(violation);
    this.notifyListeners(violation);

    if (process.env.NODE_ENV === 'development') {
      const message = `Performance ${violation.severity}: ${violation.component || 'Global'} ${violation.type} took ${violation.value}ms (threshold: ${violation.threshold}ms)`;
      violation.severity === 'error' ? console.error(message) : console.warn(message);
    }
  }

  private notifyListeners(violation: PerformanceViolation): void {
    this.listeners.forEach(listener => listener(violation));
  }

  // Public API methods
  getMetrics(options?: {
    type?: MetricType;
    timeRange?: { start: number; end: number };
    component?: string;
  }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (options?.type) {
      filtered = filtered.filter(m => m.type === options.type);
    }

    if (options?.timeRange) {
      filtered = filtered.filter(m => 
        m.timestamp >= options.timeRange!.start && 
        m.timestamp <= options.timeRange!.end
      );
    }

    if (options?.component) {
      filtered = filtered.filter(m => m.id.includes(options.component!));
    }

    return filtered;
  }

  getMemoryTrend(timeRange?: { start: number; end: number }): MemorySnapshot[] {
    let snapshots = this.memorySnapshots;

    if (timeRange) {
      snapshots = snapshots.filter(s =>
        s.timestamp >= timeRange.start &&
        s.timestamp <= timeRange.end
      );
    }

    return snapshots;
  }

  getAverageMetric(options: {
    type: MetricType;
    timeRange?: { start: number; end: number };
    component?: string;
  }): number {
    const metrics = this.getMetrics(options);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  getSlowMetrics(threshold: number): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  subscribe(listener: MetricListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    this.metrics = [];
    this.violations = [];
    this.memorySnapshots = [];
    this.listeners.clear();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance(); 