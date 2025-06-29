import { OPENAI_CONFIG } from '../config/constants';
import { 
  truncateForTokens, 
  extractEssentialContext, 
  createMinimalContext,
  createMinimalPrompt,
  logTokenUsage,
  estimateTokens
} from '../utils/tokenOptimizer';

/**
 * AI service optimizer to minimize token usage across all OpenAI calls
 */

// Optimized coaching response with minimal tokens
export const optimizeCoachingRequest = (messages: any[], context: any) => {
  // Extract only essential messages
  const essentialMessages = extractEssentialContext(messages);
  
  // Create minimal system prompt
  const systemPrompt = createMinimalPrompt('coaching');
  
  // Add minimal context if needed
  const contextString = createMinimalContext(context);
  
  const optimizedMessages = [
    { role: 'system', content: systemPrompt },
    ...(contextString ? [{ role: 'system', content: contextString }] : []),
    ...essentialMessages
  ];
  
  // Log estimated token usage
  const estimatedTokens = optimizedMessages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
  console.log(`🎯 Coaching request: ~${estimatedTokens} input tokens`);
  
  return {
    messages: optimizedMessages,
    maxTokens: OPENAI_CONFIG.maxTokens.coaching,
    temperature: OPENAI_CONFIG.temperature.coaching,
    model: OPENAI_CONFIG.model
  };
};

// Optimized goal generation with minimal tokens
export const optimizeGoalRequest = (conversationHistory: string) => {
  // Truncate conversation history
  const shortHistory = truncateForTokens(conversationHistory, OPENAI_CONFIG.maxInputLength.conversation);
  
  const messages = [
    { role: 'system', content: createMinimalPrompt('goal') },
    { role: 'user', content: shortHistory }
  ];
  
  const estimatedTokens = estimateTokens(shortHistory) + estimateTokens(createMinimalPrompt('goal'));
  console.log(`🎯 Goal generation: ~${estimatedTokens} input tokens`);
  
  return {
    messages,
    maxTokens: OPENAI_CONFIG.maxTokens.goalProposal,
    temperature: OPENAI_CONFIG.temperature.coaching,
    model: OPENAI_CONFIG.model
  };
};

// Optimized verification with minimal tokens
export const optimizeVerificationRequest = (goalDescription: string, userReasoning: string) => {
  // Truncate inputs
  const shortGoal = truncateForTokens(goalDescription, OPENAI_CONFIG.maxInputLength.goal);
  const shortReasoning = truncateForTokens(userReasoning, OPENAI_CONFIG.maxInputLength.reasoning);
  
  const messages = [
    { role: 'system', content: createMinimalPrompt('verify') },
    { role: 'user', content: `Goal: ${shortGoal}\nDone: ${shortReasoning}` }
  ];
  
  const estimatedTokens = estimateTokens(`${shortGoal} ${shortReasoning}`) + estimateTokens(createMinimalPrompt('verify'));
  console.log(`🎯 Verification: ~${estimatedTokens} input tokens`);
  
  return {
    messages,
    maxTokens: OPENAI_CONFIG.maxTokens.verification,
    temperature: OPENAI_CONFIG.temperature.verification,
    model: OPENAI_CONFIG.model
  };
};

// Optimized analysis with minimal tokens
export const optimizeAnalysisRequest = (userData: any) => {
  // Extract only essential stats
  const essentialStats = `Goals: ${userData.completedGoals}/${userData.totalGoals}, Level: ${userData.level}, Streak: ${userData.dailyStreak}`;
  
  const messages = [
    { role: 'system', content: createMinimalPrompt('analyze') },
    { role: 'user', content: essentialStats }
  ];
  
  const estimatedTokens = estimateTokens(essentialStats) + estimateTokens(createMinimalPrompt('analyze'));
  console.log(`🎯 Analysis: ~${estimatedTokens} input tokens`);
  
  return {
    messages,
    maxTokens: OPENAI_CONFIG.maxTokens.analysis,
    temperature: OPENAI_CONFIG.temperature.analysis,
    model: OPENAI_CONFIG.model
  };
};

// Optimized labeling with minimal tokens
export const optimizeLabelingRequest = (conversationTitle: string) => {
  // Truncate title
  const shortTitle = truncateForTokens(conversationTitle, 30);
  
  const messages = [
    { role: 'system', content: createMinimalPrompt('label') },
    { role: 'user', content: shortTitle }
  ];
  
  const estimatedTokens = estimateTokens(shortTitle) + estimateTokens(createMinimalPrompt('label'));
  console.log(`🎯 Labeling: ~${estimatedTokens} input tokens`);
  
  return {
    messages,
    maxTokens: OPENAI_CONFIG.maxTokens.labeling,
    temperature: OPENAI_CONFIG.temperature.labeling,
    model: OPENAI_CONFIG.model
  };
};

// Generic optimized OpenAI request wrapper
export const makeOptimizedRequest = async (
  openai: any,
  requestConfig: any,
  operationType: string
) => {
  try {
    const startTime = Date.now();
    const response = await openai.chat.completions.create(requestConfig);
    const endTime = Date.now();
    
    // Log performance and token usage
    const usage = response.usage;
    if (usage) {
      logTokenUsage(operationType, usage.prompt_tokens, usage.completion_tokens);
      console.log(`⚡ ${operationType} completed in ${endTime - startTime}ms`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ ${operationType} failed:`, error);
    throw error;
  }
};

// Batch optimization for multiple requests
export const optimizeBatchRequests = (requests: any[]) => {
  // Sort by priority (coaching > verification > analysis > labeling)
  const priorityOrder = ['coaching', 'verification', 'analysis', 'labeling'];
  
  return requests.sort((a, b) => {
    const aPriority = priorityOrder.indexOf(a.type) !== -1 ? priorityOrder.indexOf(a.type) : 999;
    const bPriority = priorityOrder.indexOf(b.type) !== -1 ? priorityOrder.indexOf(b.type) : 999;
    return aPriority - bPriority;
  });
};

// Smart caching for repeated requests
const requestCache = new Map();

export const getCachedResponse = (key: string) => {
  return requestCache.get(key);
};

export const setCachedResponse = (key: string, response: any, ttl: number = 300000) => { // 5 min TTL
  requestCache.set(key, {
    response,
    expires: Date.now() + ttl
  });
  
  // Clean expired entries
  setTimeout(() => {
    const entry = requestCache.get(key);
    if (entry && Date.now() > entry.expires) {
      requestCache.delete(key);
    }
  }, ttl);
};

// Generate cache key for requests
export const generateCacheKey = (type: string, input: string): string => {
  // Simple hash function for cache key
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `${type}_${Math.abs(hash)}`;
};