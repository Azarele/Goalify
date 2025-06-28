export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

export interface CoachingSession {
  id: string;
  date: Date;
  messages: Message[];
  goals: string[];
  insights: string[];
  actions: Action[];
  completed: boolean;
  summary?: string;
}

export interface Action {
  id: string;
  description: string;
  deadline?: Date;
  completed: boolean;
  motivation: number; // 1-10 scale
  createdAt: Date;
  xpValue?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface UserProfile {
  id?: string;
  name?: string;
  preferences: {
    voiceEnabled: boolean;
    voiceId: string;
    memoryEnabled: boolean;
    tone: 'formal' | 'casual';
  };
  longTermGoals: string[];
  currentChallenges: string[];
  totalXP?: number;
  level?: number;
  dailyStreak?: number;
  lastActivity?: Date | null;
  achievements?: string[];
}

export interface ConversationContext {
  currentGoal?: string;
  currentReality?: string;
  exploredOptions: string[];
  identifiedActions: Action[];
  growStage: 'exploring' | 'goal' | 'reality' | 'options' | 'action';
}

export interface Goal {
  id: string;
  description: string;
  xpValue: number;
  difficulty: 'easy' | 'medium' | 'hard';
  motivation: number;
  completed: boolean;
  completedAt?: Date;
  completionReasoning?: string;
  deadline?: Date;
  createdAt: Date;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: Date;
}