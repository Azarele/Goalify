import { CoachingSession, UserProfile, Action } from '../types/coaching';

const SESSIONS_KEY = 'coaching_sessions';
const PROFILE_KEY = 'user_profile';
const ACTIONS_KEY = 'user_actions';

// Session management with on-demand loading
let sessionsCache: CoachingSession[] | null = null;
let currentSessionCache: CoachingSession | null = null;

export const saveSession = (session: CoachingSession): void => {
  // Clear cache to force reload
  sessionsCache = null;
  currentSessionCache = session;
  
  const sessions = getSessionsList();
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = {
      id: session.id,
      date: session.date,
      completed: session.completed,
      summary: session.summary,
      messageCount: session.messages?.length || 0
    };
  } else {
    sessions.push({
      id: session.id,
      date: session.date,
      completed: session.completed,
      summary: session.summary,
      messageCount: session.messages?.length || 0
    });
  }
  
  // Save session list
  localStorage.setItem(SESSIONS_KEY + '_list', JSON.stringify(sessions));
  
  // Save full session data separately
  localStorage.setItem(SESSIONS_KEY + '_' + session.id, JSON.stringify(session));
};

export const getSessionsList = (): Array<{
  id: string;
  date: Date;
  completed: boolean;
  summary?: string;
  messageCount: number;
}> => {
  const stored = localStorage.getItem(SESSIONS_KEY + '_list');
  if (!stored) return [];
  
  return JSON.parse(stored).map((session: any) => ({
    ...session,
    date: new Date(session.date)
  }));
};

export const getSession = (sessionId: string): CoachingSession | null => {
  // Check cache first
  if (currentSessionCache && currentSessionCache.id === sessionId) {
    return currentSessionCache;
  }
  
  const stored = localStorage.getItem(SESSIONS_KEY + '_' + sessionId);
  if (!stored) return null;
  
  const session = JSON.parse(stored);
  const fullSession = {
    ...session,
    date: new Date(session.date),
    messages: session.messages?.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    })) || [],
    actions: session.actions?.map((action: any) => ({
      ...action,
      deadline: action.deadline ? new Date(action.deadline) : undefined,
      createdAt: new Date(action.createdAt)
    })) || []
  };
  
  currentSessionCache = fullSession;
  return fullSession;
};

export const getSessions = (): CoachingSession[] => {
  if (sessionsCache) return sessionsCache;
  
  const sessionsList = getSessionsList();
  const sessions = sessionsList.map(sessionInfo => getSession(sessionInfo.id)).filter(Boolean) as CoachingSession[];
  
  sessionsCache = sessions;
  return sessions;
};

export const clearSessionCache = (): void => {
  sessionsCache = null;
  currentSessionCache = null;
};

export const getUserProfile = (): UserProfile => {
  const stored = localStorage.getItem(PROFILE_KEY);
  if (!stored) {
    return {
      preferences: {
        voiceEnabled: false,
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        memoryEnabled: true,
        tone: 'casual'
      },
      longTermGoals: [],
      currentChallenges: [],
      totalXP: 0,
      level: 1,
      achievements: []
    };
  }
  
  return JSON.parse(stored);
};

export const saveUserProfile = (profile: UserProfile): void => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getActions = (): Action[] => {
  const stored = localStorage.getItem(ACTIONS_KEY);
  if (!stored) return [];
  
  return JSON.parse(stored).map((action: any) => ({
    ...action,
    deadline: action.deadline ? new Date(action.deadline) : undefined,
    createdAt: new Date(action.createdAt)
  }));
};

export const saveAction = (action: Action): void => {
  const actions = getActions();
  const existingIndex = actions.findIndex(a => a.id === action.id);
  
  if (existingIndex >= 0) {
    actions[existingIndex] = action;
  } else {
    actions.push(action);
  }
  
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions));
};

export const getSessionActions = (sessionId: string): Action[] => {
  const session = getSession(sessionId);
  if (!session) return [];
  
  // Get actions created during this session's timeframe
  const sessionStart = session.date;
  const sessionEnd = new Date(sessionStart.getTime() + (2 * 60 * 60 * 1000)); // 2 hours after session start
  
  const allActions = getActions();
  return allActions.filter(action => 
    action.createdAt >= sessionStart && action.createdAt <= sessionEnd
  );
};