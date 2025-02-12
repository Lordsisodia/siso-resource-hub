import { useMemo, useRef, useEffect } from 'react';
import { measureExecutionTime } from '@/utils/performance';
import { useStore } from '@/store/root-store';

interface MemoizedComputationOptions<T> {
  name: string;
  deps: any[];
  maxAge?: number;
  onCompute?: (result: T, duration: number) => void;
}

export function useMemoizedComputation<T>(
  computation: () => T,
  options: MemoizedComputationOptions<T>
): T {
  const { name, deps, maxAge = 5000, onCompute } = options;
  const { isRecording, slowThreshold } = useStore(state => ({
    isRecording: state.isRecording,
    slowThreshold: state.slowThreshold,
  }));

  const lastComputeTime = useRef<number>(0);
  const computationCount = useRef<number>(0);

  // Track computation time
  useEffect(() => {
    if (!isRecording) return;

    const now = Date.now();
    const timeSinceLastCompute = now - lastComputeTime.current;

    if (timeSinceLastCompute < maxAge) {
      measureExecutionTime(
        () => Promise.resolve(),
        `${name}-cache-hit`,
        'event',
        {
          metadata: {
            computationCount: computationCount.current,
            timeSinceLastCompute,
          },
        }
      );
    }
  }, deps);

  return useMemo(() => {
    const startTime = Date.now();
    let result: T;

    if (isRecording) {
      // Wrap computation in a synchronous execution
      measureExecutionTime(
        () => Promise.resolve(),
        `${name}-compute`,
        'event',
        {
          metadata: {
            computationCount: computationCount.current,
            isStale: Date.now() - lastComputeTime.current > maxAge,
          },
        }
      );
      result = computation();
    } else {
      result = computation();
    }

    const duration = Date.now() - startTime;
    
    if (duration > slowThreshold) {
      console.warn(
        `[Performance] ${name} computation took ${duration}ms (threshold: ${slowThreshold}ms)`
      );
    }

    lastComputeTime.current = Date.now();
    computationCount.current++;
    onCompute?.(result, duration);

    return result;
  }, deps);
}

// Example usage:
// const result = useMemoizedComputation(
//   () => expensiveCalculation(data),
//   {
//     name: 'calculateTotal',
//     deps: [data],
//     maxAge: 1000,
//     onCompute: (result, duration) => {
//       console.log(`Calculation took ${duration}ms`);
//     },
//   }
// ); 