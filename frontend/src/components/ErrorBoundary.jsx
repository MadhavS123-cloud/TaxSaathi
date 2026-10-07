import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-paper text-ink p-4">
          <div className="max-w-md border border-hairline p-6 bg-paper-raised">
            <h1 className="text-xl font-serif mb-4 text-rust">Something went wrong.</h1>
            <p className="text-sm font-sans mb-4 text-ink-muted">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <pre className="text-xs font-mono p-4 bg-paper overflow-auto border border-hairline">
              {this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-ink text-paper text-sm font-sans"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
