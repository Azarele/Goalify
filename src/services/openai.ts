import OpenAI from 'openai';

// Check if OpenAI API key is configured
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const isOpenAIConfigured = Boolean(apiKey && apiKey.length > 20);

// Log configuration status with more details
if (isOpenAIConfigured) {
  console.log('✅ OpenAI configured successfully');
  console.log('🔑 API Key length:', apiKey.length);
  console.log('🔑 API Key prefix:', apiKey.substring(0, 7) + '...');
} else {
  console.log('⚠️ OpenAI not configured - using demo responses');
  console.log('🔑 API Key present:', Boolean(apiKey));
  console.log('🔑 API Key length:', apiKey?.length || 0);
}

const openai = isOpenAIConfigured ? new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true,
  timeout: 30000, // 30 second timeout
  maxRetries: 2, // Retry failed requests
}) : null;

export interface CoachingPrompt {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  context?: {
    userName?: string;
    previousGoals?: string[];
    currentStage?: string;
    sessionHistory?: string;
    goalAlreadySet?: boolean;
  };
}

const COACHING_SYSTEM_PROMPT = `You are an AI Coach using a conversational approach. You are NOT a mentor, advisor, or teacher.

Your ONLY role is to:
- Ask thought-provoking, open-ended questions
- Reflect what the user says back to them
- Help them discover their own answers
- Set clear, achievable goals based on what they share
- Keep them accountable

CRITICAL COACHING BEHAVIOR:
- Never give advice, suggestions, or share your expertise
- Don't say "you should" or "I recommend" or "try this"
- Ask questions like: "What do you think about that?" "How does that feel?" "What would happen if...?"
- Reflect: "I hear you saying..." "It sounds like..." "What I'm noticing is..."

GOAL GENERATION FLOW:
After 2-4 user exchanges, identify what the user is struggling with or wants to achieve. Then say:
"Based on what you've shared, can I set a small challenge for you?"

Generate 1 specific, measurable goal with:
- Clear action (what exactly to do)
- Time limit (24 hours, 3 days, 1 week max)
- Success criteria (how they'll know it's done)

Examples:
"Draft your CV and send it to 1 person for feedback within 48 hours"
"Spend 30 minutes tomorrow researching remote job platforms"
"Have one difficult conversation you've been avoiding by Friday"

AFTER SETTING A GOAL:
Your ONLY follow-up question must be: "Is there anything else I can help you with today?"
Do NOT ask any other coaching questions at this stage.

If the user says "no" or indicates they are finished, conclude gracefully with encouragement.

CONVERSATION STYLE:
- Natural, warm, curious
- One question at a time
- Build on their responses
- Keep responses under 50 words
- Focus on their thinking, not your knowledge

Remember: You're a thinking partner. They have the answers - you help them find them.`;

const VERIFICATION_SYSTEM_PROMPT = `You are a goal completion verifier and feedback provider. Your job is to:

1. Determine if a user has legitimately completed their goal based on their reasoning
2. Provide constructive feedback focusing on what they did well and what they could improve

VERIFICATION CRITERIA:
- The user must provide specific actions they took
- The actions should logically lead to goal completion
- Look for concrete details, not vague statements
- Consider effort and genuine attempt, not just perfect results

RESPONSE FORMAT:
Respond with exactly two parts:

Part 1: A single word: "Verified" or "Unverified"
Part 2: A short paragraph of feedback focusing on what they did well and what they could do better in the future to improve.

Examples of GOOD reasoning that should be "Verified":
- "I spent 2 hours updating my resume, added 3 new skills, and sent it to my mentor Sarah for feedback"
- "I researched 5 job sites (Indeed, LinkedIn, etc.) for 45 minutes and bookmarked 8 relevant positions"

Examples of POOR reasoning that should be "Unverified":
- "I did it"
- "I worked on my resume"
- "I looked at some job sites"

Be encouraging but maintain standards for verification. Always provide constructive feedback regardless of verification status.`;

// Demo responses for when OpenAI is not configured
const getDemoResponse = (messages: any[], context?: any): string => {
  const userMessages = messages.filter(m => m.role === 'user');
  const messageCount = userMessages.length;

  // If goal already set, only ask the follow-up question
  if (context?.goalAlreadySet) {
    return "Is there anything else I can help you with today?";
  }

  const demoResponses = [
    "That's really interesting. What's driving this feeling for you right now?",
    "I hear you saying this is important to you. What would success look like?",
    "Based on what you've shared, can I set a small challenge for you? How about spending 15 minutes today writing down your thoughts about this topic?",
    "What would need to change for you to feel more confident about this situation?",
    "If you had to choose just one thing to focus on, what would it be?"
  ];

  return demoResponses[Math.min(messageCount - 1, demoResponses.length - 1)] || demoResponses[0];
};

// Enhanced error handling function
const handleOpenAIError = (error: any): string => {
  console.error('OpenAI API detailed error:', {
    message: error.message,
    status: error.status,
    code: error.code,
    type: error.type,
    stack: error.stack
  });

  // Check for specific error types
  if (error.status === 401) {
    console.error('❌ OpenAI Authentication Error - Check your API key');
    return "I'm having trouble connecting right now. Please check your OpenAI API key configuration.";
  }
  
  if (error.status === 429) {
    console.error('❌ OpenAI Rate Limit Error - Too many requests');
    return "I'm receiving too many requests right now. Please wait a moment and try again.";
  }
  
  if (error.status === 402) {
    console.error('❌ OpenAI Billing Error - Insufficient credits');
    return "There seems to be a billing issue with the OpenAI account. Please check your credits.";
  }
  
  if (error.status >= 500) {
    console.error('❌ OpenAI Server Error - Service temporarily unavailable');
    return "OpenAI's servers are temporarily unavailable. Please try again in a moment.";
  }
  
  if (error.message?.includes('fetch')) {
    console.error('❌ Network Error - Connection failed');
    return "I'm having trouble connecting right now. Please check your internet connection.";
  }

  return "I'm having trouble connecting right now. Could you try again?";
};

export const generateCoachingResponse = async (prompt: CoachingPrompt): Promise<string> => {
  if (!isOpenAIConfigured || !openai) {
    console.log('Using demo response (OpenAI not configured)');
    return getDemoResponse(prompt.messages, prompt.context);
  }

  try {
    console.log('🤖 Sending request to OpenAI...');
    
    const messages = [
      { role: 'system' as const, content: COACHING_SYSTEM_PROMPT },
      ...prompt.messages
    ];

    if (prompt.context) {
      const contextMessage = `Context: ${prompt.context.userName ? `User's name is ${prompt.context.userName}. ` : ''}${
        prompt.context.previousGoals?.length ? `Previous goals: ${prompt.context.previousGoals.join(', ')}. ` : ''
      }${prompt.context.sessionHistory ? `Recent session summary: ${prompt.context.sessionHistory}. ` : ''}${
        prompt.context.goalAlreadySet ? 'A goal has already been set in this session. ' : ''
      }`;
      
      messages.splice(1, 0, { role: 'system', content: contextMessage });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: 200,
      temperature: 0.7,
    });

    console.log('✅ OpenAI response received successfully');
    return response.choices[0]?.message?.content || "What's on your mind today?";
  } catch (error) {
    const fallbackResponse = handleOpenAIError(error);
    return fallbackResponse;
  }
};

export const generateGoalFromConversation = async (conversationHistory: string): Promise<{
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  xpValue: number;
} | null> => {
  if (!isOpenAIConfigured || !openai) {
    // Return a demo goal
    return {
      description: "Write down 3 specific things you want to achieve this week",
      difficulty: 'easy',
      timeframe: '24 hours',
      xpValue: 50
    };
  }

  try {
    console.log('🎯 Generating goal from conversation...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Based on this conversation, generate ONE specific, achievable goal for the user. 

Format your response as JSON:
{
  "description": "Specific action they should take",
  "difficulty": "easy|medium|hard",
  "timeframe": "24 hours|3 days|1 week",
  "xpValue": 50-200
}

Make it:
- Specific and measurable
- Achievable in the timeframe
- Directly related to what they discussed
- Action-oriented (starts with a verb)

Examples:
- "Send 3 job applications by Friday"
- "Have a 15-minute conversation with your manager about workload tomorrow"
- "Research and list 5 potential networking events this week"`
        },
        {
          role: 'user',
          content: conversationHistory
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      try {
        console.log('✅ Goal generated successfully');
        return JSON.parse(content);
      } catch (parseError) {
        console.error('❌ Failed to parse goal JSON:', parseError);
        return null;
      }
    }
    return null;
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
    // In demo mode, provide basic verification
    const isValid = userReasoning.trim().length > 20;
    return {
      verified: isValid,
      feedback: isValid 
        ? "Great work! You provided good detail about your actions. Keep being specific about your achievements - it helps track your progress and builds confidence."
        : "Please provide more specific details about the actions you took to complete this challenge. What exactly did you do? The more detail you share, the better we can celebrate your success!"
    };
  }

  try {
    console.log('✅ Verifying goal completion...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Goal: ${goalDescription}\n\nUser's completion reasoning: ${userReasoning}`
        }
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      throw new Error('No response from verification');
    }

    // Parse the response to extract verification status and feedback
    const lines = result.split('\n').filter(line => line.trim());
    const verificationLine = lines[0]?.toLowerCase();
    const verified = verificationLine.includes('verified') && !verificationLine.includes('unverified');
    
    // Get feedback (everything after the first line)
    const feedback = lines.slice(1).join(' ').trim() || 
      (verified ? "Great work completing this challenge!" : "Please provide more detail about your completion.");

    console.log('✅ Goal verification completed:', verified ? 'Verified' : 'Unverified');
    
    return {
      verified,
      feedback
    };
  } catch (error) {
    console.error('Goal verification error:', error);
    return {
      verified: false,
      feedback: 'Verification failed. Please try again with more specific details about how you completed the challenge.'
    };
  }
};

export { isOpenAIConfigured };