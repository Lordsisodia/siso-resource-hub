import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { measureExecutionTime } from '@/utils/performance';

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  errorBoundary?: boolean;
  chunkName?: string;
}

const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <LoadingSpinner size="lg" />
  </div>
);

export function lazyLoad<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) {
  const {
    fallback = <DefaultLoadingFallback />,
    errorBoundary = true,
    chunkName = 'unknown'
  } = options;

  const LazyComponent = lazy(() => 
    measureExecutionTime(
      () => factory(),
      `lazy-load-${chunkName}`,
      'event',
      { metadata: { chunkName } }
    )
  );

  return function LazyLoadedComponent(props: React.ComponentProps<T>) {
    const Component = (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );

    return errorBoundary ? (
      <ErrorBoundary>
        {Component}
      </ErrorBoundary>
    ) : Component;
  };
}

// Helper for route components
export function lazyRoute(
  factory: () => Promise<{ default: React.ComponentType<any> }>,
  chunkName: string
) {
  return lazyLoad(factory, {
    chunkName,
    errorBoundary: true,
    fallback: (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  });
} 