import { CoachingSession } from '../types/coaching';

const SESSIONS_KEY = 'coaching_sessions';
const CURRENT_SESSION_KEY = 'current_session';

export const saveSession = (session: CoachingSession): void => {
  const sessions = getSessions();
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }
  
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

export const getSessions = (): CoachingSession[] => {
  const stored = localStorage.getItem(SESSIONS_KEY);
  if (!stored) return [];
  
  return JSON.parse(stored).map((session: any) => ({
    ...session,
    date: new Date(session.date),
    whatNext: {
      ...session.whatNext,
      deadline: session.whatNext.deadline ? new Date(session.whatNext.deadline) : null
    }
  }));
};

export const getCurrentSession = (): CoachingSession | null => {
  const stored = localStorage.getItem(CURRENT_SESSION_KEY);
  if (!stored) return null;
  
  const session = JSON.parse(stored);
  return {
    ...session,
    date: new Date(session.date),
    whatNext: {
      ...session.whatNext,
      deadline: session.whatNext.deadline ? new Date(session.whatNext.deadline) : null
    }
  };
};

export const saveCurrentSession = (session: CoachingSession): void => {
  localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
};

export const clearCurrentSession = (): void => {
  localStorage.removeItem(CURRENT_SESSION_KEY);
};

export const getCompletedActions = (): number => {
  const sessions = getSessions();
  return sessions.filter(s => s.completed).length;
};

export const getAverageMotivation = (): number => {
  const sessions = getSessions();
  const motivations = sessions.map(s => s.whatNext.motivation).filter(m => m > 0);
  return motivations.length > 0 ? motivations.reduce((a, b) => a + b, 0) / motivations.length : 0;
};