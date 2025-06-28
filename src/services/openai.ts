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

// CRITICAL: Structured Coaching Cycle State Machine
export type AIState = 
  | 'COACHING_Q1'     // First coaching question
  | 'COACHING_Q2'     // Second coaching question  
  | 'COACHING_Q3'     // Third coaching question
  | 'PROPOSING_GOAL'  // Must propose goal after 3 questions
  | 'AWAITING_GOAL_RESPONSE' // Waiting for Accept/Decline
  | 'ASKING_TO_CONCLUDE'     // After multiple goals
  | 'AWAITING_FINAL_RESPONSE'; // Final state

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
    questionCount?: number; // CRITICAL: Track questions asked
  };
}

// CRITICAL: Core AI Persona with Structured Coaching Rules
const GOALIFY_CORE_PROMPT = `You are Goalify, an AI Coach. Your primary role is to be a supportive, non-directive thinking partner. You do not give advice, share opinions, or solve problems for the user. Your mission is to help the user gain clarity and find their own solutions by asking powerful, open-ended questions.

YOUR CORE COACHING PRINCIPLES:

1. BE A MIRROR, NOT A MAP: Reflect the user's thoughts and feelings back to them to help them see their situation more clearly. Never tell them where to go.

2. ASK, DON'T TELL: Your primary tool is the open-ended question. Avoid questions that can be answered with "yes" or "no."
   - Good: "What would that make possible for you?"
   - Bad: "Should you do that?"

3. MAINTAIN UNCONDITIONAL POSITIVE REGARD: You are always on the user's side. Be encouraging, empathetic, and non-judgmental, creating a safe space for reflection.

4. LISTEN FOR POTENTIAL: Your goal is to help the user identify opportunities for action and growth within their own words.

CRITICAL STRUCTURED COACHING RULES:
- ONE QUESTION PER RESPONSE: Never ask multiple questions in a single message
- THREE-QUESTION RULE: After exactly 3 coaching questions, you MUST propose a goal
- Keep responses under 40 words
- Focus on their thinking, not your knowledge

Remember: You're a thinking partner. They have the answers - you help them find them.`;

const PROPOSING_GOAL_PROMPT = `You are Goalify in PROPOSING_GOAL state. You have asked exactly 3 coaching questions and MUST now propose a goal.

CRITICAL GOAL PROPOSITION RULES:
1. Start your message with the [GOAL] tag
2. Propose ONE specific, actionable goal based on the conversation
3. Ask for permission: "Can I suggest a challenge based on our conversation?"
4. Wait for explicit Accept/Decline response

FORMATTING FOR UI INTEGRATION: 
[GOAL] Can I suggest a challenge based on our conversation? [Specific actionable goal description]

GOAL CREATION RULES:
- Make goals SPECIFIC and ACTIONABLE
- Set realistic timeframes (24 hours, 3 days, or 1 week max)
- Focus on immediate next steps
- Make them measurable and achievable
- Break down big problems into smaller actions

After proposing the goal, wait for the user's Accept/Decline response.`;

const AWAITING_GOAL_RESPONSE_PROMPT = `You are Goalify in AWAITING_GOAL_RESPONSE state.

CRITICAL RULES:
1. Wait for user's explicit Accept or Decline response
2. If they Accept: Acknowledge and return to COACHING_Q1 for next cycle
3. If they Decline: Say "Understood. Is there another area you'd like to focus on?" and return to COACHING_Q1
4. Keep responses under 30 words
5. Do NOT ask coaching questions until goal response is received`;

const ASKING_TO_CONCLUDE_PROMPT = `You are Goalify in ASKING_TO_CONCLUDE state.

CRITICAL RULES:
1. Only reach this state after creating MULTIPLE goals (3+ goals minimum)
2. Ask EXACTLY: "Great progress! We've identified several actionable steps. Is there anything else I can help you with today?"
3. Keep response under 25 words
4. After sending this, move to AWAITING_FINAL_RESPONSE state`;

const AWAITING_FINAL_RESPONSE_PROMPT = `You are Goalify in AWAITING_FINAL_RESPONSE state.

CRITICAL RULES:
1. If user says NO (no, nothing, that's all, I'm good): Send concluding message
2. If user says YES or mentions anything new: Return to COACHING_Q1 state
3. Concluding message should be encouraging and under 40 words
4. Example: "Excellent! You have clear next steps to work with. Take your time with each goal and remember you can always come back for more coaching. Good luck!"`;

// Enhanced Goal Verification Prompt
const VERIFICATION_PROMPT = `You are a goal completion verifier. Analyze if the user legitimately completed their goal.

VERIFICATION STANDARDS:
- VERIFIED: Specific actions described with concrete details and results
- UNVERIFIED: Vague responses, no specific actions, or just intentions

RESPONSE FORMAT (exactly 2 lines):
Line 1: ONLY "Verified" or "Unverified"
Line 2: Constructive feedback paragraph (encouraging but honest)

VERIFIED Examples:
- "I spent 45 minutes researching 3 time management apps: Todoist, Notion, and TickTick. I compared their features and pricing."
- "I had a 20-minute conversation with my manager Sarah about my workload. We agreed to redistribute two projects."

UNVERIFIED Examples:
- "I thought about it"
- "I looked into some options"
- "I worked on it"

Be encouraging but maintain standards for verification.`;

const ANALYSIS_PROMPT = `Analyze user's coaching data and provide insights.

Based on the provided data, write a 2-3 paragraph analysis covering:
1. Overall progress patterns and strengths
2. Areas for improvement or focus
3. Specific recommendations for growth

Be encouraging, specific, and actionable. Focus on patterns in goal completion, conversation topics, and engagement.`;

// CRITICAL: Structured demo responses following the three-question rule
const getDemoResponse = (messages: any[], context?: any): { response: string; aiState: AIState; shouldShowEndChat: boolean } => {
  const userMessages = messages.filter(m => m.role === 'user');
  const userCount = userMessages.length;
  const goalCount = context?.goalCount || 0;
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
        "What's the biggest challenge you're facing right now?",
        "What's been on your mind lately that you'd like to make progress on?",
        "What's one thing you'd like to improve this week?",
        "What would make the biggest difference in your day-to-day life?",
        "What's something you've been putting off that you know you should do?"
      ];
      return {
        response: q1Responses[Math.min(userCount - 1, q1Responses.length - 1)] || q1Responses[0],
        aiState: 'COACHING_Q2',
        shouldShowEndChat: false
      };
      
    case 'COACHING_Q2':
      const q2Responses = [
        "What's holding you back from taking action on this?",
        "How does this situation make you feel?",
        "What would success look like for you here?",
        "What's one small step you could take toward this?",
        "What resources do you already have to help with this?"
      ];
      return {
        response: q2Responses[Math.min(userCount - 2, q2Responses.length - 1)] || q2Responses[0],
        aiState: 'COACHING_Q3',
        shouldShowEndChat: false
      };
      
    case 'COACHING_Q3':
      const q3Responses = [
        "What would happen if you took action on this tomorrow?",
        "Who could support you with this challenge?",
        "What's the first thing you'd need to do to move forward?",
        "What would change if you solved this problem?",
        "What's stopping you from starting today?"
      ];
      return {
        response: q3Responses[Math.min(userCount - 3, q3Responses.length - 1)] || q3Responses[0],
        aiState: 'PROPOSING_GOAL',
        shouldShowEndChat: false
      };
      
    case 'PROPOSING_GOAL':
      const goalExamples = [
        "[GOAL] Can I suggest a challenge based on our conversation? Write down 3 specific things you want to improve about your current situation by tomorrow",
        "[GOAL] Can I suggest a challenge based on our conversation? Research 2 potential solutions for your main challenge this week",
        "[GOAL] Can I suggest a challenge based on our conversation? Have a 10-minute conversation with someone who could help you with this by Friday",
        "[GOAL] Can I suggest a challenge based on our conversation? Spend 20 minutes today organizing one area that's been bothering you",
        "[GOAL] Can I suggest a challenge based on our conversation? Make a list of 5 small steps you could take toward your goal this week"
      ];
      return {
        response: goalExamples[Math.min(goalCount, goalExamples.length - 1)] || goalExamples[0],
        aiState: 'AWAITING_GOAL_RESPONSE',
        shouldShowEndChat: false
      };
      
    case 'AWAITING_GOAL_RESPONSE':
      if (context?.userAcceptedGoal) {
        return {
          response: "Perfect! What else would you like to work on?",
          aiState: 'COACHING_Q1',
          shouldShowEndChat: false
        };
      } else if (context?.userDeclinedGoal) {
        return {
          response: "Understood. Is there another area you'd like to focus on?",
          aiState: 'COACHING_Q1',
          shouldShowEndChat: false
        };
      }
      return {
        response: "I'm waiting for your response to the goal I proposed. Would you like to accept or decline this challenge?",
        aiState,
        shouldShowEndChat: false
      };
      
    case 'ASKING_TO_CONCLUDE':
      return {
        response: "Great progress! We've identified several actionable steps. Is there anything else I can help you with today?",
        aiState: 'AWAITING_FINAL_RESPONSE',
        shouldShowEndChat: false
      };
      
    case 'AWAITING_FINAL_RESPONSE':
      return {
        response: "Excellent! You have clear next steps to work with. Take your time with each goal and remember you can always come back for more coaching. Good luck!",
        aiState,
        shouldShowEndChat: true
      };
      
    default:
      return {
        response: "What's on your mind today?",
        aiState: 'COACHING_Q1',
        shouldShowEndChat: false
      };
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

// CRITICAL: Enhanced AI state determination with structured coaching cycle
const determineAIState = (messages: any[], context?: any): AIState => {
  if (context?.aiState) return context.aiState;
  
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const goalCount = context?.goalCount || 0;
  
  // Count coaching questions asked (not including goal propositions)
  const coachingQuestions = assistantMessages.filter(m => 
    !m.content.includes('[GOAL]') && 
    !m.content.includes('Is there anything else I can help you with') &&
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
    let systemPrompt = '';
    
    switch (aiState) {
      case 'COACHING_Q1':
      case 'COACHING_Q2':
      case 'COACHING_Q3':
        systemPrompt = GOALIFY_CORE_PROMPT;
        break;
      case 'PROPOSING_GOAL':
        systemPrompt = PROPOSING_GOAL_PROMPT;
        break;
      case 'AWAITING_GOAL_RESPONSE':
        systemPrompt = AWAITING_GOAL_RESPONSE_PROMPT;
        break;
      case 'ASKING_TO_CONCLUDE':
        systemPrompt = ASKING_TO_CONCLUDE_PROMPT;
        break;
      case 'AWAITING_FINAL_RESPONSE':
        systemPrompt = AWAITING_FINAL_RESPONSE_PROMPT;
        break;
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...prompt.messages
    ];

    if (prompt.context) {
      const contextMessage = `Context: ${prompt.context.userName ? `User: ${prompt.context.userName}. ` : ''}Current AI State: ${aiState}. Goals Created: ${prompt.context.goalCount || 0}. Question Count: ${prompt.context.questionCount || 0}. ${
        prompt.context.userAcceptedGoal ? 'User accepted the goal. ' : ''
      }${prompt.context.userDeclinedGoal ? 'User declined the goal. ' : ''}`;
      messages.splice(1, 0, { role: 'system', content: contextMessage });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: aiState === 'PROPOSING_GOAL' ? 100 : 150,
      temperature: 0.8,
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

// Enhanced goal generation with more variety and specificity
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
        description: "Write down 3 specific things you want to improve this week",
        difficulty: 'easy' as const,
        timeframe: '24 hours',
        xpValue: 50
      },
      {
        description: "Research 2 potential solutions for your main challenge",
        difficulty: 'medium' as const,
        timeframe: '3 days',
        xpValue: 75
      },
      {
        description: "Have a 15-minute conversation with someone who could help you",
        difficulty: 'medium' as const,
        timeframe: '1 week',
        xpValue: 100
      },
      {
        description: "Spend 30 minutes organizing one area that's been bothering you",
        difficulty: 'easy' as const,
        timeframe: '24 hours',
        xpValue: 60
      },
      {
        description: "Make a detailed plan for your next steps on this project",
        difficulty: 'hard' as const,
        timeframe: '3 days',
        xpValue: 120
      }
    ];
    
    return demoGoals[Math.floor(Math.random() * demoGoals.length)];
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Generate ONE specific, actionable goal as JSON based on the conversation:

{
  "description": "Specific action with clear outcome",
  "difficulty": "easy|medium|hard", 
  "timeframe": "24 hours|3 days|1 week",
  "xpValue": 50-150
}

GOAL CREATION RULES:
- Make it MICRO-SIZED and achievable
- Include specific actions (research, write, call, organize, etc.)
- Set realistic timeframes
- Focus on immediate next steps
- Make it measurable

GOAL TYPES:
- Research: "Research 3 options for X"
- Communication: "Have a conversation with Y about Z"
- Planning: "Write down 5 ideas for X"
- Organization: "Organize your X by Y"
- Decision: "Decide between A and B"
- Learning: "Watch/read about X"
- Action: "Complete first step of X"`
        },
        { role: 'user', content: conversationHistory }
      ],
      max_tokens: 120,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  } catch (error) {
    console.error('Goal generation error:', error);
    return null;
  }
};

// Enhanced goal verification with detailed feedback
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
        ? "Great work! I can see you took specific action. Keep being detailed about your achievements - it helps track your progress and builds momentum."
        : "I'd love to hear more specific details about what you actually did. What exact steps did you take? What was the outcome? The more specific you are, the better we can celebrate your progress!"
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: VERIFICATION_PROMPT
        },
        { 
          role: 'user', 
          content: `Goal: ${goalDescription}\n\nUser's explanation: ${userReasoning}`
        }
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) throw new Error('No response');

    // Parse the structured response
    const lines = result.split('\n').filter(line => line.trim());
    const verificationStatus = lines[0]?.trim().toLowerCase();
    const verified = verificationStatus === 'verified';
    const feedback = lines.slice(1).join(' ').trim() || 
                    (verified ? "Excellent work! You provided clear details about your actions." : "Please provide more specific details about what you actually did.");

    return { verified, feedback };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      verified: false,
      feedback: 'Verification failed. Please try again with more specific details about your actions and results.'
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
      max_tokens: 400,
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