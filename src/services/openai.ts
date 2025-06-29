import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const isOpenAIConfigured = Boolean(apiKey && apiKey.length > 20);

if (isOpenAIConfigured) {
  console.log('✅ OpenAI configured');
} else {
  console.log('⚠️ OpenAI not configured - using demo responses');
}

const openai = isOpenAIConfigured ? new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true,
  timeout: 15000, // Reduced timeout
  maxRetries: 1, // Reduced retries
}) : null;

// CRITICAL: AI State Machine Types
export type AIState = 
  | 'COACHING_Q1'
  | 'COACHING_Q2' 
  | 'COACHING_Q3'
  | 'PROPOSING_GOAL'
  | 'AWAITING_GOAL_RESPONSE'
  | 'ASKING_TO_CONCLUDE'
  | 'AWAITING_FINAL_RESPONSE';

export interface CoachingPrompt {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  context?: {
    userName?: string;
    previousGoals?: string[];
    currentStage?: string;
    aiState?: AIState;
    goalProposed?: boolean;
    userAcceptedGoal?: boolean;
    userDeclinedGoal?: boolean;
    messageCount?: number;
    goalCount?: number;
    questionCount?: number;
    activeGoals?: number;
    completedGoals?: number;
  };
}

// ULTRA-MINIMAL: Core coaching prompt - heavily reduced
const CORE_PROMPT = `AI Coach. Ask 1 open question. Max 25 words. After 3 questions, propose goal with [GOAL] tag.

Rules:
- 1 question only
- Under 25 words
- No advice/opinions
- Reference user's active goals if relevant`;

// ULTRA-MINIMAL: Goal proposition - heavily reduced
const GOAL_PROMPT = `Propose 1 specific goal. Format: [GOAL] Can I suggest: [action]

Max 30 words total.`;

// ULTRA-MINIMAL: Verification prompt - heavily reduced  
const VERIFY_PROMPT = `Rate completion 1-10. If 7+: "Verified: [reason]". If <7: "More detail needed: [why]"

Max 20 words.`;

// ULTRA-MINIMAL: Analysis prompt - heavily reduced
const ANALYSIS_PROMPT = `2 sentences max. Focus: progress patterns, next steps.`;

// ULTRA-MINIMAL: Labeling prompt - heavily reduced
const LABEL_PROMPT = `Create short title (max 40 chars) and category from: career,health,relationships,productivity,personal,goals,general

Format: {"label":"title","category":"type"}`;

// CRITICAL: Enhanced demo responses with goal memory integration
const getDemoResponse = (messages: any[], context?: any): { response: string; aiState: AIState; shouldShowEndChat: boolean } => {
  const userMessages = messages.filter(m => m.role === 'user');
  const userCount = userMessages.length;
  const goalCount = context?.goalCount || 0;
  const activeGoals = context?.activeGoals || 0;
  const completedGoals = context?.completedGoals || 0;
  const questionCount = context?.questionCount || 0;
  
  // Determine AI state based on structured coaching cycle
  let aiState: AIState = context?.aiState || 'COACHING_Q1';
  
  // CRITICAL: Implement three-question rule
  if (aiState.startsWith('COACHING_') && questionCount >= 3) {
    aiState = 'PROPOSING_GOAL';
  }
  
  // Only conclude after creating multiple goals
  if (aiState === 'COACHING_Q1' && goalCount >= 3 && userCount >= 10) {
    aiState = 'ASKING_TO_CONCLUDE';
  }
  
  switch (aiState) {
    case 'COACHING_Q1':
      const q1Responses = [
        activeGoals > 0 ? `You have ${activeGoals} goals. What's your biggest challenge now?` : "What's your biggest challenge right now?",
        completedGoals > 0 ? `Great job on ${completedGoals} goals! What's on your mind?` : "What's been on your mind lately?",
        "What would you like to improve this week?",
        "What would make the biggest difference for you?",
        "What have you been putting off?"
      ];
      return {
        response: q1Responses[Math.min(userCount - 1, q1Responses.length - 1)] || q1Responses[0],
        aiState: 'COACHING_Q2',
        shouldShowEndChat: false
      };
      
    case 'COACHING_Q2':
      const q2Responses = [
        "What's holding you back from action?",
        "How does this situation make you feel?",
        "What would success look like?",
        "What's one small step you could take?",
        "What resources do you have?"
      ];
      return {
        response: q2Responses[Math.min(userCount - 2, q2Responses.length - 1)] || q2Responses[0],
        aiState: 'COACHING_Q3',
        shouldShowEndChat: false
      };
      
    case 'COACHING_Q3':
      const q3Responses = [
        "What would happen if you acted tomorrow?",
        "Who could support you with this?",
        "What's the first thing you'd need to do?",
        "What would change if you solved this?",
        "What's stopping you from starting today?"
      ];
      return {
        response: q3Responses[Math.min(userCount - 3, q3Responses.length - 1)] || q3Responses[0],
        aiState: 'PROPOSING_GOAL',
        shouldShowEndChat: false
      };
      
    case 'PROPOSING_GOAL':
      const goalExamples = [
        "[GOAL] Can I suggest: Write 3 specific improvements by tomorrow",
        "[GOAL] Can I suggest: Research 2 solutions this week",
        "[GOAL] Can I suggest: Have 10-minute conversation by Friday",
        "[GOAL] Can I suggest: Organize one area today",
        "[GOAL] Can I suggest: List 5 steps this week"
      ];
      return {
        response: goalExamples[Math.min(goalCount, goalExamples.length - 1)] || goalExamples[0],
        aiState: 'AWAITING_GOAL_RESPONSE',
        shouldShowEndChat: false
      };
      
    case 'AWAITING_GOAL_RESPONSE':
      if (context?.userAcceptedGoal) {
        return {
          response: activeGoals > 0 ? `Perfect! ${activeGoals + 1} goals now. What else?` : "Perfect! What else?",
          aiState: 'COACHING_Q1',
          shouldShowEndChat: false
        };
      } else if (context?.userDeclinedGoal) {
        return {
          response: "Understood. Another area to focus on?",
          aiState: 'COACHING_Q1',
          shouldShowEndChat: false
        };
      }
      return {
        response: "Please respond to the goal above.",
        aiState,
        shouldShowEndChat: false
      };
      
    case 'ASKING_TO_CONCLUDE':
      return {
        response: `Great progress! ${activeGoals} goals ready. Anything else today?`,
        aiState: 'AWAITING_FINAL_RESPONSE',
        shouldShowEndChat: false
      };
      
    case 'AWAITING_FINAL_RESPONSE':
      return {
        response: `Excellent! ${activeGoals} clear steps. Good luck!`,
        aiState,
        shouldShowEndChat: true
      };
      
    default:
      return {
        response: activeGoals > 0 ? `${activeGoals} goals active. What's on your mind?` : "What's on your mind?",
        aiState: 'COACHING_Q1',
        shouldShowEndChat: false
      };
  }
};

const handleError = (error: any): string => {
  console.error('OpenAI error:', error.status, error.message);
  
  if (error.status === 401) return "Check OpenAI API key.";
  if (error.status === 429) return "Too many requests. Wait.";
  if (error.status === 402) return "OpenAI billing issue.";
  if (error.status >= 500) return "OpenAI servers down.";
  
  return "Connection trouble.";
};

// CRITICAL: Enhanced AI state determination with goal memory
const determineAIState = (messages: any[], context?: any): AIState => {
  if (context?.aiState) return context.aiState;
  
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const goalCount = context?.goalCount || 0;
  
  // Count coaching questions asked (not including goal propositions)
  const coachingQuestions = assistantMessages.filter(m => 
    !m.content.includes('[GOAL]') && 
    !m.content.includes('anything else') &&
    m.content.includes('?')
  ).length;
  
  // Check if goal was already proposed
  const goalProposed = assistantMessages.some(m => m.content.includes('[GOAL]'));
  
  if (goalProposed) {
    // Find user response after goal proposal
    const goalMsgIndex = assistantMessages.findIndex(m => m.content.includes('[GOAL]'));
    
    if (goalMsgIndex >= 0) {
      const messagesAfterGoal = messages.slice(goalMsgIndex + 1);
      const userResponseAfterGoal = messagesAfterGoal.find(m => m.role === 'user');
      
      if (userResponseAfterGoal) {
        const response = userResponseAfterGoal.content.toLowerCase();
        const accepted = response.includes('accept') || response.includes('yes') || 
                        response.includes('okay') || response.includes('sure') ||
                        response.includes('sounds good') || response.includes('that works');
        const declined = response.includes('decline') || response.includes('no') ||
                        response.includes('not interested') || response.includes('skip');
        
        if (accepted || declined) {
          // After goal response, return to coaching cycle
          if (goalCount >= 3) {
            return 'ASKING_TO_CONCLUDE';
          } else {
            return 'COACHING_Q1'; // Start new coaching cycle
          }
        }
        
        return 'AWAITING_GOAL_RESPONSE';
      } else {
        return 'AWAITING_GOAL_RESPONSE';
      }
    }
  }
  
  // CRITICAL: Implement three-question rule
  if (coachingQuestions >= 3) {
    return 'PROPOSING_GOAL';
  }
  
  // Determine coaching question state
  if (coachingQuestions === 0) return 'COACHING_Q1';
  if (coachingQuestions === 1) return 'COACHING_Q2';
  if (coachingQuestions === 2) return 'COACHING_Q3';
  
  return 'COACHING_Q1';
};

export const generateCoachingResponse = async (prompt: CoachingPrompt): Promise<{
  response: string;
  aiState: AIState;
  shouldShowEndChat: boolean;
}> => {
  const aiState = determineAIState(prompt.messages, prompt.context);
  
  if (!isOpenAIConfigured || !openai) {
    return getDemoResponse(prompt.messages, { ...prompt.context, aiState });
  }

  try {
    // ULTRA-MINIMAL: Use gpt-3.5-turbo for cost efficiency
    const model = 'gpt-3.5-turbo';
    
    // ULTRA-MINIMAL: Construct minimal system prompt
    let systemPrompt = CORE_PROMPT;
    if (aiState === 'PROPOSING_GOAL') systemPrompt = GOAL_PROMPT;
    
    // ULTRA-MINIMAL: Only last 3 messages to minimize tokens
    const recentMessages = prompt.messages.slice(-3);
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...recentMessages
    ];

    // ULTRA-MINIMAL: Add minimal context
    if (prompt.context?.activeGoals || prompt.context?.completedGoals) {
      const contextMsg = `Active: ${prompt.context.activeGoals || 0}, Done: ${prompt.context.completedGoals || 0}`;
      messages.splice(1, 0, { role: 'system', content: contextMsg });
    }

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: aiState === 'PROPOSING_GOAL' ? 40 : 30, // Drastically reduced
      temperature: 0.7,
    });

    const responseText = response.choices[0]?.message?.content || "What's on your mind?";
    
    // Determine next state based on current state and response
    let nextState = aiState;
    let shouldShowEndChat = false;
    
    switch (aiState) {
      case 'COACHING_Q1':
        nextState = 'COACHING_Q2';
        break;
      case 'COACHING_Q2':
        nextState = 'COACHING_Q3';
        break;
      case 'COACHING_Q3':
        nextState = 'PROPOSING_GOAL';
        break;
      case 'PROPOSING_GOAL':
        nextState = 'AWAITING_GOAL_RESPONSE';
        break;
      case 'AWAITING_GOAL_RESPONSE':
        if (prompt.context?.userAcceptedGoal || prompt.context?.userDeclinedGoal) {
          nextState = 'COACHING_Q1'; // Start new cycle
        }
        break;
      case 'ASKING_TO_CONCLUDE':
        nextState = 'AWAITING_FINAL_RESPONSE';
        break;
      case 'AWAITING_FINAL_RESPONSE':
        shouldShowEndChat = true;
        break;
    }
    
    return {
      response: responseText,
      aiState: nextState,
      shouldShowEndChat
    };
  } catch (error) {
    const errorResponse = handleError(error);
    return {
      response: errorResponse,
      aiState,
      shouldShowEndChat: false
    };
  }
};

// ULTRA-MINIMAL: Goal generation with minimal tokens
export const generateGoalFromConversation = async (conversationHistory: string): Promise<{
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  xpValue: number;
} | null> => {
  if (!isOpenAIConfigured || !openai) {
    // Enhanced demo goals with more variety
    const demoGoals = [
      {
        description: "Write 3 specific improvements this week",
        difficulty: 'easy' as const,
        timeframe: '24 hours',
        xpValue: 50
      },
      {
        description: "Research 2 solutions for main challenge",
        difficulty: 'medium' as const,
        timeframe: '3 days',
        xpValue: 75
      },
      {
        description: "Have 15-minute conversation with helper",
        difficulty: 'medium' as const,
        timeframe: '1 week',
        xpValue: 100
      },
      {
        description: "Organize one problem area today",
        difficulty: 'easy' as const,
        timeframe: '24 hours',
        xpValue: 60
      },
      {
        description: "Make detailed plan for next steps",
        difficulty: 'hard' as const,
        timeframe: '3 days',
        xpValue: 120
      }
    ];
    
    return demoGoals[Math.floor(Math.random() * demoGoals.length)];
  }

  try {
    // ULTRA-MINIMAL: Only last 100 chars of conversation
    const shortHistory = conversationHistory.slice(-100);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Cheaper model
      messages: [
        {
          role: 'system',
          content: `JSON goal from chat. Format: {"description":"action","difficulty":"easy|medium|hard","timeframe":"24 hours|3 days|1 week","xpValue":50-150}`
        },
        { role: 'user', content: shortHistory }
      ],
      max_tokens: 60, // Drastically reduced
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  } catch (error) {
    console.error('Goal generation error:', error);
    return null;
  }
};

// ULTRA-MINIMAL: Goal verification with minimal tokens
export const verifyGoalCompletion = async (goalDescription: string, userReasoning: string): Promise<{
  verified: boolean;
  feedback: string;
}> => {
  if (!isOpenAIConfigured || !openai) {
    const isValid = userReasoning.trim().length > 25 && 
                   (userReasoning.includes('I ') || userReasoning.includes('spent') || 
                    userReasoning.includes('completed') || userReasoning.includes('did'));
    return {
      verified: isValid,
      feedback: isValid 
        ? "Great work! Specific action taken."
        : "Need more specific details about what you did."
    };
  }

  try {
    // ULTRA-MINIMAL: Truncate inputs to save tokens
    const shortGoal = goalDescription.slice(0, 50);
    const shortReason = userReasoning.slice(0, 100);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Cheaper model
      messages: [
        { 
          role: 'system', 
          content: VERIFY_PROMPT
        },
        { 
          role: 'user', 
          content: `Goal: ${shortGoal}\nDone: ${shortReason}`
        }
      ],
      max_tokens: 25, // Drastically reduced
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) throw new Error('No response');

    const verified = result.toLowerCase().includes('verified');
    const feedback = result || (verified ? "Good work!" : "More detail needed.");

    return { verified, feedback };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      verified: false,
      feedback: 'Verification failed. Try again.'
    };
  }
};

// ULTRA-MINIMAL: Conversation labeling with minimal tokens
export const generateConversationLabel = async (conversationTitle: string): Promise<{
  label: string;
  category: string;
} | null> => {
  if (!isOpenAIConfigured || !openai) {
    // Demo labeling for common patterns
    const title = conversationTitle.toLowerCase();
    
    if (title.includes('work') || title.includes('job') || title.includes('career')) {
      return { label: "Career Discussion", category: "career" };
    }
    if (title.includes('health') || title.includes('exercise') || title.includes('fitness')) {
      return { label: "Health Planning", category: "health" };
    }
    if (title.includes('time') || title.includes('productivity') || title.includes('organize')) {
      return { label: "Productivity Focus", category: "productivity" };
    }
    if (title.includes('goal') || title.includes('achieve') || title.includes('plan')) {
      return { label: "Goal Setting", category: "goals" };
    }
    if (title.includes('relationship') || title.includes('family') || title.includes('friend')) {
      return { label: "Relationship Growth", category: "relationships" };
    }
    
    return { label: "Personal Growth", category: "personal" };
  }

  try {
    // ULTRA-MINIMAL: Only first 30 chars of title
    const shortTitle = conversationTitle.slice(0, 30);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Cheaper model
      messages: [
        { role: 'system', content: LABEL_PROMPT },
        { role: 'user', content: shortTitle }
      ],
      max_tokens: 30, // Drastically reduced
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return null;

    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse label JSON:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Labeling error:', error);
    return null;
  }
};

// ULTRA-MINIMAL: User analysis with minimal tokens
export const generateUserAnalysis = async (userData: {
  totalGoals: number;
  completedGoals: number;
  totalConversations: number;
  dailyStreak: number;
  level: number;
  totalXP: number;
}): Promise<string> => {
  if (!isOpenAIConfigured || !openai) {
    return `You've completed ${userData.completedGoals}/${userData.totalGoals} goals with a ${userData.dailyStreak}-day streak. Level ${userData.level} shows great progress. Focus on consistency and gradually increase challenge difficulty.`;
  }

  try {
    // ULTRA-MINIMAL: Only essential stats
    const stats = `Goals: ${userData.completedGoals}/${userData.totalGoals}, Level: ${userData.level}, Streak: ${userData.dailyStreak}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Cheaper model
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: stats }
      ],
      max_tokens: 50, // Drastically reduced
      temperature: 0.5,
    });

    return response.choices[0]?.message?.content || "Great progress! Keep building consistency.";
  } catch (error) {
    console.error('Analysis error:', error);
    return "Consistent progress shown. Keep building on your strengths.";
  }
};

export { isOpenAIConfigured };
export type { AIState };