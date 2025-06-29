/**
 * Bundle optimization utilities to reduce project size
 */

// Lazy loading utilities
export const lazyImport = <T extends Record<string, any>>(
  factory: () => Promise<T>
) => {
  return React.lazy(() => factory().then(module => ({ default: module.default || module })));
};

// Code splitting helpers
export const createAsyncComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) => {
  return React.lazy(importFn);
};

// Memory optimization
export const memoizeWithSize = <T extends (...args: any[]) => any>(
  fn: T,
  maxSize: number = 100
): T => {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, result);
    return result;
  }) as T;
};

// Bundle size monitoring
export const logBundleSize = (componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📦 ${componentName} loaded`);
  }
};