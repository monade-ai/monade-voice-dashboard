'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry?: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;

        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error
  retry?: () => void
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => (
  <Card className="w-full">
    <CardHeader>
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <CardTitle className="text-destructive">Something went wrong</CardTitle>
      </div>
      <CardDescription>
        An error occurred while rendering this component. Please try refreshing or contact support if the problem persists.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {error && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Error details</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
      {retry && (
        <Button onClick={retry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      )}
    </CardContent>
  </Card>
);

export { ErrorBoundary, DefaultErrorFallback };
export type { ErrorBoundaryProps, ErrorFallbackProps };