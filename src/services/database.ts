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
      completed: false
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
      completed: false
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
}>> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    return localConversations.map((conv: any) => ({
      ...conv,
      created_at: new Date(conv.created_at),
      updated_at: new Date(conv.updated_at)
    }));
  }

  try {
    console.log('Fetching conversations for user:', userId);
    
    const { data, error } = await client
      .from('conversations')
      .select('id, title, created_at, updated_at, completed')
      .eq('user_id', userId)
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
    }));

    // Cache in local storage
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(conversations.map(conv => ({
      ...conv,
      created_at: conv.created_at.toISOString(),
      updated_at: conv.updated_at.toISOString()
    }))));

    return conversations;
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    // Fallback to local storage
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    return localConversations.map((conv: any) => ({
      ...conv,
      created_at: new Date(conv.created_at),
      updated_at: new Date(conv.updated_at)
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
}): Promise<void> => {
  const client = checkSupabase();
  
  if (!client) {
    // Fallback to local storage
    const userId = conversationId.split('_')[0]; // Extract user ID from conversation ID
    const localConversations = JSON.parse(localStorage.getItem(`conversations_${userId}`) || '[]');
    const updatedConversations = localConversations.map((conv: any) => 
      conv.id === conversationId ? { ...conv, ...updates, updated_at: new Date().toISOString() } : conv
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
      conv.id === conversationId ? { ...conv, ...updates, updated_at: new Date().toISOString() } : conv
    );
    localStorage.setItem(`conversations_${userId}`, JSON.stringify(updatedConversations));
    console.log('Conversation updated in local storage as fallback');
  }
};

// Enhanced Goal Operations with Local Storage Fallback and Memory Persistence
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
      console.error('❌ Database save failed, but goal is preserved in local storage:', error);
      // Don't throw error - goal is already saved locally
      return;
    }

    console.log('✅ Goal saved successfully to database');
  } catch (error) {
    console.error('❌ Error saving goal to database, but preserved in local storage:', error);
    // Don't throw error - goal is already saved locally
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
    const { data, error } = await client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database fetch failed, using local storage:', error);
      return goalsFromLocal;
    }

    const goalsFromDB = (data || []).map(goal => ({
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

    // Merge with local storage
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

    // Update local storage cache
    localStorage.setItem(`goals_${userId}`, JSON.stringify(mergedGoals.map(goal => ({
      ...goal,
      createdAt: goal.createdAt.toISOString(),
      completedAt: goal.completedAt?.toISOString() || null,
      deadline: goal.deadline?.toISOString() || null
    }))));

    console.log('✅ Goals loaded and cached:', mergedGoals.length);
    return mergedGoals;
  } catch (error) {
    console.error('❌ Error fetching user goals from database, using local storage:', error);
    return goalsFromLocal;
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

// Remove redundant functions - keeping only essential ones
export const getAllUserGoals = getUserGoals; // Alias for consistency

// Remove legacy session operations to reduce redundancy
// These are no longer needed as we use conversations instead