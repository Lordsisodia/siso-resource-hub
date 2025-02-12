import React, { ComponentType, useEffect, useRef, useMemo } from 'react';
import { performanceMonitor } from '@/services/performance-monitor';
import { MetricType } from '@/utils/performance';
import { ErrorBoundary } from '@/components/error-boundary';
import { useStore } from '@/store/root-store';

interface PerformanceOptions {
  name: string;
  trackProps?: boolean;
  trackRenders?: boolean;
  trackEffects?: boolean;
  metricType?: MetricType;
  slowThreshold?: number;
}

export function withPerformanceOptimization<P extends object>(options: PerformanceOptions) {
  return function (WrappedComponent: ComponentType<P>) {
    function WithPerformance(props: P) {
      const { isRecording } = useStore(state => ({
        isRecording: state.isRecording
      }));

      const renderCount = useRef(0);
      const lastRenderTime = useRef(performance.now());
      const lastProps = useRef<P>(props);
      const mountTime = useRef(performance.now());

      // Track prop changes
      const changedProps = useMemo(() => {
        if (!options.trackProps) return [];
        return Object.keys(props).filter(
          key => props[key] !== lastProps.current[key]
        );
      }, [props]);

      // Track initial mount
      useEffect(() => {
        if (!isRecording) return;
        
        const mountDuration = performance.now() - mountTime.current;
        performanceMonitor.addMetric({
          id: `${options.name}-mount`,
          type: options.metricType || 'render',
          duration: mountDuration,
          timestamp: Date.now(),
          metadata: {
            phase: 'mount',
            component: options.name
          }
        });

        return () => {
          if (!isRecording) return;
          
          const unmountStart = performance.now();
          performanceMonitor.addMetric({
            id: `${options.name}-unmount`,
            type: options.metricType || 'render',
            duration: performance.now() - unmountStart,
            timestamp: Date.now(),
            metadata: {
              phase: 'unmount',
              component: options.name,
              totalMounted: performance.now() - mountTime.current
            }
          });
        };
      }, []);

      // Track renders and prop changes
      useEffect(() => {
        if (!isRecording) return;
        
        renderCount.current++;
        const currentTime = performance.now();
        const renderDuration = currentTime - lastRenderTime.current;

        performanceMonitor.addMetric({
          id: `${options.name}-render`,
          type: options.metricType || 'render',
          duration: renderDuration,
          timestamp: Date.now(),
          metadata: {
            phase: 'update',
            renderCount: renderCount.current,
            component: options.name,
            ...(options.trackProps && changedProps.length > 0 && {
              changedProps,
              propValues: changedProps.reduce((acc, key) => ({
                ...acc,
                [key]: props[key]
              }), {})
            })
          }
        });

        if (options.slowThreshold && renderDuration > options.slowThreshold) {
          console.warn(
            `[Performance] Slow render detected in ${options.name}: ${renderDuration.toFixed(2)}ms`,
            {
              renderCount: renderCount.current,
              changedProps: options.trackProps ? changedProps : undefined
            }
          );
        }

        lastRenderTime.current = currentTime;
        lastProps.current = props;
      });

      return (
        <ErrorBoundary
          onError={(error) => {
            if (!isRecording) return;
            
            performanceMonitor.addMetric({
              id: `${options.name}-error`,
              type: 'error',
              duration: 0,
              timestamp: Date.now(),
              metadata: {
                error: error.message,
                component: options.name,
                stack: error.stack
              }
            });
          }}
        >
          <WrappedComponent {...props} />
        </ErrorBoundary>
      );
    }

    WithPerformance.displayName = `WithPerformance(${options.name})`;
    
    // Cast the memoized component back to ComponentType<P>
    return React.memo(WithPerformance) as ComponentType<P>;
  };
} 