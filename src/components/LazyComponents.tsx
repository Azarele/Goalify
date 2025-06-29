import React, { Suspense } from 'react';
import { Loader } from 'lucide-react';

// Lazy load heavy components to reduce initial bundle size
export const LazyProgressDashboard = React.lazy(() => 
  import('./ProgressDashboard').then(module => ({ default: module.ProgressDashboard }))
);

export const LazyUserAnalysis = React.lazy(() => 
  import('./UserAnalysis').then(module => ({ default: module.UserAnalysis }))
);

export const LazySettings = React.lazy(() => 
  import('./Settings').then(module => ({ default: module.Settings }))
);

export const LazyGlobalLeaderboard = React.lazy(() => 
  import('./GlobalLeaderboard').then(module => ({ default: module.GlobalLeaderboard }))
);

// Optimized loading component
const LoadingFallback: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <Loader className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
      <p className="text-purple-300">{text}</p>
    </div>
  </div>
);

// Wrapper component for lazy loading with error boundary
export const LazyWrapper: React.FC<{ 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => (
  <Suspense fallback={fallback || <LoadingFallback />}>
    {children}
  </Suspense>
);