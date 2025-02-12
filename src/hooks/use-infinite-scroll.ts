import { useEffect, useRef, useCallback } from 'react';
import { useThrottledEvent } from './use-throttled-event';
import { measureExecutionTime } from '@/utils/performance';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useInfiniteScroll(
  onLoadMore: () => Promise<void>,
  options: UseInfiniteScrollOptions = {}
) {
  const {
    threshold = 0.8,
    rootMargin = '100px',
    enabled = true,
  } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const targetRef = useRef<HTMLDivElement | null>(null);

  const handleIntersection = useThrottledEvent(async (entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    
    if (entry?.isIntersecting && !loadingRef.current && enabled) {
      loadingRef.current = true;
      
      try {
        await measureExecutionTime(
          async () => await onLoadMore(),
          'infinite-scroll-load-more'
        );
      } catch (error) {
        console.error('Error loading more items:', error);
      } finally {
        loadingRef.current = false;
      }
    }
  }, 200);

  const setTargetRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      targetRef.current = node;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const options = {
      root: null,
      rootMargin,
      threshold,
    };

    observerRef.current = new IntersectionObserver(handleIntersection, options);

    if (targetRef.current) {
      observerRef.current.observe(targetRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, handleIntersection, rootMargin, threshold]);

  return {
    targetRef: setTargetRef,
    isLoading: loadingRef.current,
  };
}

// Example usage:
// const { targetRef, isLoading } = useInfiniteScroll(
//   async () => {
//     await fetchNextPage();
//   },
//   { threshold: 0.8, enabled: hasNextPage }
// ); 