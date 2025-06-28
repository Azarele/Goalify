import { COACHING_CONFIG, XP_CONFIG, VALIDATION_RULES } from '../config/constants';

// Date and Time Utilities
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  
  return formatDate(date);
};

export const getTimeRemaining = (deadline: Date, createdAt: Date = new Date()) => {
  const now = new Date();
  const timeLeft = deadline.getTime() - now.getTime();
  
  if (timeLeft <= 0) {
    return {
      timeLeft: 'Overdue',
      percentage: 0,
      isOverdue: true,
      totalHours: 0,
      remainingHours: 0
    };
  }

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  const totalTime = deadline.getTime() - createdAt.getTime();
  const totalHours = Math.floor(totalTime / (1000 * 60 * 60));
  const percentage = totalHours > 0 ? Math.max(0, (timeLeft / totalTime) * 100) : 0;

  let timeString = '';
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    timeString = `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    timeString = `${hours}h ${minutes}m`;
  } else {
    timeString = `${minutes}m`;
  }

  return {
    timeLeft: timeString,
    percentage,
    isOverdue: false,
    totalHours,
    remainingHours: hours
  };
};

// XP and Level Calculations
export const calculateLevel = (xp: number): number => {
  return Math.floor(xp / XP_CONFIG.xpPerLevel) + 1;
};

export const getXPForNextLevel = (currentXP: number): number => {
  const currentLevel = calculateLevel(currentXP);
  return currentLevel * XP_CONFIG.xpPerLevel - currentXP;
};

export const calculateGoalXP = (
  baseXP: number,
  difficulty: 'easy' | 'medium' | 'hard',
  timePercentage: number
): number => {
  const difficultyMultiplier = XP_CONFIG.difficultyMultipliers[difficulty];
  
  let timeMultiplier = 1.0;
  if (timePercentage > 75) timeMultiplier = XP_CONFIG.timeMultipliers.early;
  else if (timePercentage > 50) timeMultiplier = XP_CONFIG.timeMultipliers.onTime;
  else if (timePercentage > 25) timeMultiplier = XP_CONFIG.timeMultipliers.late;
  else timeMultiplier = XP_CONFIG.timeMultipliers.overdue;
  
  return Math.round(baseXP * difficultyMultiplier * timeMultiplier);
};

// Text Processing Utilities
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const generateConversationTitle = (firstMessage: string): string => {
  const words = firstMessage.trim().split(' ').slice(0, 6);
  let title = words.join(' ');
  if (firstMessage.length > title.length) {
    title += '...';
  }
  return title || 'New Conversation';
};

export const extractGoalFromMessage = (content: string): {
  description: string;
  timeframe: string;
} | null => {
  const goalMatch = content.match(/\[GOAL\]\s*(.*?)\s*\|\|\s*Timeframe:\s*(.+)/);
  if (goalMatch) {
    return {
      description: goalMatch[1].trim(),
      timeframe: goalMatch[2].trim()
    };
  }
  
  // Fallback for older format
  const fallbackMatch = content.match(/\[GOAL\]\s*(.+)/);
  if (fallbackMatch) {
    return {
      description: fallbackMatch[1].trim(),
      timeframe: '3 days'
    };
  }
  
  return null;
};

// Validation Utilities
export const validateEmail = (email: string): boolean => {
  return VALIDATION_RULES.email.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= VALIDATION_RULES.password.minLength &&
         password.length <= VALIDATION_RULES.password.maxLength;
};

export const validateGoalDescription = (description: string): boolean => {
  return description.length >= VALIDATION_RULES.goalDescription.minLength &&
         description.length <= VALIDATION_RULES.goalDescription.maxLength;
};

export const validateReasoning = (reasoning: string): boolean => {
  return reasoning.length >= VALIDATION_RULES.reasoning.minLength &&
         reasoning.length <= VALIDATION_RULES.reasoning.maxLength;
};

// Array Utilities
export const groupBy = <T, K extends keyof any>(
  array: T[],
  getKey: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((result, item) => {
    const key = getKey(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<K, T[]>);
};

export const unique = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

// Async Utilities
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await delay(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
};

// Local Storage Utilities
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
};

// Error Handling Utilities
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

export const isNetworkError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('network') || 
         message.includes('fetch') || 
         message.includes('connection');
};

// Performance Utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};