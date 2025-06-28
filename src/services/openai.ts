import OpenAI from 'openai';

// Check if OpenAI API key is configured
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const isOpenAIConfigured = Boolean(apiKey);

const openai = isOpenAIConfigured ? new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true
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

GOAL GENERATION:
After 3-4 exchanges, identify what the user is struggling with or wants to achieve. Then say:
"Based on what you've shared, can I set a small challenge for you?"

Generate 1-2 specific, measurable goals with:
- Clear action (what exactly to do)
- Time limit (24 hours, 3 days, 1 week max)
- Success criteria (how they'll know it's done)

Examples:
"Draft your CV and send it to 1 person for feedback within 48 hours"
"Spend 30 minutes tomorrow researching remote job platforms"
"Have one difficult conversation you've been avoiding by Friday"

CONVERSATION STYLE:
- Natural, warm, curious
- One question at a time
- Build on their responses
- Keep responses under 50 words
- Focus on their thinking, not your knowledge

Remember: You're a thinking partner. They have the answers - you help them find them.`;

const VERIFICATION_SYSTEM_PROMPT = `You are a goal completion verifier. Your job is to determine if a user has legitimately completed their goal based on their reasoning.

VERIFICATION CRITERIA:
- The user must provide specific actions they took
- The actions should logically lead to goal completion
- Look for concrete details, not vague statements
- Consider effort and genuine attempt, not just perfect results

RESPOND WITH ONLY:
- "Verified" if the reasoning shows legitimate completion
- "Needs more detail" if the explanation is too vague or unclear

Examples of GOOD reasoning:
- "I spent 2 hours updating my resume, added 3 new skills, and sent it to my mentor Sarah for feedback"
- "I researched 5 job sites (Indeed, LinkedIn, etc.) for 45 minutes and bookmarked 8 relevant positions"

Examples of POOR reasoning:
- "I did it"
- "I worked on my resume"
- "I looked at some job sites"

Be encouraging but maintain standards for verification.`;

// Demo responses for when OpenAI is not configured
const getDemoResponse = (messages: any[]): string => {
  const userMessages = messages.filter(m => m.role === 'user');
  const messageCount = userMessages.length;

  const demoResponses = [
    "That's really interesting. What's driving this feeling for you right now?",
    "I hear you saying this is important to you. What would success look like?",
    "What's one small step you could take today to move forward with this?",
    "How do you think you'll feel once you've made progress on this?",
    "What's been holding you back from taking action on this before?",
    "Based on what you've shared, can I set a small challenge for you? How about spending 15 minutes today writing down your thoughts about this topic?",
    "What would need to change for you to feel more confident about this situation?",
    "If you had to choose just one thing to focus on, what would it be?",
    "What support do you think you'd need to make this happen?",
    "How will you know when you've achieved what you're looking for?"
  ];

  return demoResponses[Math.min(messageCount - 1, demoResponses.length - 1)] || demoResponses[0];
};

export const generateCoachingResponse = async (prompt: CoachingPrompt): Promise<string> => {
  if (!isOpenAIConfigured || !openai) {
    console.log('OpenAI not configured, using demo response');
    return getDemoResponse(prompt.messages);
  }

  try {
    const messages = [
      { role: 'system' as const, content: COACHING_SYSTEM_PROMPT },
      ...prompt.messages
    ];

    if (prompt.context) {
      const contextMessage = `Context: ${prompt.context.userName ? `User's name is ${prompt.context.userName}. ` : ''}${
        prompt.context.previousGoals?.length ? `Previous goals: ${prompt.context.previousGoals.join(', ')}. ` : ''
      }${prompt.context.sessionHistory ? `Recent session summary: ${prompt.context.sessionHistory}` : ''}`;
      
      messages.splice(1, 0, { role: 'system', content: contextMessage });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: 200,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "What's on your mind today?";
  } catch (error) {
    console.error('OpenAI API error:', error);
    return getDemoResponse(prompt.messages);
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
        return JSON.parse(content);
      } catch {
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Goal generation error:', error);
    return null;
  }
};

export const verifyGoalCompletion = async (goalDescription: string, userReasoning: string): Promise<boolean> => {
  if (!isOpenAIConfigured || !openai) {
    // In demo mode, accept any reasoning that's more than 10 characters
    return userReasoning.trim().length > 10;
  }

  try {
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
      max_tokens: 10,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase();
    return result === 'verified';
  } catch (error) {
    console.error('Goal verification error:', error);
    return false;
  }
};

export { isOpenAIConfigured };