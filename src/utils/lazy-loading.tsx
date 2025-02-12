import React, { Suspense } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface LazyLoadingOptions {
  fallback?: React.ReactNode;
  ErrorComponent?: React.ComponentType<{ error: Error }>;
}

const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
);

const DefaultErrorComponent: React.FC<{ error: Error }> = ({ error }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4">
    <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
    <p className="text-muted-foreground">{error.message}</p>
  </div>
);

export function lazyRoute(
  factory: () => Promise<{ default: React.ComponentType<any> }>,
  chunkName: string,
  options: LazyLoadingOptions = {}
) {
  const LazyComponent = React.lazy(factory);
  const {
    fallback = <DefaultLoadingFallback />,
    ErrorComponent = DefaultErrorComponent
  } = options;

  return function LazyLoadedRoute(props: any) {
    return (
      <ErrorBoundary FallbackComponent={ErrorComponent}>
        <Suspense fallback={fallback}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
} 