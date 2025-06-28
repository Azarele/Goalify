import { createClient } from '@supabase/supabase-js';

// Get environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
const hasValidConfig = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20
);

if (!hasValidConfig) {
  console.error('❌ Invalid Supabase configuration detected:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Present' : '❌ Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Present' : '❌ Missing');
  
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.error('❌ VITE_SUPABASE_URL must start with https://');
  }
  if (supabaseAnonKey && supabaseAnonKey.length <= 20) {
    console.error('❌ VITE_SUPABASE_ANON_KEY appears to be invalid (too short)');
  }
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

// Log configuration status
if (hasValidConfig) {
  console.log('✅ Supabase configured successfully');
} else {
  console.log('⚠️ Supabase not configured - running in demo mode');
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
    };
  };
};