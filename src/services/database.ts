import { supabase, safeSupabaseOperation, isSupabaseConfigured } from '../lib/supabase';
import { CoachingSession, Goal, UserProfile, Message } from '../types/coaching';

// Helper function to check if Supabase is available
const checkSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('⚠️ Supabase not configured - using local storage fallback');
    return null;
  }
  return supabase;
};

// Generate conversation title from first user message
const generateConversationTitle = (firstMessage: string): string => {
  const words = firstMessage.trim().split(' ').slice(0, 6);
  let title = words.join(' ');
  if (firstMessage.length > title.length) {
    title += '...';
  }
  return title || 'New Conversation';
};

// Enhanced error handling for Supabase operations
const handleSupabaseError = (error: any, operation: string) => {
  console.error(`❌ Error in ${operation}:`, error);
  
  if (error.message?.includes('JWSError') || error.message?.includes('JWSInvalidSignature')) {
    console.error('🔑 JWT Authentication Error - This usually means:');
    console.error('   1. Your VITE_SUPABASE_ANON_KEY is incorrect');
    console.error('   2. The key doesn\'t match your Supabase project');
    console.error('   3. Please verify your credentials in the Supabase dashboard');
  }
  
  if (error.code === 'PGRST301') {
    console.error('🚫 Authentication failed (401) - Invalid API key');
  }
  
  if (error.message?.includes('Failed to fetch')) {
    console.error('🌐 Network Error - This could mean:');
    console.error('   1. No internet connection');
    console.error('   2. Supabase service is down');
    console.error('   3. CORS issues or firewall blocking the request');
    console.error('   4. Invalid Supabase URL');
  }
  
  throw error;
};

// User Profile Operations
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const localProfile = localStorage.getItem(`profile_${userId}`);
    if (localProfile) {
      const parsed = JSON.parse(localProfile);
      return {
        ...parsed,
        lastActivity: parsed.lastActivity ? new Date(parsed.lastActivity) : null
      };
    }
    return null;
  }

  try {
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
      handleSupabaseError(error, 'getUserProfile');
      return null;
    }

    if (!data) {
      console.log('No profile data returned for:', userId);
      return null;
    }

    console.log('User profile loaded successfully:', data.id);

    const profile = {
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

    // Cache in local storage
    localStorage.setItem(`profile_${userId}`, JSON.stringify({
      ...profile,
      lastActivity: profile.lastActivity?.toISOString()
    }));

    return profile;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    // Fallback to local storage
    const localProfile = localStorage.getItem(`profile_${userId}`);
    if (localProfile) {
      const parsed = JSON.parse(localProfile);
      return {
        ...parsed,
        lastActivity: parsed.lastActivity ? new Date(parsed.lastActivity) : null
      };
    }
    return null;
  }
};

export const createUserProfile = async (userId: string, name?: string): Promise<UserProfile> => {
  const client = checkSupabase();
  
  const defaultProfile = {
    id: `profile_${userId}`,
    name: name || null,
    totalXP: 0,
    level: 1,
    dailyStreak: 0,
    lastActivity: new Date(),
    preferences: {
      voiceEnabled: false,
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      memoryEnabled: true,
      tone: 'casual' as const,
    },
    longTermGoals: [],
    currentChallenges: [],
    achievements: [],
  };

  if (!client) {
    // Store in local storage
    localStorage.setItem(`profile_${userId}`, JSON.stringify({
      ...defaultProfile,
      lastActivity: defaultProfile.lastActivity.toISOString()
    }));
    return defaultProfile;
  }

  try {
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
      handleSupabaseError(error, 'createUserProfile');
      throw error;
    }

    console.log('User profile created successfully:', data.id);

    const profile = {
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

    // Cache in local storage
    localStorage.setItem(`profile_${userId}`, JSON.stringify({
      ...profile,
      lastActivity: profile.lastActivity.toISOString()
    }));

    // Initialize user stats
    await initializeUserStats(userId);

    return profile;
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    // Fallback to local storage
    localStorage.setItem(`profile_${userId}`, JSON.stringify({
      ...defaultProfile,
      lastActivity: defaultProfile.lastActivity.toISOString()
    }));
    return defaultProfile;
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const localProfile = JSON.parse(localStorage.getItem(`profile_${userId}`) || '{}');
    const updatedProfile = { 
      ...localProfile, 
      ...updates,
      lastActivity: updates.lastActivity?.toISOString() || localProfile.lastActivity
    };
    localStorage.setItem(`profile_${userId}`, JSON.stringify(updatedProfile));
    console.log('Profile updated in local storage');
    return;
  }

  try {
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
      handleSupabaseError(error, 'updateUserProfile');
      throw error;
    }

    console.log('User profile updated successfully');
    
    // Update local storage cache
    const localProfile = JSON.parse(localStorage.getItem(`profile_${userId}`) || '{}');
    const updatedProfile = { 
      ...localProfile, 
      ...updates,
      lastActivity: updates.lastActivity?.toISOString() || localProfile.lastActivity
    };
    localStorage.setItem(`profile_${userId}`, JSON.stringify(updatedProfile));
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    // Fallback to local storage for demo mode
    const localProfile = JSON.parse(localStorage.getItem(`profile_${userId}`) || '{}');
    const updatedProfile = { 
      ...localProfile, 
      ...updates,
      lastActivity: updates.lastActivity?.toISOString() || localProfile.lastActivity
    };
    localStorage.setItem(`profile_${userId}`, JSON.stringify(updatedProfile));
    console.log('Profile updated in local storage as fallback');
  }
};

// ENHANCED: Real Global Leaderboard Operations
export const getGlobalLeaderboard = async (sortBy: 'xp' | 'goals' | 'streak' = 'xp', limit: number = 50): Promise<Array<{
  id: string;
  name: string;
  level: number;
  totalXP: number;
  goalsCompleted: number;
  goalsCreated: number;
  dailyStreak: number;
  highestStreak: number;
  totalSessions: number;
  completionRate: number;
  rank: number;
}>> => {
  const client = checkSupabase();
  
  if (!client) {
    return generateDemoLeaderboard();
  }

  try {
    console.log('Fetching real global leaderboard, sorted by:', sortBy);
    
    const { data, error } = await client.rpc('get_global_leaderboard', { 
      limit_count: limit 
    });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return generateDemoLeaderboard();
    }

    if (!data || data.length === 0) {
      console.log('No leaderboard data found, returning demo data');
      return generateDemoLeaderboard();
    }

    // Transform and sort the data based on the sortBy parameter
    const leaderboard = data.map((user: any, index: number) => ({
      id: user.user_id,
      name: user.name || 'Anonymous User',
      level: user.level || 1,
      totalXP: user.total_xp || 0,
      goalsCompleted: user.goals_completed || 0,
      goalsCreated: user.goals_created || 0,
      dailyStreak: user.daily_streak || 0,
      highestStreak: user.highest_streak || 0,
      totalSessions: user.total_sessions || 0,
      completionRate: user.completion_rate || 0,
      rank: sortBy === 'xp' ? user.rank_by_xp : 
            sortBy === 'goals' ? user.rank_by_goals : 
            user.rank_by_streak
    }));

    // Sort based on the selected criteria
    const sortedLeaderboard = leaderboard.sort((a, b) => {
      switch (sortBy) {
        case 'xp':
          return b.totalXP !== a.totalXP ? b.totalXP - a.totalXP : b.goalsCompleted - a.goalsCompleted;
        case 'goals':
          return b.goalsCompleted !== a.goalsCompleted ? b.goalsCompleted - a.goalsCompleted : b.totalXP - a.totalXP;
        case 'streak':
          return b.highestStreak !== a.highestStreak ? b.highestStreak - a.highestStreak : b.totalXP - a.totalXP;
        default:
          return b.totalXP - a.totalXP;
      }
    });

    // Update ranks after sorting
    const rankedLeaderboard = sortedLeaderboard.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    console.log('Real leaderboard loaded:', rankedLeaderboard.length, 'users');
    return rankedLeaderboard;
  } catch (error) {
    console.error('Error in getGlobalLeaderboard:', error);
    return generateDemoLeaderboard();
  }
};

// Get user's current rank
export const getUserRank = async (userId: string): Promise<{
  rankByXP: number;
  rankByGoals: number;
  rankByStreak: number;
  totalUsers: number;
} | null> => {
  const client = checkSupabase();
  
  if (!client) {
    return {
      rankByXP: Math.floor(Math.random() * 100) + 1,
      rankByGoals: Math.floor(Math.random() * 100) + 1,
      rankByStreak: Math.floor(Math.random() * 100) + 1,
      totalUsers: 150
    };
  }

  try {
    const { data, error } = await client.rpc('get_user_rank', { 
      target_user_id: userId 
    });

    if (error) {
      console.error('Error fetching user rank:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const rankData = data[0];
    return {
      rankByXP: rankData.rank_by_xp || 999,
      rankByGoals: rankData.rank_by_goals || 999,
      rankByStreak: rankData.rank_by_streak || 999,
      totalUsers: rankData.total_users || 0
    };
  } catch (error) {
    console.error('Error in getUserRank:', error);
    return null;
  }
};

// Initialize user stats (call this when creating a new user)
export const initializeUserStats = async (userId: string): Promise<void> => {
  const client = checkSupabase();
  
  if (!client) return;

  try {
    const { error } = await client
      .from('user_stats')
      .insert({
        user_id: userId,
        total_goals_created: 0,
        total_goals_completed: 0,
        total_xp_earned: 0,
        highest_streak: 0,
        total_sessions: 0
      });

    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.error('Error initializing user stats:', error);
    } else {
      console.log('User stats initialized for:', userId);
    }
  } catch (error) {
    console.error('Error in initializeUserStats:', error);
  }
};

const generateDemoLeaderboard = () => {
  const demoNames = [
    'Alex Chen', 'Sarah Johnson', 'Michael Rodriguez', 'Emma Thompson', 'David Kim',
    'Lisa Wang', 'James Wilson', 'Maria Garcia', 'Ryan O\'Connor', 'Jessica Lee',
    'Daniel Brown', 'Ashley Davis', 'Kevin Zhang', 'Rachel Green', 'Mark Taylor',
    'Sophia Martinez', 'Chris Anderson', 'Amanda White', 'Tyler Johnson', 'Olivia Smith'
  ];
  
  return demoNames.map((name, index) => {
    const baseLevel = Math.max(1, 15 - index);
    const baseXP = baseLevel * 1000 + Math.floor(Math.random() * 800);
    const goalsCompleted = Math.floor(baseLevel * 2.5 + Math.random() * 10);
    const goalsCreated = goalsCompleted + Math.floor(Math.random() * 5);
    const dailyStreak = Math.floor(Math.random() * 50);
    const highestStreak = dailyStreak + Math.floor(Math.random() * 20);
    const totalSessions = Math.floor(baseLevel * 1.5 + Math.random() * 8);
    const completionRate = goalsCreated > 0 ? Math.round((goalsCompleted / goalsCreated) * 100) : 0;
    
    return {
      id: `demo-${index}`,
      name,
      level: baseLevel,
      totalXP: baseXP,
      goalsCompleted,
      goalsCreated,
      dailyStreak,
      highestStreak,
      totalSessions,
      completionRate,
      rank: index + 1
    };
  });
};

// Conversation Operations
export const createConversation = async (userId: string, firstMessage: string): Promise<string> => {
  const client = checkSupabase();
  const title = generateConversationTitle(firstMessage);
  
  if (!client) {
    // Fallback to local storage
    const conversationId = `conv_${Date.now()}`;
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    localConversations.push({
      id: conversationId,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed: false,
      ai_label: null,
      category: 'general',
      soft_deleted: false
    });
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(localConversations));
    return conversationId;
  }

  try {
    const { data, error } = await client
      .from('conversations')
      .insert({
        user_id: userId,
        title,
        category: 'general'
      })
      .select('id')
      .single();

    if (error) {
      handleSupabaseError(error, 'createConversation');
      throw error;
    }

    console.log('Conversation created successfully:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error in createConversation:', error);
    // Fallback to local storage
    const conversationId = `conv_${Date.now()}`;
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    localConversations.push({
      id: conversationId,
      title: generateConversationTitle(firstMessage),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed: false,
      ai_label: null,
      category: 'general',
      soft_deleted: false
    });
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(localConversations));
    return conversationId;
  }
};

export const getUserConversations = async (userId: string): Promise<Array<{
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  completed: boolean;
  aiLabel?: string;
  category?: string;
}>> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    return localConversations.map((conv: any) => ({
      ...conv,
      created_at: new Date(conv.created_at),
      updated_at: new Date(conv.updated_at),
      aiLabel: conv.ai_label,
      category: conv.category || 'general'
    }));
  }

  try {
    console.log('Fetching conversations for user:', userId);
    
    const { data, error } = await client
      .from('conversations')
      .select('id, title, created_at, updated_at, completed, ai_label, category')
      .eq('user_id', userId)
      .eq('soft_deleted', false) // Only get non-deleted conversations
      .order('updated_at', { ascending: false });

    if (error) {
      handleSupabaseError(error, 'getUserConversations');
      return [];
    }

    console.log('Fetched conversations:', data?.length || 0);

    const conversations = (data || []).map(conv => ({
      id: conv.id,
      title: conv.title,
      created_at: new Date(conv.created_at),
      updated_at: new Date(conv.updated_at),
      completed: conv.completed || false,
      aiLabel: conv.ai_label,
      category: conv.category || 'general'
    }));

    // Cache in local storage
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(conversations.map(conv => ({
      ...conv,
      created_at: conv.created_at.toISOString(),
      updated_at: conv.updated_at.toISOString(),
      ai_label: conv.aiLabel,
      category: conv.category,
      soft_deleted: false
    }))));

    return conversations;
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    // Fallback to local storage
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    return localConversations.map((conv: any) => ({
      ...conv,
      created_at: new Date(conv.created_at),
      updated_at: new Date(conv.updated_at),
      aiLabel: conv.ai_label,
      category: conv.category || 'general'
    }));
  }
};

export const getConversationMessages = async (conversationId: string): Promise<Message[]> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const localMessages = JSON.parse(localStorage.getItem(`messages_${conversationId}`) || '[]');
    return localMessages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  }

  try {
    console.log('Fetching messages for conversation:', conversationId);
    
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      handleSupabaseError(error, 'getConversationMessages');
      return [];
    }

    console.log('Fetched messages:', data?.length || 0);

    const messages = (data || []).map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date(msg.created_at),
      isVoice: msg.is_voice || false,
    }));

    // Cache in local storage
    localStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp.toISOString()
    }))));

    return messages;
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    // Fallback to local storage
    const localMessages = JSON.parse(localStorage.getItem(`messages_${conversationId}`) || '[]');
    return localMessages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  }
};

export const saveMessage = async (conversationId: string, message: Message): Promise<void> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const localMessages = JSON.parse(localStorage.getItem(`messages_${conversationId}`) || '[]');
    localMessages.push({
      ...message,
      timestamp: message.timestamp.toISOString()
    });
    localStorage.setItem(`messages_${conversationId}`, JSON.stringify(localMessages));
    console.log('Message saved to local storage');
    return;
  }

  try {
    console.log('Saving message to conversation:', conversationId);
    
    const { error } = await client
      .from('messages')
      .insert({
        id: message.id,
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        is_voice: message.isVoice || false,
      });

    if (error) {
      handleSupabaseError(error, 'saveMessage');
      throw error;
    }

    // Update conversation's updated_at timestamp
    await client
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    console.log('Message saved successfully');
    
    // Update local storage cache
    const localMessages = JSON.parse(localStorage.getItem(`messages_${conversationId}`) || '[]');
    localMessages.push({
      ...message,
      timestamp: message.timestamp.toISOString()
    });
    localStorage.setItem(`messages_${conversationId}`, JSON.stringify(localMessages));
  } catch (error) {
    console.error('Error in saveMessage:', error);
    // Fallback to local storage
    const localMessages = JSON.parse(localStorage.getItem(`messages_${conversationId}`) || '[]');
    localMessages.push({
      ...message,
      timestamp: message.timestamp.toISOString()
    });
    localStorage.setItem(`messages_${conversationId}`, JSON.stringify(localMessages));
    console.log('Message saved to local storage as fallback');
  }
};

export const updateConversation = async (conversationId: string, updates: {
  completed?: boolean;
  title?: string;
  aiLabel?: string;
  category?: string;
}): Promise<void> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const userId = conversationId.split('_')[0]; // Extract user ID from conversation ID
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    const updatedConversations = localConversations.map((conv: any) => 
      conv.id === conversationId ? { 
        ...conv, 
        ...updates, 
        ai_label: updates.aiLabel,
        updated_at: new Date().toISOString() 
      } : conv
    );
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(updatedConversations));
    console.log('Conversation updated in local storage');
    return;
  }

  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.completed !== undefined) updateData.completed = updates.completed;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.aiLabel !== undefined) updateData.ai_label = updates.aiLabel;
    if (updates.category !== undefined) updateData.category = updates.category;

    const { error } = await client
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId);

    if (error) {
      handleSupabaseError(error, 'updateConversation');
      throw error;
    }

    console.log('Conversation updated successfully');
  } catch (error) {
    console.error('Error in updateConversation:', error);
    // Fallback to local storage
    const userId = conversationId.split('_')[0]; // Extract user ID from conversation ID
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    const updatedConversations = localConversations.map((conv: any) => 
      conv.id === conversationId ? { 
        ...conv, 
        ...updates, 
        ai_label: updates.aiLabel,
        updated_at: new Date().toISOString() 
      } : conv
    );
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(updatedConversations));
    console.log('Conversation updated in local storage as fallback');
  }
};

// Soft delete conversation
export const deleteConversation = async (conversationId: string): Promise<void> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage - remove from array
    const userId = conversationId.split('_')[0];
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    const filteredConversations = localConversations.filter((conv: any) => conv.id !== conversationId);
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(filteredConversations));
    console.log('Conversation deleted from local storage');
    return;
  }

  try {
    const { error } = await client.rpc('soft_delete_conversation', {
      conversation_id: conversationId
    });

    if (error) {
      handleSupabaseError(error, 'deleteConversation');
      throw error;
    }

    console.log('Conversation soft deleted successfully');
  } catch (error) {
    console.error('Error in deleteConversation:', error);
    // Fallback to local storage
    const userId = conversationId.split('_')[0];
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    const filteredConversations = localConversations.filter((conv: any) => conv.id !== conversationId);
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(filteredConversations));
    console.log('Conversation deleted from local storage as fallback');
  }
};

// ENHANCED: Database-First Goal Operations
export const saveGoal = async (userId: string, sessionId: string, goal: Goal): Promise<void> => {
  const client = checkSupabase();
  
  // Always save to local storage first for immediate availability
  const localGoals = JSON.parse(localStorage.getItem(`goals_${userId}`) || '[]');
  const goalIndex = localGoals.findIndex((g: any) => g.id === goal.id);
  
  const goalToStore = {
    ...goal,
    sessionId,
    createdAt: goal.createdAt?.toISOString() || new Date().toISOString(),
    completedAt: goal.completedAt?.toISOString() || null,
    deadline: goal.deadline?.toISOString() || null
  };
  
  if (goalIndex >= 0) {
    localGoals[goalIndex] = goalToStore;
  } else {
    localGoals.push(goalToStore);
  }
  
  localStorage.setItem(`goals_${userId}`, JSON.stringify(localGoals));
  console.log('✅ Goal saved to local storage immediately:', goal.description);
  
  if (!client) {
    console.log('⚠️ Supabase not available, goal saved to local storage only');
    return;
  }

  try {
    console.log('💾 Saving goal to database:', goal.id, 'for user:', userId);
    
    // Use the database function for creating goals
    const { data, error } = await client.rpc('create_user_goal', {
      goal_description: goal.description,
      goal_xp_value: goal.xpValue || 50,
      goal_difficulty: goal.difficulty || 'medium',
      goal_motivation: goal.motivation || 5,
      goal_deadline: goal.deadline?.toISOString() || null,
      session_id: sessionId || null
    });

    if (error) {
      console.error('❌ Database save failed, but goal is preserved in local storage:', error);
      return;
    }

    if (data && data.length > 0 && data[0].success) {
      console.log('✅ Goal saved successfully to database with ID:', data[0].id);
      
      // Update local storage with the database ID
      const updatedLocalGoals = localGoals.map((g: any) => 
        g.id === goal.id ? { ...g, id: data[0].id } : g
      );
      localStorage.setItem(`goals_${userId}`, JSON.stringify(updatedLocalGoals));
    } else {
      console.error('❌ Goal creation failed:', data?.[0]?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Error saving goal to database, but preserved in local storage:', error);
  }
};

export const getUserGoals = async (userId: string): Promise<Goal[]> => {
  const client = checkSupabase();
  
  // Always check local storage first for immediate availability
  const localGoals = JSON.parse(localStorage.getItem(`goals_${userId}`) || '[]');
  const goalsFromLocal = localGoals.map((goal: any) => ({
    ...goal,
    createdAt: new Date(goal.createdAt),
    completedAt: goal.completedAt ? new Date(goal.completedAt) : undefined,
    deadline: goal.deadline ? new Date(goal.deadline) : undefined
  }));

  if (!client) {
    console.log('⚠️ Supabase not available, returning goals from local storage:', goalsFromLocal.length);
    return goalsFromLocal;
  }

  try {
    // Use the database function to get user goals
    const { data, error } = await client.rpc('get_user_goals', {
      target_user_id: userId,
      include_completed: true,
      limit_count: 100
    });

    if (error) {
      console.error('❌ Database fetch failed, using local storage:', error);
      return goalsFromLocal;
    }

    const goalsFromDB = (data || []).map((goal: any) => ({
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

    // Merge with local storage - prioritize database data
    const mergedGoals = [...goalsFromDB];
    
    // Add any local goals not in database
    localGoals.forEach((localGoal: any) => {
      if (!mergedGoals.find(g => g.id === localGoal.id)) {
        mergedGoals.push({
          ...localGoal,
          createdAt: new Date(localGoal.createdAt),
          completedAt: localGoal.completedAt ? new Date(localGoal.completedAt) : undefined,
          deadline: localGoal.deadline ? new Date(localGoal.deadline) : undefined
        });
      }
    });

    // Update local storage cache with merged data
    localStorage.setItem(`goals_${userId}`, JSON.stringify(mergedGoals.map(goal => ({
      ...goal,
      createdAt: goal.createdAt.toISOString(),
      completedAt: goal.completedAt?.toISOString() || null,
      deadline: goal.deadline?.toISOString() || null
    }))));

    console.log('✅ Goals loaded from database and cached:', mergedGoals.length);
    return mergedGoals;
  } catch (error) {
    console.error('❌ Error fetching user goals from database, using local storage:', error);
    return goalsFromLocal;
  }
};

// Enhanced goal completion with database integration
export const completeGoal = async (
  userId: string, 
  goalId: string, 
  reasoning: string, 
  xpGained: number
): Promise<{ newXP: number; newLevel: number } | null> => {
  const client = checkSupabase();
  
  // Update local storage immediately
  const localGoals = JSON.parse(localStorage.getItem(`goals_${userId}`) || '[]');
  const updatedLocalGoals = localGoals.map((g: any) => 
    g.id === goalId ? {
      ...g,
      completed: true,
      completedAt: new Date().toISOString(),
      completionReasoning: reasoning,
      xpValue: xpGained
    } : g
  );
  localStorage.setItem(`goals_${userId}`, JSON.stringify(updatedLocalGoals));
  console.log('✅ Goal completed in local storage immediately');

  if (!client) {
    console.log('⚠️ Supabase not available, goal completed in local storage only');
    return { newXP: xpGained, newLevel: 1 };
  }

  try {
    // Use the database function to complete the goal
    const { data, error } = await client.rpc('complete_goal_with_xp', {
      goal_id: goalId,
      completion_reasoning: reasoning,
      calculated_xp: xpGained
    });

    if (error) {
      console.error('❌ Database goal completion failed:', error);
      return null;
    }

    if (data && data.length > 0 && data[0].success) {
      const result = data[0];
      console.log('✅ Goal completed in database with XP reward:', xpGained, 'New total XP:', result.new_total_xp);
      return { 
        newXP: result.new_total_xp, 
        newLevel: result.new_level 
      };
    } else {
      console.error('❌ Goal completion failed:', data?.[0]?.message || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('❌ Error completing goal in database:', error);
    return null;
  }
};

// Enhanced Daily Streak Operations with proper date handling
export const updateDailyStreak = async (userId: string): Promise<number> => {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    
    const lastActivity = profile.lastActivity;
    let newStreak = profile.dailyStreak || 0;
    
    if (!lastActivity) {
      // First activity ever
      newStreak = 1;
    } else {
      const lastActivityDate = new Date(lastActivity);
      lastActivityDate.setHours(0, 0, 0, 0); // Reset to start of day
      
      const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day, keep streak
        newStreak = profile.dailyStreak || 0;
      } else if (daysDiff === 1) {
        // Next day, increment streak
        newStreak = (profile.dailyStreak || 0) + 1;
      } else if (daysDiff > 1) {
        // Missed days, reset streak
        newStreak = 1;
      }
    }

    await updateUserProfile(userId, {
      ...profile,
      dailyStreak: newStreak,
      lastActivity: new Date(),
    });

    console.log('✅ Daily streak updated:', newStreak);
    return newStreak;
  } catch (error) {
    console.error('❌ Error updating daily streak:', error);
    return 0;
  }
};

// Legacy Session Operations (for backward compatibility)
export const saveSession = async (userId: string, session: CoachingSession): Promise<void> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const localSessions = JSON.parse(localStorage.getItem(`sessions_${userId}`) || '[]');
    localSessions.push({
      ...session,
      date: session.date.toISOString()
    });
    localStorage.setItem(`sessions_${userId}`, JSON.stringify(localSessions));
    console.log('Session saved to local storage');
    return;
  }

  try {
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
      handleSupabaseError(error, 'saveSession');
      throw error;
    }

    console.log('Session saved successfully');
  } catch (error) {
    console.error('Error in saveSession:', error);
    // Fallback to local storage
    const localSessions = JSON.parse(localStorage.getItem(`sessions_${userId}`) || '[]');
    localSessions.push({
      ...session,
      date: session.date.toISOString()
    });
    localStorage.setItem(`sessions_${userId}`, JSON.stringify(localSessions));
    console.log('Session saved to local storage as fallback');
  }
};

export const getUserSessions = async (userId: string): Promise<CoachingSession[]> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const localSessions = JSON.parse(localStorage.getItem(`sessions_${userId}`) || '[]');
    return localSessions.map((session: any) => ({
      ...session,
      date: new Date(session.date)
    }));
  }

  try {
    console.log('Fetching sessions for user:', userId);
    
    const { data, error } = await client
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError(error, 'getUserSessions');
      return [];
    }

    console.log('Fetched', data?.length || 0, 'sessions');

    const sessions = (data || []).map(session => ({
      id: session.id,
      date: new Date(session.created_at),
      messages: session.messages || [],
      goals: [],
      insights: [],
      actions: [],
      completed: session.completed || false,
      summary: session.summary,
    }));

    // Cache in local storage
    localStorage.setItem(`sessions_${userId}`, JSON.stringify(sessions.map(session => ({
      ...session,
      date: session.date.toISOString()
    }))));

    return sessions;
  } catch (error) {
    console.error('Error in getUserSessions:', error);
    // Fallback to local storage
    const localSessions = JSON.parse(localStorage.getItem(`sessions_${userId}`) || '[]');
    return localSessions.map((session: any) => ({
      ...session,
      date: new Date(session.date)
    }));
  }
};

export const getSession = async (userId: string, sessionId: string): Promise<CoachingSession | null> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const localSessions = JSON.parse(localStorage.getItem(`sessions_${userId}`) || '[]');
    const session = localSessions.find((s: any) => s.id === sessionId);
    return session ? { ...session, date: new Date(session.date) } : null;
  }

  try {
    const { data, error } = await client
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('id', sessionId)
      .single();

    if (error) {
      handleSupabaseError(error, 'getSession');
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
    // Fallback to local storage
    const localSessions = JSON.parse(localStorage.getItem(`sessions_${userId}`) || '[]');
    const session = localSessions.find((s: any) => s.id === sessionId);
    return session ? { ...session, date: new Date(session.date) } : null;
  }
};

export const getSessionGoals = async (userId: string, sessionId: string): Promise<Goal[]> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const localGoals = JSON.parse(localStorage.getItem(`goals_${userId}`) || '[]');
    return localGoals
      .filter((g: any) => g.sessionId === sessionId)
      .map((goal: any) => ({
        ...goal,
        createdAt: new Date(goal.createdAt),
        completedAt: goal.completedAt ? new Date(goal.completedAt) : undefined,
        deadline: goal.deadline ? new Date(goal.deadline) : undefined
      }));
  }

  try {
    const { data, error } = await client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError(error, 'getSessionGoals');
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
    // Fallback to local storage
    const localGoals = JSON.parse(localStorage.getItem(`goals_${userId}`) || '[]');
    return localGoals
      .filter((g: any) => g.sessionId === sessionId)
      .map((goal: any) => ({
        ...goal,
        createdAt: new Date(goal.createdAt),
        completedAt: goal.completedAt ? new Date(goal.completedAt) : undefined,
        deadline: goal.deadline ? new Date(goal.deadline) : undefined
      }));
  }
};

// Remove redundant functions - keeping only essential ones
export const getAllUserGoals = getUserGoals; // Alias for consistency