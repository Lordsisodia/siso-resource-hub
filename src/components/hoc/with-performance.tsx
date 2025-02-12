import React, { useEffect, useRef, ComponentType } from 'react';
import { performanceMonitor } from '@/services/performance-monitor';
import { MetricType } from '@/utils/performance';
import { useStore } from '@/store/root-store';
import { ErrorBoundary } from '@/components/error-boundary';

interface PerformanceOptions {
  id?: string;
  metricType?: MetricType;
  slowThreshold?: number;
  trackMemory?: boolean;
}

export function withPerformance<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: PerformanceOptions = {}
) {
  const {
    id = WrappedComponent.displayName || WrappedComponent.name || 'Component',
    metricType = 'render',
    slowThreshold = 16,
    trackMemory = false
  } = options;

  function WithPerformanceComponent(props: P) {
    const { isRecording } = useStore(state => ({
      isRecording: state.isRecording
    }));

    const startTimeRef = useRef<number>(0);
    const memoryStartRef = useRef<number>(0);

    useEffect(() => {
      if (!isRecording) return;

      startTimeRef.current = performance.now();
      if (trackMemory && performance.memory) {
        memoryStartRef.current = performance.memory.usedJSHeapSize;
      }

      return () => {
        const duration = performance.now() - startTimeRef.current;
        performanceMonitor.addMetric({
          id: `${id}-unmount`,
          type: metricType,
          duration,
          timestamp: Date.now(),
          metadata: {
            phase: 'unmount',
            ...(trackMemory && performance.memory && {
              memoryDelta: performance.memory.usedJSHeapSize - memoryStartRef.current
            })
          }
        });
      };
    }, [isRecording]);

    const handleRender = (
      id: string,
      phase: 'mount' | 'update',
      actualDuration: number
    ) => {
      if (!isRecording) return;

      performanceMonitor.addMetric({
        id: `${id}-${phase}`,
        type: metricType,
        duration: actualDuration,
        timestamp: Date.now(),
        metadata: {
          phase,
          ...(trackMemory && performance.memory && {
            memoryUsage: performance.memory.usedJSHeapSize
          })
        }
      });

      if (actualDuration > slowThreshold) {
        console.warn(
          `[Performance] Component ${id} took ${actualDuration.toFixed(2)}ms to ${phase} ` +
          `(threshold: ${slowThreshold}ms)`
        );
      }
    };

    return (
      <ErrorBoundary FallbackComponent={({ error }) => (
        <div className="p-4 border border-destructive rounded-lg">
          <h3 className="text-lg font-semibold text-destructive">
            Error in {id}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {error.message}
          </p>
        </div>
      )}>
        <React.Profiler
          id={id}
          onRender={(id, phase, actualDuration) =>
            handleRender(id, phase === 'mount' ? 'mount' : 'update', actualDuration)
          }
        >
          <WrappedComponent {...props} />
        </React.Profiler>
      </ErrorBoundary>
    );
  }

  WithPerformanceComponent.displayName = `WithPerformance(${id})`;
  return WithPerformanceComponent;
} 