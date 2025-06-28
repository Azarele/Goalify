// Application Configuration Constants
export const APP_CONFIG = {
  name: 'Goalify',
  description: 'Your AI Coaching Companion',
  version: '1.0.0',
  author: 'Goalify Team'
} as const;

// API Configuration
export const API_CONFIG = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000
} as const;

// Coaching Configuration
export const COACHING_CONFIG = {
  maxQuestionsPerCycle: 3,
  minGoalsForConclusion: 2,
  maxResponseLength: 150,
  typewriterSpeed: 25,
  voicePlaybackDelay: 1000
} as const;

// XP and Leveling System
export const XP_CONFIG = {
  baseXpPerGoal: 50,
  xpPerLevel: 1000,
  difficultyMultipliers: {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0
  },
  timeMultipliers: {
    early: 1.5,    // Completed in first 25% of time
    onTime: 1.3,   // Completed in first 50% of time
    late: 1.1,     // Completed in first 75% of time
    overdue: 0.7   // Completed after deadline
  }
} as const;

// UI Configuration
export const UI_CONFIG = {
  sidebarWidth: 320,
  maxChatWidth: 768,
  animationDuration: 300,
  debounceDelay: 500,
  toastDuration: 3000
} as const;

// Goal Configuration
export const GOAL_CONFIG = {
  timeframes: {
    short: '24 hours',
    medium: '3 days',
    long: '1 week'
  },
  difficulties: ['easy', 'medium', 'hard'] as const,
  motivationRange: { min: 1, max: 10 }
} as const;

// Voice Configuration
export const VOICE_CONFIG = {
  defaultVoiceId: '21m00Tcm4TlvDq8ikWAM',
  stability: 0.5,
  similarityBoost: 0.75,
  supportedLanguages: ['en-US']
} as const;

// Database Configuration
export const DB_CONFIG = {
  batchSize: 50,
  maxRetries: 3,
  connectionTimeout: 10000
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  network: 'Network connection failed. Please check your internet connection.',
  auth: 'Authentication failed. Please sign in again.',
  validation: 'Please check your input and try again.',
  generic: 'Something went wrong. Please try again.',
  supabase: 'Database connection failed. Please try again later.',
  openai: 'AI service temporarily unavailable. Please try again.',
  elevenlabs: 'Voice service unavailable. Text responses will continue to work.'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  goalCompleted: 'Congratulations! Goal completed successfully.',
  profileUpdated: 'Profile updated successfully.',
  sessionSaved: 'Session saved successfully.',
  streakUpdated: 'Daily streak updated!'
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: {
    minLength: 6,
    maxLength: 128
  },
  name: {
    minLength: 1,
    maxLength: 50
  },
  goalDescription: {
    minLength: 10,
    maxLength: 500
  },
  reasoning: {
    minLength: 20,
    maxLength: 1000
  }
} as const;