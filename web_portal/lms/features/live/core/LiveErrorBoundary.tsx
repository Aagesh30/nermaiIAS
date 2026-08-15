import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

export class LiveErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error.message || 'An unexpected error occurred in the live session.' };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('LiveErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-red-950/20 text-red-400 p-8">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-red-300">{this.state.errorMsg}</p>
          <button 
            className="mt-6 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded"
            onClick={() => window.location.reload()}
          >
            Reconnect
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
