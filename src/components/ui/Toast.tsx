import React, { useState, useEffect } from 'react';
import { X, Wifi, WifiOff } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
  isOffline?: boolean;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose,
  isOffline = false 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getToastStyles = () => {
    const baseStyles = "fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 p-4 transition-all duration-300 transform";
    
    if (!isVisible) {
      return `${baseStyles} translate-x-full opacity-0`;
    }

    switch (type) {
      case 'success':
        return `${baseStyles} border-green-500`;
      case 'error':
        return `${baseStyles} border-red-500`;
      case 'warning':
        return `${baseStyles} border-yellow-500`;
      default:
        return `${baseStyles} border-blue-500`;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${getIconColor()}`}>
          {isOffline ? <WifiOff className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">
            {isOffline && 'Offline Mode: '}
            {message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose?.(), 300);
            }}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast manager for global toast notifications
interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isOffline?: boolean;
}

let toastId = 0;
const toastListeners: ((toasts: ToastState[]) => void)[] = [];
let toasts: ToastState[] = [];

export const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', isOffline = false) => {
  const id = `toast-${++toastId}`;
  const newToast: ToastState = { id, message, type, isOffline };
  
  toasts = [...toasts, newToast];
  toastListeners.forEach(listener => listener(toasts));

  // Auto remove after 5 seconds
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener(toasts));
  }, 5000);
};

export const useToasts = () => {
  const [currentToasts, setCurrentToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastState[]) => {
      setCurrentToasts(newToasts);
    };

    toastListeners.push(listener);
    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) {
        toastListeners.splice(index, 1);
      }
    };
  }, []);

  const removeToast = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener(toasts));
  };

  return { toasts: currentToasts, removeToast };
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToasts();

  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ top: `${1 + index * 5}rem` }}
          className="fixed right-4 z-50"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            isOffline={toast.isOffline}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );
};