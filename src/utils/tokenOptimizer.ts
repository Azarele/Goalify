import { OPENAI_CONFIG } from '../config/constants';

/**
 * Token optimization utilities to minimize OpenAI API usage
 */

// Truncate text to reduce token usage
export const truncateForTokens = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim();
};

// Extract only essential conversation context
export const extractEssentialContext = (messages: any[]): any[] => {
  // Only keep last N messages based on config
  const recentMessages = messages.slice(-OPENAI_CONFIG.contextWindow);
  
  // Truncate long messages
  return recentMessages.map(msg => ({
    ...msg,
    content: truncateForTokens(msg.content, 200)
  }));
};

// Minimize conversation history for goal generation
export const minimizeConversationHistory = (history: string): string => {
  return truncateForTokens(history, OPENAI_CONFIG.maxInputLength.conversation);
};

// Create minimal context string
export const createMinimalContext = (context: any): string => {
  const parts = [];
  
  if (context.activeGoals) parts.push(`Active: ${context.activeGoals}`);
  if (context.completedGoals) parts.push(`Done: ${context.completedGoals}`);
  if (context.userName) parts.push(`User: ${context.userName}`);
  
  return parts.join(', ');
};

// Optimize goal description for verification
export const optimizeGoalForVerification = (goal: string, reasoning: string) => {
  return {
    goal: truncateForTokens(goal, OPENAI_CONFIG.maxInputLength.goal),
    reasoning: truncateForTokens(reasoning, OPENAI_CONFIG.maxInputLength.reasoning)
  };
};

// Extract key stats for analysis
export const extractKeyStats = (userData: any): string => {
  return `Goals: ${userData.completedGoals}/${userData.totalGoals}, Level: ${userData.level}, Streak: ${userData.dailyStreak}`;
};

// Minimize conversation title for labeling
export const minimizeTitle = (title: string): string => {
  return truncateForTokens(title, 30);
};

// Count approximate tokens (rough estimation)
export const estimateTokens = (text: string): number => {
  // Rough estimation: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
};

// Validate token usage before API call
export const validateTokenUsage = (messages: any[], maxTokens: number): boolean => {
  const totalText = messages.map(m => m.content).join(' ');
  const estimatedTokens = estimateTokens(totalText);
  
  if (estimatedTokens > maxTokens * 0.8) { // 80% threshold
    console.warn(`High token usage detected: ~${estimatedTokens} tokens`);
    return false;
  }
  
  return true;
};

// Create ultra-minimal system prompts
export const createMinimalPrompt = (type: 'coaching' | 'goal' | 'verify' | 'analyze' | 'label'): string => {
  switch (type) {
    case 'coaching':
      return 'AI Coach. 1 question max 25 words. After 3 questions propose [GOAL].';
    case 'goal':
      return 'Create goal JSON: {"description":"action","difficulty":"easy|medium|hard","timeframe":"24h|3d|1w","xpValue":50-150}';
    case 'verify':
      return 'Rate 1-10. If 7+: "Verified: reason". If <7: "More detail: why". Max 20 words.';
    case 'analyze':
      return '2 sentences max. Focus: progress, next steps.';
    case 'label':
      return 'Short title (40 chars) + category: {"label":"title","category":"career|health|relationships|productivity|personal|goals|general"}';
    default:
      return 'Respond briefly.';
  }
};

// Log token usage for monitoring
export const logTokenUsage = (operation: string, inputTokens: number, outputTokens: number) => {
  const total = inputTokens + outputTokens;
  console.log(`🔢 ${operation}: ${total} tokens (in: ${inputTokens}, out: ${outputTokens})`);
  
  // Store in localStorage for tracking
  const usage = JSON.parse(localStorage.getItem('tokenUsage') || '{}');
  usage[operation] = (usage[operation] || 0) + total;
  localStorage.setItem('tokenUsage', JSON.stringify(usage));
};

// Get total token usage statistics
export const getTokenUsageStats = () => {
  return JSON.parse(localStorage.getItem('tokenUsage') || '{}');
};

// Reset token usage tracking
export const resetTokenUsage = () => {
  localStorage.removeItem('tokenUsage');
};