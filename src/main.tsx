import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                <span className="text-white font-bold text-xl">!</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-purple-300 mb-4">Please refresh the page to try again.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                <p className="text-red-300 text-sm font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Ensure root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  // Create root element if it doesn't exist
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
}

const root = rootElement || document.getElementById('root')!;

try {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  
  // Fallback rendering
  root.innerHTML = `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%); display: flex; align-items: center; justify-content: center; padding: 1rem; font-family: system-ui, -apple-system, sans-serif;">
      <div style="text-align: center; color: white;">
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">Goalify</h1>
        <p style="color: #c084fc; margin-bottom: 2rem;">Loading your AI coaching companion...</p>
        <button onclick="window.location.reload()" style="background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
          Refresh Page
        </button>
      </div>
    </div>
  `;
}