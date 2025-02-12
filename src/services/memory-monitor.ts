import { performanceMonitor } from './performance-monitor';
import { debounce } from '@/utils/performance';

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface MemoryLeakReport {
  timestamp: number;
  usageIncrease: number;
  component?: string;
  snapshots: MemorySnapshot[];
}

type MemoryLeakListener = (report: MemoryLeakReport) => void;

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private listeners: Set<MemoryLeakListener> = new Set();
  private readonly SNAPSHOT_INTERVAL = 10000; // 10 seconds
  private readonly MAX_SNAPSHOTS = 360; // Keep 1 hour of snapshots
  private readonly LEAK_THRESHOLD = 0.2; // 20% increase threshold
  private interval?: NodeJS.Timeout;

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.takeSnapshot();
    this.interval = setInterval(() => {
      this.takeSnapshot();
      this.detectLeaks();
    }, this.SNAPSHOT_INTERVAL);
  }

  private takeSnapshot() {
    if (!window.performance.memory) return;

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: window.performance.memory.usedJSHeapSize,
      totalJSHeapSize: window.performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
    };

    this.snapshots.push(snapshot);
    this.pruneSnapshots();

    // Track memory usage in performance monitor
    performanceMonitor.addMetric({
      id: 'memory-usage',
      type: 'memory',
      duration: snapshot.usedJSHeapSize,
      timestamp: snapshot.timestamp,
      metadata: {
        totalHeapSize: snapshot.totalJSHeapSize,
        heapLimit: snapshot.jsHeapSizeLimit
      }
    });
  }

  private pruneSnapshots() {
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-this.MAX_SNAPSHOTS);
    }
  }

  private detectLeaks = debounce(() => {
    if (this.snapshots.length < 2) return;

    const recentSnapshots = this.snapshots.slice(-10); // Last 100 seconds
    const oldestRecent = recentSnapshots[0];
    const latest = recentSnapshots[recentSnapshots.length - 1];

    const usageIncrease = (latest.usedJSHeapSize - oldestRecent.usedJSHeapSize) / oldestRecent.usedJSHeapSize;

    if (usageIncrease > this.LEAK_THRESHOLD) {
      // Get recent metrics to identify suspicious components
      const recentMetrics = performanceMonitor.getMetrics({
        timeRange: {
          start: oldestRecent.timestamp,
          end: latest.timestamp
        }
      });

      // Find components with high memory usage or frequent renders
      const suspiciousComponent = this.findSuspiciousComponent(recentMetrics);

      const report: MemoryLeakReport = {
        timestamp: Date.now(),
        usageIncrease,
        component: suspiciousComponent,
        snapshots: recentSnapshots
      };

      this.notifyListeners(report);
    }
  }, 1000);

  private findSuspiciousComponent(metrics: any[]): string | undefined {
    const componentMetrics = new Map<string, { count: number; totalMemory: number }>();

    metrics.forEach(metric => {
      if (metric.metadata?.component) {
        const component = metric.metadata.component;
        const current = componentMetrics.get(component) || { count: 0, totalMemory: 0 };

        componentMetrics.set(component, {
          count: current.count + 1,
          totalMemory: current.totalMemory + (metric.metadata.memoryUsage || 0)
        });
      }
    });

    // Find component with highest memory usage or render count
    let maxScore = 0;
    let suspiciousComponent: string | undefined;

    componentMetrics.forEach((stats, component) => {
      const score = (stats.totalMemory * stats.count) / metrics.length;
      if (score > maxScore) {
        maxScore = score;
        suspiciousComponent = component;
      }
    });

    return suspiciousComponent;
  }

  private notifyListeners(report: MemoryLeakReport) {
    this.listeners.forEach(listener => listener(report));
  }

  getSnapshots(timeRange?: { start: number; end: number }): MemorySnapshot[] {
    if (!timeRange) return [...this.snapshots];

    return this.snapshots.filter(
      snapshot =>
        snapshot.timestamp >= timeRange.start &&
        snapshot.timestamp <= timeRange.end
    );
  }

  onMemoryLeak(listener: MemoryLeakListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.snapshots = [];
    this.listeners.clear();
  }
}

export const memoryMonitor = new MemoryMonitor(); 