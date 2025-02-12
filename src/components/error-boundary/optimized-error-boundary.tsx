import React from 'react';
import { performanceMonitor } from '@/services/performance-monitor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  maxRetries?: number;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

const DefaultFallback = ({ error, reset }: { error: Error; reset: () => void }) => (
  <Card className="p-6 space-y-4 max-w-lg mx-auto mt-8">
    <div className="flex items-center gap-3 text-destructive">
      <AlertTriangle className="h-6 w-6" />
      <h2 className="text-lg font-semibold">Something went wrong</h2>
    </div>
    <div className="space-y-2">
      <p className="text-muted-foreground">
        An error occurred while rendering this component:
      </p>
      <pre className="p-3 bg-muted/30 rounded-lg text-sm overflow-auto">
        {error.message}
      </pre>
    </div>
    <Button
      onClick={reset}
      variant="outline"
      className="w-full flex items-center justify-center gap-2"
    >
      <RefreshCw className="h-4 w-4" />
      Try again
    </Button>
  </Card>
);

export class OptimizedErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;
    
    // Track error in performance monitoring
    performanceMonitor.addMetric({
      id: `error-${error.name}`,
      type: 'error',
      duration: 0,
      timestamp: Date.now(),
      metadata: {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount
      }
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state when props change if enabled
    if (
      this.props.resetOnPropsChange &&
      this.state.error &&
      Object.keys(this.props).some(key => 
        key !== 'children' && this.props[key as keyof ErrorBoundaryProps] !== prevProps[key as keyof ErrorBoundaryProps]
      )
    ) {
      this.handleReset();
    }
  }

  handleReset = () => {
    const { maxRetries = 3 } = this.props;
    const nextRetryCount = this.state.retryCount + 1;

    if (nextRetryCount <= maxRetries) {
      this.setState({
        error: null,
        errorInfo: null,
        retryCount: nextRetryCount
      });

      // Track retry attempt
      performanceMonitor.addMetric({
        id: 'error-boundary-retry',
        type: 'event',
        duration: 0,
        timestamp: Date.now(),
        metadata: {
          retryCount: nextRetryCount,
          maxRetries,
          error: this.state.error?.message
        }
      });
    } else {
      console.warn(
        `[ErrorBoundary] Max retry attempts (${maxRetries}) reached. Component will remain in error state.`
      );
    }
  };

  render() {
    const { error } = this.state;
    const { children, fallback: FallbackComponent = DefaultFallback } = this.props;

    if (error) {
      return <FallbackComponent error={error} reset={this.handleReset} />;
    }

    return children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundary = (props: P) => (
    <OptimizedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </OptimizedErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WithErrorBoundary;
} 