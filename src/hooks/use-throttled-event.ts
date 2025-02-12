import { useCallback, useRef, useEffect } from 'react';
import { measureExecutionTime } from '@/utils/performance';

export function useThrottledEvent<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 200,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = { leading: true, trailing: true }
): T {
  const { leading = true, trailing = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRanRef = useRef<number>(0);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      // If leading is false and this is the first call, don't execute
      if (lastRanRef.current === 0 && !leading) {
        lastRanRef.current = now;
        return;
      }

      const remaining = delay - (now - lastRanRef.current);

      // Store the most recent arguments for trailing execution
      lastArgsRef.current = args;

      // If we should execute now
      if (remaining <= 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        lastRanRef.current = now;
        return measureExecutionTime(
          async () => callback(...args),
          'throttled-event'
        );
      }

      // If we haven't set up a timeout and trailing is true
      if (!timeoutRef.current && trailing) {
        timeoutRef.current = setTimeout(() => {
          lastRanRef.current = leading ? Date.now() : 0;

          if (lastArgsRef.current) {
            measureExecutionTime(
              async () => callback(...lastArgsRef.current!),
              'throttled-event-trailing'
            );
          }

          timeoutRef.current = null;
          lastArgsRef.current = null;
        }, remaining);
      }
    },
    [callback, delay, leading, trailing]
  );

  return throttledCallback as T;
}

// Example usage:
// const handleScroll = useThrottledEvent(
//   (event: UIEvent) => {
//     console.log('Scrolled!', event);
//   },
//   200,
//   { leading: true, trailing: true }
// ); 