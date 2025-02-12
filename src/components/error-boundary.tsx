import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { measureExecutionTime } from '@/utils/performance';
import { performanceMonitor } from '@/services/performance-monitor';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

const DefaultFallback = ({ error, reset }: { error: Error; reset: () => void }) => (
  <Card className="p-6 max-w-lg mx-auto my-8">
    <div className="flex items-start space-x-4">
      <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
      <div className="flex-1">
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-sm text-muted-foreground mb-4">
              {error.message || 'An unexpected error occurred'}
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-[200px] mb-4">
                {error.stack}
              </pre>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
              onClick={reset}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try again</span>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  </Card>
);

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Track error in performance monitor
    measureExecutionTime(
      async () => {
        if (this.props.onError) {
          await this.props.onError(error, errorInfo);
        }
      },
      'error-boundary',
      'error',
      {
        metadata: {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          componentStack: errorInfo.componentStack
        }
      }
    ).catch(console.error);
  }

  private handleReset = () => {
    this.setState({
      error: null,
      errorInfo: null
    });
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

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = Component.displayName || Component.name || 'Component';

  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `WithErrorBoundary(${displayName})`;
  return WithErrorBoundary;
} 