import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we have valid environment variables
const hasValidConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasValidConfig) {
  console.error('❌ Missing Supabase environment variables. Please check your .env file contains:');
  console.error('VITE_SUPABASE_URL=your_supabase_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
}

// Create Supabase client with proper configuration
export const supabase = hasValidConfig 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
  : null;

export const isSupabaseConfigured = hasValidConfig;

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