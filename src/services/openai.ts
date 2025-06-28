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

const COACHING_PROMPT = `You are an AI Coach. Follow these STRICT rules:

1. SINGLE ACTION PRINCIPLE: When setting a goal, your response must ONLY be the goal proposition. Never send multiple messages.

2. GOAL SETTING: After 2-4 exchanges, say EXACTLY: "Based on what you've shared, can I set a small challenge for you? [Specific goal description]"

3. AFTER GOAL SETTING: Wait for user response. If they accept, ONLY ask: "Is there anything else I can help you with today?"

4. CONVERSATION STYLE: Ask one question at a time, reflect responses, help discover answers. Keep under 50 words.

5. NO ADVICE: Never give suggestions. Only ask questions and reflect.

Examples:
- "What's driving this feeling?"
- "How would success look?"
- "Based on what you've shared, can I set a small challenge for you? Send your CV to 1 person for feedback within 48 hours."`;

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

const getDemoResponse = (messages: any[], context?: any): string => {
  if (context?.goalAlreadySet) return "Is there anything else I can help you with today?";
  
  const responses = [
    "What's driving this feeling for you?",
    "What would success look like?",
    "Based on what you've shared, can I set a small challenge for you? Write down 3 specific things you want to achieve this week.",
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
        prompt.context.goalAlreadySet ? 'Goal already set this session. ' : ''
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