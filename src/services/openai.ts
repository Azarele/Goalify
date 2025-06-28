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

// Enhanced AI State Machine Types - Goal-Focused Model
export type AIState = 'COACHING' | 'PROPOSING_GOAL' | 'AWAITING_GOAL_RESPONSE' | 'ASKING_TO_CONCLUDE' | 'AWAITING_FINAL_RESPONSE';

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
    messageCount?: number;
    goalCount?: number;
  };
}

// CRITICAL: Core AI Persona & Coaching Values System Prompt
const GOALIFY_CORE_PROMPT = `You are Goalify, an AI Coach. Your primary role is to be a supportive, non-directive thinking partner. You do not give advice, share opinions, or solve problems for the user. Your mission is to help the user gain clarity and find their own solutions by asking powerful, open-ended questions.

YOUR CORE COACHING PRINCIPLES:

1. BE A MIRROR, NOT A MAP: Reflect the user's thoughts and feelings back to them to help them see their situation more clearly. Never tell them where to go.

2. ASK, DON'T TELL: Your primary tool is the open-ended question. Avoid questions that can be answered with "yes" or "no."
   - Good: "What would that make possible for you?"
   - Bad: "Should you do that?"

3. MAINTAIN UNCONDITIONAL POSITIVE REGARD: You are always on the user's side. Be encouraging, empathetic, and non-judgmental, creating a safe space for reflection.

4. LISTEN FOR POTENTIAL: Your goal is to help the user identify opportunities for action and growth within their own words.

CRITICAL COACHING BEHAVIOR:
- Never give advice, suggestions, or share your expertise
- Don't say "you should" or "I recommend" or "try this"
- Ask questions like: "What do you think about that?" "How does that feel?" "What would happen if...?"
- Reflect: "I hear you saying..." "It sounds like..." "What I'm noticing is..."
- Keep responses under 40 words
- Focus on their thinking, not your knowledge

Remember: You're a thinking partner. They have the answers - you help them find them.`;

const PROPOSING_GOAL_PROMPT = `You are Goalify in PROPOSING_GOAL state. Your mission is to help the user translate their insights into actionable goals.

NATURAL GOAL IDENTIFICATION: Do not force goals. Listen for natural moments in the conversation where the user expresses a desire for change, a need to solve a problem, or a clear next step. A goal should feel like a logical conclusion to a part of the conversation.

THE GOAL PROPOSITION FLOW:
1. When you identify a suitable opportunity, propose the challenge by asking for permission. 
   Example: "It sounds like you have a clear idea there. Can I suggest a challenge based on that?"

2. If the user agrees, formulate the goal using the [GOAL] tag.

FORMATTING FOR UI INTEGRATION: To ensure the goal appears correctly in the "Goals" tab, your message containing the goal must start with the [GOAL] tag.

Correct Format: [GOAL] Spend 20 minutes tomorrow morning outlining the first three steps for that project.

GOAL CREATION RULES:
- Make goals SPECIFIC and ACTIONABLE
- Set realistic timeframes (24 hours, 3 days, or 1 week max)
- Focus on immediate next steps
- Make them measurable and achievable
- Break down big problems into smaller actions

GOAL TYPES TO CREATE:
- Research goals: "Research 3 options for X by Friday"
- Communication goals: "Have a 10-minute conversation with Y about Z"
- Planning goals: "Write down 5 ideas for improving X"
- Decision goals: "Decide between A and B by Wednesday"
- Action goals: "Complete the first step of X tomorrow"
- Learning goals: "Watch one tutorial about Y this week"
- Organization goals: "Organize your X folder by Thursday"

After Setting the Goal: Once the goal is proposed, wait for the user's response before continuing the conversation.`;

const AWAITING_GOAL_RESPONSE_PROMPT = `You are Goalify in AWAITING_GOAL_RESPONSE state.

CRITICAL RULES:
1. Wait for user's response to your goal proposition
2. If they accept (yes, okay, sure, sounds good): Move to COACHING state to find MORE goals
3. If they decline: Modify the goal or return to COACHING state
4. Keep responses under 30 words
5. ALWAYS look for opportunities to create ADDITIONAL goals

IMPORTANT: After a goal is accepted, immediately return to COACHING to find the NEXT goal opportunity!`;

const ASKING_TO_CONCLUDE_PROMPT = `You are Goalify in ASKING_TO_CONCLUDE state.

CRITICAL RULES:
1. Only reach this state after creating MULTIPLE goals (3+ goals minimum)
2. Ask EXACTLY: "Great progress! We've identified several actionable steps. Is there anything else I can help you with today?"
3. Keep response under 25 words
4. After sending this, move to AWAITING_FINAL_RESPONSE state`;

const AWAITING_FINAL_RESPONSE_PROMPT = `You are Goalify in AWAITING_FINAL_RESPONSE state.

CRITICAL RULES:
1. If user says NO (no, nothing, that's all, I'm good): Send concluding message and trigger End Chat button
2. If user says YES or mentions anything new: Return to COACHING state to create MORE goals
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

// Enhanced demo responses with goal-focused coaching
const getDemoResponse = (messages: any[], context?: any): { response: string; aiState: AIState; shouldShowEndChat: boolean } => {
  const userMessages = messages.filter(m => m.role === 'user');
  const userCount = userMessages.length;
  const goalCount = context?.goalCount || 0;
  
  // Determine AI state based on context and goal creation strategy
  let aiState: AIState = context?.aiState || 'COACHING';
  
  // More aggressive goal creation - propose goals frequently
  if (aiState === 'COACHING' && userCount >= 1) {
    // Look for goal opportunities in user's last message
    const lastMessage = userMessages[userMessages.length - 1]?.content.toLowerCase() || '';
    const hasGoalTrigger = lastMessage.includes('need to') || 
                          lastMessage.includes('should') || 
                          lastMessage.includes('want to') ||
                          lastMessage.includes('thinking about') ||
                          lastMessage.includes('problem') ||
                          lastMessage.includes('challenge') ||
                          lastMessage.includes('improve') ||
                          lastMessage.includes('better') ||
                          lastMessage.includes('change') ||
                          lastMessage.includes('stuck') ||
                          lastMessage.includes('help');
    
    // Propose goals more frequently when triggers are present
    if (hasGoalTrigger || (userCount >= 2 && goalCount < 3)) {
      aiState = 'PROPOSING_GOAL';
    }
  }
  
  // Only conclude after creating multiple goals
  if (aiState === 'COACHING' && goalCount >= 3 && userCount >= 6) {
    aiState = 'ASKING_TO_CONCLUDE';
  }
  
  switch (aiState) {
    case 'COACHING':
      const coachingResponses = [
        "What's the biggest challenge you're facing right now?",
        "What's one thing you'd like to improve this week?",
        "What's been on your mind lately that you'd like to make progress on?",
        "What would make the biggest difference in your day-to-day life?",
        "What's something you've been putting off that you know you should do?",
        "What's one area where you feel stuck and need to move forward?",
        "What decision have you been avoiding that you need to make?",
        "What's something you want to learn or get better at?",
        "What would success look like for you in this situation?",
        "What's holding you back from taking action on this?"
      ];
      return {
        response: coachingResponses[Math.min(userCount - 1, coachingResponses.length - 1)] || coachingResponses[0],
        aiState,
        shouldShowEndChat: false
      };
      
    case 'PROPOSING_GOAL':
      const goalExamples = [
        "[GOAL] Write down 3 specific things you want to improve about your current situation by tomorrow",
        "[GOAL] Research 2 potential solutions for your main challenge this week",
        "[GOAL] Have a 10-minute conversation with someone who could help you with this by Friday",
        "[GOAL] Spend 20 minutes today organizing one area that's been bothering you",
        "[GOAL] Make a list of 5 small steps you could take toward your goal this week",
        "[GOAL] Dedicate 30 minutes tomorrow to planning your next move on this",
        "[GOAL] Identify 3 resources or tools that could help you with this challenge",
        "[GOAL] Schedule 15 minutes this week to reflect on what you really want here",
        "[GOAL] Complete one small task related to this goal by end of day tomorrow",
        "[GOAL] Reach out to one person who might have advice about this situation"
      ];
      return {
        response: goalExamples[Math.min(goalCount, goalExamples.length - 1)] || goalExamples[0],
        aiState: 'AWAITING_GOAL_RESPONSE',
        shouldShowEndChat: false
      };
      
    case 'AWAITING_GOAL_RESPONSE':
      if (context?.userAcceptedGoal) {
        return {
          response: "Perfect! What else would you like to work on or improve?",
          aiState: 'COACHING',
          shouldShowEndChat: false
        };
      }
      return {
        response: "What do you think about this challenge? Does it feel achievable?",
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
        aiState: 'COACHING',
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

// Enhanced AI state determination with goal-focused logic
const determineAIState = (messages: any[], context?: any): AIState => {
  if (context?.aiState) return context.aiState;
  
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const goalCount = context?.goalCount || 0;
  
  // Check if goal was already proposed
  const goalProposed = assistantMessages.some(m => 
    m.content.includes('[GOAL]') || m.content.includes('Can I suggest a challenge')
  );
  
  if (goalProposed) {
    // Find user response after goal proposal
    const goalMsgIndex = assistantMessages.findIndex(m => 
      m.content.includes('[GOAL]') || m.content.includes('Can I suggest a challenge')
    );
    
    if (goalMsgIndex >= 0) {
      const messagesAfterGoal = messages.slice(goalMsgIndex + 1);
      const userResponseAfterGoal = messagesAfterGoal.find(m => m.role === 'user');
      
      if (userResponseAfterGoal) {
        const response = userResponseAfterGoal.content.toLowerCase();
        const accepted = response.includes('yes') || response.includes('okay') || 
                        response.includes('sure') || response.includes('sounds good') ||
                        response.includes('that works') || response.includes('perfect');
        
        if (accepted) {
          // After accepting a goal, return to COACHING to find more goals
          // Only conclude after multiple goals (3+)
          if (goalCount >= 3) {
            const anythingElseMsg = messagesAfterGoal.find(m => 
              m.role === 'assistant' && m.content.includes('Is there anything else I can help you with')
            );
            
            if (anythingElseMsg) {
              const finalUserResponse = messages[messages.length - 1];
              if (finalUserResponse?.role === 'user') {
                const finalResponse = finalUserResponse.content.toLowerCase();
                const userSaidNo = finalResponse.includes('no') ||
                                  finalResponse.includes('nothing') ||
                                  finalResponse.includes("i'm good") ||
                                  finalResponse.includes("that's all");
                
                if (userSaidNo) {
                  return 'AWAITING_FINAL_RESPONSE';
                }
              }
              return 'AWAITING_FINAL_RESPONSE';
            } else {
              return 'ASKING_TO_CONCLUDE';
            }
          } else {
            // Return to coaching to create more goals
            return 'COACHING';
          }
        }
        
        return 'AWAITING_GOAL_RESPONSE';
      } else {
        return 'AWAITING_GOAL_RESPONSE';
      }
    }
  }
  
  // Enhanced goal creation triggers - listen for opportunities
  const lastUserMessage = userMessages[userMessages.length - 1]?.content.toLowerCase() || '';
  const hasGoalTrigger = lastUserMessage.includes('need to') || 
                        lastUserMessage.includes('should') || 
                        lastUserMessage.includes('want to') ||
                        lastUserMessage.includes('thinking about') ||
                        lastUserMessage.includes('problem') ||
                        lastUserMessage.includes('challenge') ||
                        lastUserMessage.includes('improve') ||
                        lastUserMessage.includes('better') ||
                        lastUserMessage.includes('change') ||
                        lastUserMessage.includes('help') ||
                        lastUserMessage.includes('stuck') ||
                        lastUserMessage.includes('difficult') ||
                        lastUserMessage.includes('goal') ||
                        lastUserMessage.includes('achieve');
  
  // Propose goals more frequently when triggers are present
  if ((userMessages.length >= 2 && hasGoalTrigger) || (userMessages.length >= 3 && goalCount < 3)) {
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
    return getDemoResponse(prompt.messages, { ...prompt.context, aiState });
  }

  try {
    let systemPrompt = '';
    
    switch (aiState) {
      case 'COACHING':
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
      const contextMessage = `Context: ${prompt.context.userName ? `User: ${prompt.context.userName}. ` : ''}Current AI State: ${aiState}. Goals Created: ${prompt.context.goalCount || 0}. ${
        prompt.context.userAcceptedGoal ? 'User accepted the goal. ' : ''
      }`;
      messages.splice(1, 0, { role: 'system', content: contextMessage });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: aiState === 'PROPOSING_GOAL' ? 100 : 150,
      temperature: 0.8, // Higher creativity for more varied responses
    });

    const responseText = response.choices[0]?.message?.content || "What's on your mind?";
    
    // Determine next state based on current state and response
    let nextState = aiState;
    let shouldShowEndChat = false;
    
    switch (aiState) {
      case 'PROPOSING_GOAL':
        nextState = 'AWAITING_GOAL_RESPONSE';
        break;
      case 'AWAITING_GOAL_RESPONSE':
        // If user accepted, return to COACHING to find more goals
        if (prompt.context?.userAcceptedGoal) {
          nextState = 'COACHING';
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