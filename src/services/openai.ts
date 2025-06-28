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

const COACHING_PROMPT = `AI Coach. Ask questions, reflect responses, help discover answers.

After 2-4 exchanges, say: "Based on what you've shared, can I set a small challenge for you?"

Generate 1 specific goal:
- Clear action + time limit (24h-1week)
- Example: "Send CV to 1 person for feedback within 48 hours"

After setting goal, ONLY ask: "Is there anything else I can help you with today?"

Style: Warm, curious, under 50 words, one question at a time.`;

const VERIFICATION_PROMPT = `Verify goal completion. Respond with:
1. "Verified" or "Unverified"
2. Brief feedback paragraph

Verified = specific actions described
Unverified = vague responses like "I did it"`;

const getDemoResponse = (messages: any[], context?: any): string => {
  if (context?.goalAlreadySet) return "Is there anything else I can help you with today?";
  
  const responses = [
    "What's driving this feeling for you?",
    "What would success look like?",
    "Based on what you've shared, can I set a small challenge for you?",
    "What would need to change for you to feel confident?",
    "What's the one thing you'd focus on?"
  ];
  
  const userCount = messages.filter(m => m.role === 'user').length;
  return responses[Math.min(userCount - 1, responses.length - 1)] || responses[0];
};

const handleError = (error: any): string => {
  console.error('OpenAI error:', error.status, error.message);
  
  if (error.status === 401) return "Please check your OpenAI API key.";
  if (error.status === 429) return "Too many requests. Please wait a moment.";
  if (error.status === 402) return "OpenAI billing issue. Check your credits.";
  if (error.status >= 500) return "OpenAI servers temporarily unavailable.";
  
  return "Connection trouble. Please try again.";
};

export const generateCoachingResponse = async (prompt: CoachingPrompt): Promise<string> => {
  if (!isOpenAIConfigured || !openai) {
    return getDemoResponse(prompt.messages, prompt.context);
  }

  try {
    const messages = [
      { role: 'system' as const, content: COACHING_PROMPT },
      ...prompt.messages
    ];

    if (prompt.context) {
      const context = `Context: ${prompt.context.userName ? `User: ${prompt.context.userName}. ` : ''}${
        prompt.context.goalAlreadySet ? 'Goal already set. ' : ''
      }`;
      messages.splice(1, 0, { role: 'system', content: context });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "What's on your mind?";
  } catch (error) {
    return handleError(error);
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

export { isOpenAIConfigured };