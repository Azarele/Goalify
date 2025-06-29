// Minimal OpenAI service with reduced token usage
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const isConfigured = Boolean(apiKey && apiKey.length > 20);

// Ultra-minimal prompts to reduce costs
const PROMPTS = {
  coaching: 'Ask 1 question (max 20 words). After 3 questions, suggest goal with [GOAL].',
  goal: 'Create goal JSON: {"description":"action","difficulty":"easy|medium|hard","xpValue":50-150}',
  verify: 'Rate 1-10. If 7+: "Verified". If <7: "More detail needed". Max 15 words.',
  analyze: '1 sentence about progress.',
  label: 'Title + category JSON: {"label":"title","category":"general"}'
};

class MinimalOpenAI {
  private static instance: MinimalOpenAI;
  
  static getInstance(): MinimalOpenAI {
    if (!MinimalOpenAI.instance) {
      MinimalOpenAI.instance = new MinimalOpenAI();
    }
    return MinimalOpenAI.instance;
  }

  async request(type: keyof typeof PROMPTS, input: string, maxTokens: number = 30): Promise<string> {
    if (!isConfigured) {
      return this.getDemoResponse(type, input);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: PROMPTS[type] },
            { role: 'user', content: input.slice(0, 100) } // Limit input
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      return data.choices[0]?.message?.content || this.getDemoResponse(type, input);
    } catch (error) {
      console.error('OpenAI error:', error);
      return this.getDemoResponse(type, input);
    }
  }

  private getDemoResponse(type: keyof typeof PROMPTS, input: string): string {
    switch (type) {
      case 'coaching':
        return "What's your biggest challenge?";
      case 'goal':
        return '{"description":"Take action today","difficulty":"medium","xpValue":75}';
      case 'verify':
        return 'Verified: Good work!';
      case 'analyze':
        return 'Making steady progress.';
      case 'label':
        return '{"label":"Personal Growth","category":"general"}';
      default:
        return 'Continue...';
    }
  }
}

export const minimalAI = MinimalOpenAI.getInstance();
export { isConfigured as isOpenAIConfigured };