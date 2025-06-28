import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CoachingSession, Goal, UserProfile } from '../types/coaching';

// Helper function to check if Supabase is available
const checkSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured - operation will fail gracefully');
    throw new Error('Supabase not configured');
  }
  return supabase;
};

// User Profile Operations
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const client = checkSupabase();
    
    console.log('Fetching user profile for:', userId);
    
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No user profile found for:', userId);
        return null;
      }
      console.error('Error fetching user profile:', error);
      return null;
    }

    if (!data) {
      console.log('No profile data returned for:', userId);
      return null;
    }

    console.log('User profile loaded successfully:', data.id);

    return {
      id: data.id,
      name: data.name,
      totalXP: data.total_xp || 0,
      level: data.level || 1,
      dailyStreak: data.daily_streak || 0,
      lastActivity: data.last_activity ? new Date(data.last_activity) : null,
      preferences: {
        voiceEnabled: data.voice_enabled || false,
        voiceId: data.voice_id || '21m00Tcm4TlvDq8ikWAM',
        memoryEnabled: data.memory_enabled !== false,
        tone: data.tone || 'casual',
      },
      longTermGoals: [],
      currentChallenges: [],
      achievements: [],
    };
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
};

export const createUserProfile = async (userId: string, name?: string): Promise<UserProfile> => {
  try {
    const client = checkSupabase();
    
    console.log('Creating user profile for:', userId, 'with name:', name);
    
    const profileData = {
      user_id: userId,
      name: name || null,
      total_xp: 0,
      level: 1,
      daily_streak: 0,
      last_activity: new Date().toISOString(),
      voice_enabled: false,
      voice_id: '21m00Tcm4TlvDq8ikWAM',
      memory_enabled: true,
      tone: 'casual' as const,
    };

    const { data, error } = await client
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      // Handle duplicate key constraint violation (profile already exists)
      if (error.code === '23505') {
        console.log('User profile already exists, fetching existing profile');
        const existingProfile = await getUserProfile(userId);
        if (existingProfile) {
          return existingProfile;
        }
      }
      console.error('Error creating user profile:', error);
      throw error;
    }

    console.log('User profile created successfully:', data.id);

    return {
      id: data.id,
      name: data.name,
      totalXP: data.total_xp || 0,
      level: data.level || 1,
      dailyStreak: data.daily_streak || 0,
      lastActivity: new Date(data.last_activity),
      preferences: {
        voiceEnabled: data.voice_enabled || false,
        voiceId: data.voice_id || '21m00Tcm4TlvDq8ikWAM',
        memoryEnabled: data.memory_enabled !== false,
        tone: data.tone || 'casual',
      },
      longTermGoals: [],
      currentChallenges: [],
      achievements: [],
    };
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const client = checkSupabase();
    
    console.log('Updating user profile for:', userId);
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are provided
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.totalXP !== undefined) updateData.total_xp = updates.totalXP;
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.dailyStreak !== undefined) updateData.daily_streak = updates.dailyStreak;
    if (updates.lastActivity !== undefined) updateData.last_activity = updates.lastActivity?.toISOString();
    
    if (updates.preferences) {
      if (updates.preferences.voiceEnabled !== undefined) updateData.voice_enabled = updates.preferences.voiceEnabled;
      if (updates.preferences.voiceId !== undefined) updateData.voice_id = updates.preferences.voiceId;
      if (updates.preferences.memoryEnabled !== undefined) updateData.memory_enabled = updates.preferences.memoryEnabled;
      if (updates.preferences.tone !== undefined) updateData.tone = updates.preferences.tone;
    }

    const { error } = await client
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }

    console.log('User profile updated successfully');
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    throw error;
  }
};

// Session Operations
export const saveSession = async (userId: string, session: CoachingSession): Promise<void> => {
  try {
    const client = checkSupabase();
    
    console.log('Saving session:', session.id, 'for user:', userId);
    
    const sessionData = {
      id: session.id,
      user_id: userId,
      title: session.summary || `Session ${new Date().toLocaleDateString()}`,
      messages: session.messages || [],
      completed: session.completed || false,
      summary: session.summary || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('coaching_sessions')
      .upsert(sessionData);

    if (error) {
      console.error('Error saving session:', error);
      throw error;
    }

    console.log('Session saved successfully');
  } catch (error) {
    console.error('Error in saveSession:', error);
    throw error;
  }
};

export const getUserSessions = async (userId: string): Promise<CoachingSession[]> => {
  try {
    const client = checkSupabase();
    
    console.log('Fetching sessions for user:', userId);
    
    const { data, error } = await client
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    console.log('Fetched', data?.length || 0, 'sessions');

    return (data || []).map(session => ({
      id: session.id,
      date: new Date(session.created_at),
      messages: session.messages || [],
      goals: [],
      insights: [],
      actions: [],
      completed: session.completed || false,
      summary: session.summary,
    }));
  } catch (error) {
    console.error('Error in getUserSessions:', error);
    return [];
  }
};

export const getSession = async (userId: string, sessionId: string): Promise<CoachingSession | null> => {
  try {
    const client = checkSupabase();
    
    const { data, error } = await client
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching session:', error);
      return null;
    }

    return {
      id: data.id,
      date: new Date(data.created_at),
      messages: data.messages || [],
      goals: [],
      insights: [],
      actions: [],
      completed: data.completed || false,
      summary: data.summary,
    };
  } catch (error) {
    console.error('Error in getSession:', error);
    return null;
  }
};

// Goal Operations
export const saveGoal = async (userId: string, sessionId: string, goal: Goal): Promise<void> => {
  try {
    const client = checkSupabase();
    
    console.log('Saving goal:', goal.id, 'for user:', userId);
    
    const goalData = {
      id: goal.id,
      user_id: userId,
      session_id: sessionId,
      description: goal.description,
      xp_value: goal.xpValue || 50,
      difficulty: goal.difficulty || 'medium',
      motivation: goal.motivation || 5,
      completed: goal.completed || false,
      completed_at: goal.completedAt?.toISOString() || null,
      completion_reasoning: goal.completionReasoning || null,
      deadline: goal.deadline?.toISOString() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('goals')
      .upsert(goalData);

    if (error) {
      console.error('Error saving goal:', error);
      throw error;
    }

    console.log('Goal saved successfully');
  } catch (error) {
    console.error('Error in saveGoal:', error);
    throw error;
  }
};

export const getSessionGoals = async (userId: string, sessionId: string): Promise<Goal[]> => {
  try {
    const client = checkSupabase();
    
    const { data, error } = await client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching session goals:', error);
      return [];
    }

    return (data || []).map(goal => ({
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
  } catch (error) {
    console.error('Error in getSessionGoals:', error);
    return [];
  }
};

export const getUserGoals = async (userId: string): Promise<Goal[]> => {
  try {
    const client = checkSupabase();
    
    const { data, error } = await client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user goals:', error);
      return [];
    }

    return (data || []).map(goal => ({
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
  } catch (error) {
    console.error('Error in getUserGoals:', error);
    return [];
  }
};

// Daily Streak Operations
export const updateDailyStreak = async (userId: string): Promise<number> => {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return 0;

    const today = new Date();
    const lastActivity = profile.lastActivity;
    
    let newStreak = profile.dailyStreak || 0;
    
    if (!lastActivity) {
      // First activity ever
      newStreak = 1;
    } else {
      const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day, keep streak
        newStreak = profile.dailyStreak || 0;
      } else if (daysDiff === 1) {
        // Next day, increment streak
        newStreak = (profile.dailyStreak || 0) + 1;
      } else {
        // Missed days, reset streak
        newStreak = 1;
      }
    }

    await updateUserProfile(userId, {
      ...profile,
      dailyStreak: newStreak,
      lastActivity: today,
    });

    return newStreak;
  } catch (error) {
    console.error('Error in updateDailyStreak:', error);
    return 0;
  }
};