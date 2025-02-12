import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { measureExecutionTime } from '@/utils/performance';
import { withPerformanceOptimization } from '@/components/hoc/with-performance-optimization';
import { Skeleton } from '@/components/ui/skeleton';

interface VirtualListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  className?: string;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  isLoading?: boolean;
  loadingItemCount?: number;
  keyExtractor?: (item: T, index: number) => string | number;
}

function VirtualListComponent<T>({
  data,
  renderItem,
  itemHeight = 50,
  className,
  overscan = 5,
  onEndReached,
  endReachedThreshold = 0.8,
  isLoading,
  loadingItemCount = 10,
  keyExtractor = (_, index) => index,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollPosition = useRef(0);
  const endReachedCallbackRef = useRef(onEndReached);

  // Update callback ref when onEndReached changes
  useEffect(() => {
    endReachedCallbackRef.current = onEndReached;
  }, [onEndReached]);

  // Memoize the data array to prevent unnecessary re-renders
  const items = useMemo(() => {
    if (isLoading) {
      return Array(loadingItemCount).fill(null);
    }
    return data;
  }, [data, isLoading, loadingItemCount]);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => itemHeight, [itemHeight]),
    overscan,
    // Add a key function for better item tracking
    getItemKey: useCallback((index) => {
      const item = items[index];
      return item ? keyExtractor(item, index) : `loading-${index}`;
    }, [items, keyExtractor]),
  });

  // Optimized scroll handler with throttling and direction detection
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;

    const currentScrollPosition = parentRef.current.scrollTop;
    const scrollingDown = currentScrollPosition > lastScrollPosition.current;
    lastScrollPosition.current = currentScrollPosition;

    // Set scrolling state with debounce
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Check if we need to load more items
    if (scrollingDown && endReachedCallbackRef.current) {
      const scrollElement = parentRef.current;
      const scrolledPercentage = 
        (scrollElement.scrollTop + scrollElement.clientHeight) / 
        scrollElement.scrollHeight;

      if (scrolledPercentage > endReachedThreshold) {
        measureExecutionTime(
          async () => endReachedCallbackRef.current?.(),
          'virtual-list-end-reached'
        );
      }
    }
  }, [endReachedThreshold]);

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Memoized render function for list items
  const renderVirtualItem = useCallback((virtualItem: any) => {
    const item = items[virtualItem.index];
    
    return (
      <div
        key={virtualItem.key}
        data-index={virtualItem.index}
        ref={rowVirtualizer.measureElement}
        className={cn(
          'absolute top-0 left-0 w-full transform transition-transform',
          isScrolling && 'will-change-transform'
        )}
        style={{
          height: `${virtualItem.size}px`,
          transform: `translateY(${virtualItem.start}px)`,
        }}
      >
        {item ? (
          renderItem(item, virtualItem.index)
        ) : (
          <Skeleton className="w-full h-full" />
        )}
      </div>
    );
  }, [items, renderItem, isScrolling, rowVirtualizer]);

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className={cn(
        'overflow-auto relative',
        isScrolling && 'pointer-events-none',
        className
      )}
      style={{
        willChange: isScrolling ? 'transform' : 'auto',
        WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map(renderVirtualItem)}
      </div>
    </div>
  );
}

// Export with performance optimization
export const VirtualList = withPerformanceOptimization(VirtualListComponent, {
  name: 'VirtualList',
  trackProps: true,
  trackRenders: true,
  slowThreshold: 16, // Target 60fps
}) as typeof VirtualListComponent;

// Type export for better DX
export type { VirtualListProps }; 