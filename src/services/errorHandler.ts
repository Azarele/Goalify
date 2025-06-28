import { ERROR_MESSAGES } from '../config/constants';
import { getErrorMessage, isNetworkError } from '../utils/helpers';

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleSupabaseError = (error: any, operation: string): never => {
  console.error(`❌ Supabase error in ${operation}:`, error);
  
  if (error.message?.includes('JWSError') || error.message?.includes('JWSInvalidSignature')) {
    throw new AppError(
      'Authentication failed. Please check your credentials and try again.',
      'AUTH_ERROR',
      401
    );
  }
  
  if (error.code === 'PGRST301') {
    throw new AppError(
      'Invalid API credentials. Please contact support.',
      'INVALID_CREDENTIALS',
      401
    );
  }
  
  if (error.code === '23505') {
    throw new AppError(
      'This record already exists.',
      'DUPLICATE_RECORD',
      409
    );
  }
  
  if (isNetworkError(error)) {
    throw new AppError(
      ERROR_MESSAGES.network,
      'NETWORK_ERROR',
      0
    );
  }
  
  throw new AppError(
    getErrorMessage(error) || ERROR_MESSAGES.generic,
    'UNKNOWN_ERROR',
    500
  );
};

export const handleOpenAIError = (error: any): never => {
  console.error('OpenAI error:', error);
  
  if (error.status === 401) {
    throw new AppError(
      'Invalid OpenAI API key. Please check your configuration.',
      'OPENAI_AUTH_ERROR',
      401
    );
  }
  
  if (error.status === 429) {
    throw new AppError(
      'Too many requests to OpenAI. Please wait a moment and try again.',
      'OPENAI_RATE_LIMIT',
      429
    );
  }
  
  if (error.status === 402) {
    throw new AppError(
      'OpenAI billing issue. Please check your account credits.',
      'OPENAI_BILLING_ERROR',
      402
    );
  }
  
  if (error.status >= 500) {
    throw new AppError(
      'OpenAI service temporarily unavailable. Please try again later.',
      'OPENAI_SERVER_ERROR',
      error.status
    );
  }
  
  throw new AppError(
    ERROR_MESSAGES.openai,
    'OPENAI_ERROR',
    error.status || 500
  );
};

export const handleElevenLabsError = (error: any): never => {
  console.error('ElevenLabs error:', error);
  
  if (error.status === 401) {
    throw new AppError(
      'Invalid ElevenLabs API key. Please check your configuration.',
      'ELEVENLABS_AUTH_ERROR',
      401
    );
  }
  
  if (error.status === 429) {
    throw new AppError(
      'ElevenLabs rate limit exceeded. Please wait and try again.',
      'ELEVENLABS_RATE_LIMIT',
      429
    );
  }
  
  throw new AppError(
    ERROR_MESSAGES.elevenlabs,
    'ELEVENLABS_ERROR',
    error.status || 500
  );
};