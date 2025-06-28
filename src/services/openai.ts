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
  timeout: 30000,
  maxRetries: 2,
}) : null;

// AI State Machine Types
export type AIState = 'COACHING' | 'PROPOSING_GOAL' | 'AWAITING_GOAL_RESPONSE' | 'CONCLUDING';

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
  };
}

// Strict AI State Machine Prompts
const COACHING_STATE_PROMPT = `You are an AI Coach in COACHING state. Follow these STRICT rules:

1. Ask ONE open-ended coaching question at a time
2. Reflect what the user says back to them
3. Help them discover their own answers
4. Keep responses under 40 words
5. NEVER give advice or suggestions
6. After 2-3 exchanges, you MUST transition to PROPOSING_GOAL state

Examples:
- "What's driving this feeling for you?"
- "How would success look to you?"
- "What's the one thing you'd focus on?"

CRITICAL: When you have enough information (after 2-3 user messages), your NEXT response must be a goal proposition.`;

const PROPOSING_GOAL_STATE_PROMPT = `You are an AI Coach in PROPOSING_GOAL state. 

CRITICAL RULES:
1. Your response must ONLY be the goal proposition
2. Start with exactly: "Based on what you've shared, can I set a small challenge for you?"
3. Follow with ONE specific, actionable goal
4. Keep the entire response under 50 words
5. Do NOT send any other text

Example format:
"Based on what you've shared, can I set a small challenge for you? [Specific actionable goal with timeframe]"

After sending this, you automatically move to AWAITING_GOAL_RESPONSE state.`;

const AWAITING_GOAL_RESPONSE_PROMPT = `You are an AI Coach in AWAITING_GOAL_RESPONSE state.

CRITICAL RULES:
1. You are waiting for the user's response to your goal proposition
2. If they accept (yes, okay, sure, sounds good): Ask "Is there anything else I can help you with today?"
3. If they decline or want changes: Return to COACHING state
4. Keep responses under 30 words
5. Do NOT propose new goals in this state`;

const CONCLUDING_STATE_PROMPT = `You are an AI Coach in CONCLUDING state.

CRITICAL RULES:
1. The user has indicated they're done (said no to "anything else")
2. Send ONE final encouraging message
3. Keep it under 40 words
4. End with something like "Good luck!" or "You've got this!"
5. This triggers the "End Chat" button to appear

Example: "Perfect! You're all set. Take your time with your challenge. Good luck!"`;

const VERIFICATION_PROMPT = `Verify goal completion and provide feedback.

Respond with:
1. "Verified" or "Unverified" 
2. One paragraph of constructive feedback

VERIFIED = Specific actions described with details
UNVERIFIED = Vague responses like "I did it" or "I worked on it"

Be encouraging but maintain standards.`;

const ANALYSIS_PROMPT = `Analyze user's coaching data and provide insights.

Based on the provided data, write a 2-3 paragraph analysis covering:
1. Overall progress patterns and strengths
2. Areas for improvement or focus
3. Specific recommendations for growth

Be encouraging, specific, and actionable. Focus on patterns in goal completion, conversation topics, and engagement.`;

// Demo responses for each state
const getDemoResponse = (messages: any[], context?: any): string => {
  const userMessages = messages.filter(m => m.role === 'user');
  const userCount = userMessages.length;
  
  // Determine AI state based on context or conversation flow
  let aiState: AIState = context?.aiState || 'COACHING';
  
  // State machine logic for demo mode
  if (aiState === 'COACHING' && userCount >= 2) {
    aiState = 'PROPOSING_GOAL';
  }
  
  switch (aiState) {
    case 'COACHING':
      const coachingResponses = [
        "What's driving this feeling for you?",
        "What would success look like?",
        "What's the one thing you'd focus on?",
        "How does that make you feel?"
      ];
      return coachingResponses[Math.min(userCount - 1, coachingResponses.length - 1)] || coachingResponses[0];
      
    case 'PROPOSING_GOAL':
      return "Based on what you've shared, can I set a small challenge for you? Write down 3 specific things you want to achieve this week.";
      
    case 'AWAITING_GOAL_RESPONSE':
      if (context?.userAcceptedGoal) {
        return "Is there anything else I can help you with today?";
      }
      return "What do you think about this challenge?";
      
    case 'CONCLUDING':
      return "Perfect! You're all set. Take your time with your challenge and remember you can always come back. Good luck!";
      
    default:
      return "What's on your mind today?";
  }
};

const handleError = (error: any): string => {
  console.error('OpenAI error:', error.status, error.message);
  
  if (error.status === 401) return "Please check your OpenAI API key.";
  if (error.status === 429) return "Too many requests. Please wait a moment.";
  if (error.status === 402) return "OpenAI billing issue. Check your credits.";
  if (error.status >= 500) return "OpenAI servers temporarily unavailable.";
  
  return "Connection trouble. Please try again.";
};

// Determine AI state based on conversation context
const determineAIState = (messages: any[], context?: any): AIState => {
  if (context?.aiState) return context.aiState;
  
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  // Check if goal was already proposed
  const goalProposed = assistantMessages.some(m => 
    m.content.includes('can I set a small challenge for you')
  );
  
  if (goalProposed) {
    // Check if user responded to goal
    const lastUserMessage = userMessages[userMessages.length - 1]?.content.toLowerCase();
    const userAccepted = lastUserMessage && (
      lastUserMessage.includes('yes') || 
      lastUserMessage.includes('okay') || 
      lastUserMessage.includes('sure') ||
      lastUserMessage.includes('sounds good')
    );
    
    if (userAccepted) {
      // Check if "anything else" was asked
      const askedAnythingElse = assistantMessages.some(m => 
        m.content.includes('Is there anything else I can help you with')
      );
      
      if (askedAnythingElse) {
        const userSaidNo = lastUserMessage && (
          lastUserMessage.includes('no') ||
          lastUserMessage.includes('nothing') ||
          lastUserMessage.includes("i'm good") ||
          lastUserMessage.includes("that's all")
        );
        
        if (userSaidNo) {
          return 'CONCLUDING';
        }
      }
      
      return 'AWAITING_GOAL_RESPONSE';
    }
    
    return 'AWAITING_GOAL_RESPONSE';
  }
  
  // Transition to goal proposal after 2-3 user messages
  if (userMessages.length >= 2 && userMessages.length <= 4) {
    return 'PROPOSING_GOAL';
  }
  
  return 'COACHING';
};

export const generateCoachingResponse = async (prompt: CoachingPrompt): Promise<{
  response: string;
  aiState: AIState;
  shouldShowEndChat: boolean;
}> => {
  const aiState = determineAIState(prompt.messages, prompt.context);
  
  if (!isOpenAIConfigured || !openai) {
    const response = getDemoResponse(prompt.messages, { ...prompt.context, aiState });
    return {
      response,
      aiState,
      shouldShowEndChat: aiState === 'CONCLUDING'
    };
  }

  try {
    let systemPrompt = '';
    
    switch (aiState) {
      case 'COACHING':
        systemPrompt = COACHING_STATE_PROMPT;
        break;
      case 'PROPOSING_GOAL':
        systemPrompt = PROPOSING_GOAL_STATE_PROMPT;
        break;
      case 'AWAITING_GOAL_RESPONSE':
        systemPrompt = AWAITING_GOAL_RESPONSE_PROMPT;
        break;
      case 'CONCLUDING':
        systemPrompt = CONCLUDING_STATE_PROMPT;
        break;
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...prompt.messages
    ];

    if (prompt.context) {
      const contextMessage = `Context: ${prompt.context.userName ? `User: ${prompt.context.userName}. ` : ''}Current AI State: ${aiState}. ${
        prompt.context.userAcceptedGoal ? 'User accepted the goal. ' : ''
      }`;
      messages.splice(1, 0, { role: 'system', content: contextMessage });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: aiState === 'PROPOSING_GOAL' ? 80 : 120,
      temperature: 0.7,
    });

    const responseText = response.choices[0]?.message?.content || "What's on your mind?";
    
    return {
      response: responseText,
      aiState,
      shouldShowEndChat: aiState === 'CONCLUDING'
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

export const generateGoalFromConversation = async (conversationHistory: string): Promise<{
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  xpValue: number;
} | null> => {
  if (!isOpenAIConfigured || !openai) {
    return {
      description: "Write down 3 things you want to achieve this week",
      difficulty: 'easy',
      timeframe: '24 hours',
      xpValue: 50
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Generate ONE goal as JSON:
{
  "description": "Action-oriented task",
  "difficulty": "easy|medium|hard", 
  "timeframe": "24 hours|3 days|1 week",
  "xpValue": 50-200
}

Make it specific, measurable, achievable.`
        },
        { role: 'user', content: conversationHistory }
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  } catch (error) {
    console.error('Goal generation error:', error);
    return null;
  }
};

export const verifyGoalCompletion = async (goalDescription: string, userReasoning: string): Promise<{
  verified: boolean;
  feedback: string;
}> => {
  if (!isOpenAIConfigured || !openai) {
    const isValid = userReasoning.trim().length > 20;
    return {
      verified: isValid,
      feedback: isValid 
        ? "Good detail! Keep being specific about your achievements."
        : "Please provide more specific details about what you did."
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: VERIFICATION_PROMPT },
        { role: 'user', content: `Goal: ${goalDescription}\n\nReasoning: ${userReasoning}` }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) throw new Error('No response');

    const lines = result.split('\n').filter(line => line.trim());
    const verified = lines[0]?.toLowerCase().includes('verified') && 
                    !lines[0]?.toLowerCase().includes('unverified');
    const feedback = lines.slice(1).join(' ').trim() || 
                    (verified ? "Great work!" : "Please provide more detail.");

    return { verified, feedback };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      verified: false,
      feedback: 'Verification failed. Please try again with more details.'
    };
  }
};

export const generateUserAnalysis = async (userData: {
  totalGoals: number;
  completedGoals: number;
  totalConversations: number;
  dailyStreak: number;
  level: number;
  totalXP: number;
  recentGoals: Array<{ description: string; completed: boolean; difficulty: string }>;
  conversationTopics: string[];
}): Promise<string> => {
  if (!isOpenAIConfigured || !openai) {
    return `You've made excellent progress with ${userData.completedGoals} completed goals out of ${userData.totalGoals} total challenges. Your ${userData.dailyStreak}-day streak shows consistent engagement, and reaching Level ${userData.level} demonstrates real commitment to growth.

Looking at your goal patterns, you show strong follow-through when challenges are specific and actionable. Your conversation topics suggest you're actively working on multiple areas of personal development, which is commendable.

To continue growing, consider focusing on one primary area at a time for deeper progress. Your consistency is your strength - keep building on that foundation while gradually increasing challenge difficulty as you gain confidence.`;
  }

  try {
    const dataString = `
Total Goals: ${userData.totalGoals}
Completed Goals: ${userData.completedGoals}
Completion Rate: ${userData.totalGoals > 0 ? Math.round((userData.completedGoals / userData.totalGoals) * 100) : 0}%
Total Conversations: ${userData.totalConversations}
Daily Streak: ${userData.dailyStreak}
Level: ${userData.level}
Total XP: ${userData.totalXP}
Recent Goals: ${userData.recentGoals.map(g => `${g.description} (${g.difficulty}, ${g.completed ? 'completed' : 'pending'})`).join(', ')}
Conversation Topics: ${userData.conversationTopics.join(', ')}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: dataString }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "Your coaching journey shows consistent progress and engagement. Keep building on your strengths while exploring new areas for growth.";
  } catch (error) {
    console.error('Analysis generation error:', error);
    return "Your coaching journey shows consistent progress and engagement. Keep building on your strengths while exploring new areas for growth.";
  }
};

export { isOpenAIConfigured };
export type { AIState };