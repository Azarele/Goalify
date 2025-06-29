import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Goal, UserProfile, Message } from '../types/coaching';

// Consolidated database service with minimal redundancy
class DatabaseService {
  private static instance: DatabaseService;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Generic cache management
  private setCache(key: string, data: any, ttl: number = 300000) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  private getCache(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  // Unified sync operation
  private async syncOperation<T>(
    operation: () => Promise<T>,
    fallbackData: T,
    cacheKey: string
  ): Promise<T> {
    // Check cache first
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    if (!isSupabaseConfigured || !supabase) {
      return fallbackData;
    }

    try {
      const result = await operation();
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Database operation failed:', error);
      return fallbackData;
    }
  }

  // Consolidated user operations
  async getUserData(userId: string): Promise<{
    profile: UserProfile | null;
    goals: Goal[];
    conversations: any[];
  }> {
    const cacheKey = `user_data_${userId}`;
    
    return this.syncOperation(
      async () => {
        const [profileResult, goalsResult, conversationsResult] = await Promise.all([
          supabase!.from('user_profiles').select('*').eq('user_id', userId).single(),
          supabase!.rpc('get_user_goals', { target_user_id: userId, include_completed: true, limit_count: 100 }),
          supabase!.from('conversations').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
        ]);

        const profile = profileResult.data ? {
          id: profileResult.data.id,
          name: profileResult.data.name,
          totalXP: profileResult.data.total_xp || 0,
          level: profileResult.data.level || 1,
          dailyStreak: profileResult.data.daily_streak || 0,
          lastActivity: profileResult.data.last_activity ? new Date(profileResult.data.last_activity) : null,
          preferences: {
            voiceEnabled: profileResult.data.voice_enabled || false,
            voiceId: profileResult.data.voice_id || '21m00Tcm4TlvDq8ikWAM',
            memoryEnabled: profileResult.data.memory_enabled !== false,
            tone: profileResult.data.tone || 'casual',
          },
          longTermGoals: [],
          currentChallenges: [],
          achievements: [],
        } : null;

        const goals = (goalsResult.data || []).map((goal: any) => ({
          id: goal.id,
          description: goal.description,
          xpValue: goal.xp_value || 50,
          difficulty: goal.difficulty || 'medium',
          motivation: goal.motivation || 5,
          completed: goal.completed || false,
          completedAt: goal.completed_at ? new Date(goal.completed_at) : undefined,
          completionReasoning: goal.completion_reasoning || undefined,
          deadline: goal.deadline ? new Date(goal.deadline) : undefined,
          createdAt: new Date(goal.created_at),
        }));

        const conversations = (conversationsResult.data || []).map(conv => ({
          id: conv.id,
          title: conv.title,
          created_at: new Date(conv.created_at),
          updated_at: new Date(conv.updated_at),
          completed: conv.completed || false,
          aiLabel: conv.ai_label,
          category: conv.category || 'general'
        }));

        return { profile, goals, conversations };
      },
      { profile: null, goals: [], conversations: [] },
      cacheKey
    );
  }

  // Batch operations for efficiency
  async batchUpdate(operations: Array<() => Promise<any>>): Promise<any[]> {
    return Promise.allSettled(operations.map(op => op()));
  }

  // Clear cache when needed
  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

export const db = DatabaseService.getInstance();