import { supabase, safeSupabaseOperation } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

type CoachingSession = Database['public']['Tables']['coaching_sessions']['Row'];
type CoachingSessionInsert = Database['public']['Tables']['coaching_sessions']['Insert'];
type CoachingSessionUpdate = Database['public']['Tables']['coaching_sessions']['Update'];

type Goal = Database['public']['Tables']['goals']['Row'];
type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type GoalUpdate = Database['public']['Tables']['goals']['Update'];

type Achievement = Database['public']['Tables']['achievements']['Row'];
type AchievementInsert = Database['public']['Tables']['achievements']['Insert'];

type Conversation = Database['public']['Tables']['conversations']['Row'];
type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
type ConversationUpdate = Database['public']['Tables']['conversations']['Update'];

type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// Mock data for offline mode
const mockUserProfile: UserProfile = {
  id: 'mock-profile-id',
  user_id: 'mock-user-id',
  name: 'Demo User',
  total_xp: 150,
  level: 3,
  daily_streak: 5,
  last_activity: new Date().toISOString(),
  voice_enabled: false,
  voice_id: '21m00Tcm4TlvDq8ikWAM',
  memory_enabled: true,
  tone: 'casual',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockConversations: Conversation[] = [
  {
    id: 'mock-conv-1',
    user_id: 'mock-user-id',
    title: 'Getting Started with Goals',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    completed: true,
  },
  {
    id: 'mock-conv-2',
    user_id: 'mock-user-id',
    title: 'Weekly Planning Session',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    completed: false,
  },
];

// User Profile Operations
export const getUserProfile = async (userId: string): Promise<{ data: UserProfile | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: { ...mockUserProfile, user_id: userId },
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const createUserProfile = async (profile: UserProfileInsert): Promise<{ data: UserProfile | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('user_profiles')
      .insert(profile)
      .select()
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: { ...mockUserProfile, ...profile, id: 'mock-profile-id' },
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const updateUserProfile = async (userId: string, updates: UserProfileUpdate): Promise<{ data: UserProfile | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: { ...mockUserProfile, ...updates, user_id: userId },
      error: null,
      isOffline: true
    };
  }

  return result;
};

// Coaching Session Operations
export const createCoachingSession = async (session: CoachingSessionInsert): Promise<{ data: CoachingSession | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('coaching_sessions')
      .insert(session)
      .select()
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: {
        id: 'mock-session-id',
        user_id: session.user_id,
        title: session.title,
        messages: session.messages || [],
        completed: false,
        summary: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const updateCoachingSession = async (sessionId: string, updates: CoachingSessionUpdate): Promise<{ data: CoachingSession | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('coaching_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: {
        id: sessionId,
        user_id: 'mock-user-id',
        title: updates.title || 'Mock Session',
        messages: updates.messages || [],
        completed: updates.completed || false,
        summary: updates.summary || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const getCoachingSessions = async (userId: string): Promise<{ data: CoachingSession[] | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: [
        {
          id: 'mock-session-1',
          user_id: userId,
          title: 'Goal Setting Session',
          messages: [],
          completed: true,
          summary: 'Discussed career goals and created action plan',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
        }
      ],
      error: null,
      isOffline: true
    };
  }

  return result;
};

// Goal Operations
export const createGoal = async (goal: GoalInsert): Promise<{ data: Goal | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('goals')
      .insert(goal)
      .select()
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: {
        id: 'mock-goal-id',
        user_id: goal.user_id,
        session_id: goal.session_id,
        description: goal.description,
        xp_value: goal.xp_value || 10,
        difficulty: goal.difficulty || 'medium',
        motivation: goal.motivation || 5,
        completed: false,
        completed_at: null,
        completion_reasoning: null,
        deadline: goal.deadline || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const updateGoal = async (goalId: string, updates: GoalUpdate): Promise<{ data: Goal | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .select()
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: {
        id: goalId,
        user_id: 'mock-user-id',
        session_id: 'mock-session-id',
        description: 'Mock goal description',
        xp_value: 10,
        difficulty: 'medium',
        motivation: 5,
        completed: updates.completed || false,
        completed_at: updates.completed_at || null,
        completion_reasoning: updates.completion_reasoning || null,
        deadline: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const getGoals = async (userId: string): Promise<{ data: Goal[] | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: [
        {
          id: 'mock-goal-1',
          user_id: userId,
          session_id: 'mock-session-1',
          description: 'Complete daily exercise routine',
          xp_value: 15,
          difficulty: 'medium',
          motivation: 8,
          completed: false,
          completed_at: null,
          completion_reasoning: null,
          deadline: new Date(Date.now() + 604800000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ],
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const getSessionGoals = async (userId: string, sessionId: string): Promise<{ data: Goal[] | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: [
        {
          id: 'mock-session-goal-1',
          user_id: userId,
          session_id: sessionId,
          description: 'Complete session-specific goal',
          xp_value: 20,
          difficulty: 'medium',
          motivation: 7,
          completed: false,
          completed_at: null,
          completion_reasoning: null,
          deadline: new Date(Date.now() + 604800000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ],
      error: null,
      isOffline: true
    };
  }

  return result;
};

// Achievement Operations
export const createAchievement = async (achievement: AchievementInsert): Promise<{ data: Achievement | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('achievements')
      .insert(achievement)
      .select()
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: {
        id: 'mock-achievement-id',
        user_id: achievement.user_id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        xp_reward: achievement.xp_reward,
        unlocked_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const getAchievements = async (userId: string): Promise<{ data: Achievement[] | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: [
        {
          id: 'mock-achievement-1',
          user_id: userId,
          title: 'First Steps',
          description: 'Completed your first coaching session',
          icon: '🎯',
          xp_reward: 25,
          unlocked_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }
      ],
      error: null,
      isOffline: true
    };
  }

  return result;
};

// Conversation Operations
export const getUserConversations = async (userId: string): Promise<{ data: Conversation[] | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: mockConversations.map(conv => ({ ...conv, user_id: userId })),
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const createConversation = async (conversation: ConversationInsert): Promise<{ data: Conversation | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('conversations')
      .insert(conversation)
      .select()
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: {
        id: 'mock-conversation-id',
        user_id: conversation.user_id,
        title: conversation.title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed: false,
      },
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const updateConversation = async (conversationId: string, updates: ConversationUpdate): Promise<{ data: Conversation | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: {
        id: conversationId,
        user_id: 'mock-user-id',
        title: updates.title || 'Mock Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed: updates.completed || false,
      },
      error: null,
      isOffline: true
    };
  }

  return result;
};

// Message Operations
export const getConversationMessages = async (conversationId: string): Promise<{ data: Message[] | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: [
        {
          id: 'mock-message-1',
          conversation_id: conversationId,
          role: 'user',
          content: 'Hello, I need help setting some goals.',
          created_at: new Date().toISOString(),
          is_voice: false,
        },
        {
          id: 'mock-message-2',
          conversation_id: conversationId,
          role: 'assistant',
          content: 'I\'d be happy to help you set some meaningful goals! What area of your life would you like to focus on?',
          created_at: new Date().toISOString(),
          is_voice: false,
        }
      ],
      error: null,
      isOffline: true
    };
  }

  return result;
};

export const createMessage = async (message: MessageInsert): Promise<{ data: Message | null; error: any; isOffline?: boolean }> => {
  const result = await safeSupabaseOperation(async () => {
    return await supabase!
      .from('messages')
      .insert(message)
      .select()
      .single();
  });

  // Return mock data if offline
  if (result.isOffline) {
    return {
      data: {
        id: 'mock-message-id',
        conversation_id: message.conversation_id,
        role: message.role,
        content: message.content,
        created_at: new Date().toISOString(),
        is_voice: message.is_voice || false,
      },
      error: null,
      isOffline: true
    };
  }

  return result;
};