import { debounce } from '@/utils/performance';
import { GLOBAL_BUDGETS, ComponentBudgets } from '@/config/performance-budgets';

export type MetricType = 'render' | 'event' | 'query' | 'error' | 'memory' | 'mutation' | 'validation' | 'navigation';

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

interface PerformanceViolation {
  type: MetricType;
  component?: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'error';
  timestamp: number;
}

type MetricListener = (metric: PerformanceMetric) => void;
type ViolationListener = (violation: PerformanceViolation) => void;

class OptimizedPerformanceMonitor {
  private static instance: OptimizedPerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private violations: PerformanceViolation[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private metricListeners: Set<MetricListener> = new Set();
  private violationListeners: Set<ViolationListener> = new Set();
  private readonly MEMORY_SNAPSHOT_INTERVAL = 60000; // 1 minute
  private memoryInterval?: NodeJS.Timeout;
  private readonly MAX_MEMORY_SNAPSHOTS = 60; // Keep 1 hour of snapshots
  private readonly MEMORY_LEAK_THRESHOLD = 20; // 20% increase threshold
  private maxMetrics: number = 1000;
  private metricsCache: Map<string, { value: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.setupPerformanceObserver();
    this.startMemoryTracking();
  }

  static getInstance(): OptimizedPerformanceMonitor {
    if (!OptimizedPerformanceMonitor.instance) {
      OptimizedPerformanceMonitor.instance = new OptimizedPerformanceMonitor();
    }
    return OptimizedPerformanceMonitor.instance;
  }

  private setupPerformanceObserver() {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.addMetric({
            id: entry.name,
            type: this.getMetricTypeFromEntry(entry),
            duration: entry.duration,
            metadata: {
              entryType: entry.entryType,
              startTime: entry.startTime
            }
          });
        });
      });

      observer.observe({ entryTypes: ['measure', 'resource', 'navigation'] });
    }
  }

  private getMetricTypeFromEntry(entry: PerformanceEntry): MetricType {
    switch (entry.entryType) {
      case 'measure':
        return 'event';
      case 'resource':
        return 'query';
      default:
        return 'event';
    }
  }

  private startMemoryTracking() {
    if (performance.memory) {
      this.memoryInterval = setInterval(() => {
        this.takeMemorySnapshot();
        this.checkMemoryLeaks();
        this.pruneMemorySnapshots();
      }, this.MEMORY_SNAPSHOT_INTERVAL);
    }
  }

  private takeMemorySnapshot() {
    if (performance.memory) {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        usage: performance.memory.usedJSHeapSize,
        heapSize: performance.memory.totalJSHeapSize,
        heapLimit: performance.memory.jsHeapSizeLimit
      };

      this.memorySnapshots.push(snapshot);
      this.addMetric({
        id: 'memory-snapshot',
        type: 'memory',
        duration: 0,
        metadata: snapshot
      });
    }
  }

  private checkMemoryLeaks = debounce(() => {
    if (this.memorySnapshots.length < 2) return;

    const latest = this.memorySnapshots[this.memorySnapshots.length - 1];
    const baseline = this.memorySnapshots[0];
    const usageIncrease = ((latest.usage - baseline.usage) / baseline.usage) * 100;

    if (usageIncrease > this.MEMORY_LEAK_THRESHOLD) {
      this.reportViolation({
        type: 'memory',
        value: usageIncrease,
        threshold: this.MEMORY_LEAK_THRESHOLD,
        severity: 'error',
        timestamp: Date.now()
      });
    }
  }, 1000);

  private pruneMemorySnapshots() {
    if (this.memorySnapshots.length > this.MAX_MEMORY_SNAPSHOTS) {
      this.memorySnapshots = this.memorySnapshots.slice(-this.MAX_MEMORY_SNAPSHOTS);
    }
  }

  addMetric(metric: Omit<PerformanceMetric, 'timestamp'>) {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);
    this.analyzeMetric(fullMetric);
    this.pruneMetrics();
    this.notifyMetricListeners(fullMetric);
  }

  private analyzeMetric(metric: PerformanceMetric) {
    const budget = GLOBAL_BUDGETS[metric.type];
    if (!budget) return;

    const { component } = metric.metadata || {};
    const componentBudget = component && ComponentBudgets[component];
    const threshold = componentBudget?.warning || budget.warning;
    const errorThreshold = componentBudget?.error || budget.error;

    if (metric.duration > errorThreshold) {
      this.reportViolation({
        type: metric.type,
        component,
        value: metric.duration,
        threshold: errorThreshold,
        severity: 'error',
        timestamp: Date.now()
      });
    } else if (metric.duration > threshold) {
      this.reportViolation({
        type: metric.type,
        component,
        value: metric.duration,
        threshold,
        severity: 'warning',
        timestamp: Date.now()
      });
    }
  }

  private reportViolation(violation: PerformanceViolation) {
    this.violations.push(violation);
    this.notifyViolationListeners(violation);
  }

  private pruneMetrics() {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(options?: {
    type?: MetricType;
    timeRange?: { start: number; end: number };
    component?: string;
  }) {
    let filteredMetrics = this.metrics;

    if (options?.type) {
      filteredMetrics = filteredMetrics.filter(m => m.type === options.type);
    }

    if (options?.timeRange) {
      filteredMetrics = filteredMetrics.filter(
        m => m.timestamp >= options.timeRange!.start && m.timestamp <= options.timeRange!.end
      );
    }

    if (options?.component) {
      filteredMetrics = filteredMetrics.filter(
        m => m.metadata?.component === options.component
      );
    }

    return filteredMetrics;
  }

  getViolations(options?: {
    severity?: 'warning' | 'error';
    timeRange?: { start: number; end: number };
    component?: string;
  }) {
    let filteredViolations = this.violations;

    if (options?.severity) {
      filteredViolations = filteredViolations.filter(v => v.severity === options.severity);
    }

    if (options?.timeRange) {
      filteredViolations = filteredViolations.filter(
        v => v.timestamp >= options.timeRange!.start && v.timestamp <= options.timeRange!.end
      );
    }

    if (options?.component) {
      filteredViolations = filteredViolations.filter(v => v.component === options.component);
    }

    return filteredViolations;
  }

  onMetric(listener: MetricListener): () => void {
    this.metricListeners.add(listener);
    return () => this.metricListeners.delete(listener);
  }

  onViolation(listener: ViolationListener): () => void {
    this.violationListeners.add(listener);
    return () => this.violationListeners.delete(listener);
  }

  private notifyMetricListeners(metric: PerformanceMetric) {
    this.metricListeners.forEach(listener => listener(metric));
  }

  private notifyViolationListeners(violation: PerformanceViolation) {
    this.violationListeners.forEach(listener => listener(violation));
  }

  clearMetrics() {
    this.metrics = [];
    this.violations = [];
  }

  dispose() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    this.metricListeners.clear();
    this.violationListeners.clear();
  }
}

export const performanceMonitor = OptimizedPerformanceMonitor.getInstance(); 