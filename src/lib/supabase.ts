import { createClient } from '@supabase/supabase-js';

// Get environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced validation for environment variables
const hasValidConfig = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20 &&
  supabaseUrl.includes('.supabase.co') &&
  // Check if anon key looks like a valid JWT (has 3 parts separated by dots)
  supabaseAnonKey.split('.').length === 3
);

if (!hasValidConfig) {
  console.error('❌ Invalid Supabase configuration detected:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Present' : '❌ Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Present' : '❌ Missing');
  
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.error('❌ VITE_SUPABASE_URL must start with https://');
  }
  if (supabaseUrl && !supabaseUrl.includes('.supabase.co')) {
    console.error('❌ VITE_SUPABASE_URL must be a valid Supabase URL (*.supabase.co)');
  }
  if (supabaseAnonKey && supabaseAnonKey.length <= 20) {
    console.error('❌ VITE_SUPABASE_ANON_KEY appears to be invalid (too short)');
  }
  if (supabaseAnonKey && supabaseAnonKey.split('.').length !== 3) {
    console.error('❌ VITE_SUPABASE_ANON_KEY must be a valid JWT token (3 parts separated by dots)');
  }
  
  console.error('\n🔧 To fix this:');
  console.error('1. Go to your Supabase project dashboard');
  console.error('2. Navigate to Project Settings → API');
  console.error('3. Copy your Project URL and anon/public key');
  console.error('4. Update your .env file with the correct values');
  console.error('5. Restart your development server');
}

// Create Supabase client with proper configuration
export const supabase = hasValidConfig 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'sb-goalify-auth-token'
      }
    })
  : null;

export const isSupabaseConfigured = hasValidConfig;

// Wrapper function for database operations with error handling
export const safeSupabaseOperation = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any; isOffline?: boolean }> => {
  if (!supabase) {
    return { 
      data: null, 
      error: { message: 'Supabase not configured' },
      isOffline: true 
    };
  }

  try {
    const result = await operation();
    return result;
  } catch (error: any) {
    console.warn('Database operation failed:', error);
    
    // Check if it's a network error
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      return { 
        data: null, 
        error: { message: 'Network connection unavailable' },
        isOffline: true 
      };
    }
    
    return { data: null, error };
  }
};

// Log configuration status with more detailed feedback
if (hasValidConfig) {
  console.log('✅ Supabase configured successfully');
  console.log('📡 Project URL:', supabaseUrl);
  console.log('🔑 Anon key configured (length:', supabaseAnonKey.length, 'chars)');
} else {
  console.log('⚠️ Supabase not configured - running in demo mode');
  console.log('💡 Please check your environment variables and restart the server');
}

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          total_xp: number;
          level: number;
          daily_streak: number;
          last_activity: string;
          voice_enabled: boolean;
          voice_id: string;
          memory_enabled: boolean;
          tone: 'formal' | 'casual';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          total_xp?: number;
          level?: number;
          daily_streak?: number;
          last_activity?: string;
          voice_enabled?: boolean;
          voice_id?: string;
          memory_enabled?: boolean;
          tone?: 'formal' | 'casual';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string | null;
          total_xp?: number;
          level?: number;
          daily_streak?: number;
          last_activity?: string;
          voice_enabled?: boolean;
          voice_id?: string;
          memory_enabled?: boolean;
          tone?: 'formal' | 'casual';
          created_at?: string;
          updated_at?: string;
        };
      };
      coaching_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          messages: any[];
          completed: boolean;
          summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          messages?: any[];
          completed?: boolean;
          summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          messages?: any[];
          completed?: boolean;
          summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          description: string;
          xp_value: number;
          difficulty: 'easy' | 'medium' | 'hard';
          motivation: number;
          completed: boolean;
          completed_at: string | null;
          completion_reasoning: string | null;
          deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          description: string;
          xp_value?: number;
          difficulty?: 'easy' | 'medium' | 'hard';
          motivation?: number;
          completed?: boolean;
          completed_at?: string | null;
          completion_reasoning?: string | null;
          deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          description?: string;
          xp_value?: number;
          difficulty?: 'easy' | 'medium' | 'hard';
          motivation?: number;
          completed?: boolean;
          completed_at?: string | null;
          completion_reasoning?: string | null;
          deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          icon: string;
          xp_reward: number;
          unlocked_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          icon: string;
          xp_reward: number;
          unlocked_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          icon?: string;
          xp_reward?: number;
          unlocked_at?: string;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
          completed: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
          completed?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
          completed?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
          is_voice: boolean;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
          is_voice?: boolean;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          created_at?: string;
          is_voice?: boolean;
        };
      };
    };
  };
};