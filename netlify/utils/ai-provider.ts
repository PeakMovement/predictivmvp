export type AIProvider = 'openai' | 'anthropic' | 'google';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIRequestOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export class AIProviderService {
  private provider: AIProvider;
  private apiKey: string;
  private mockMode: boolean;

  constructor(provider: AIProvider = 'openai', apiKey: string = '', mockMode: boolean = false) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.mockMode = mockMode;
  }

  async chat(options: AIRequestOptions): Promise<AIResponse> {
    if (this.mockMode) {
      return this.getMockResponse(options);
    }

    switch (this.provider) {
      case 'openai':
        return this.chatOpenAI(options);
      case 'anthropic':
        return this.chatAnthropic(options);
      case 'google':
        return this.chatGoogle(options);
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  private async chatOpenAI(options: AIRequestOptions): Promise<AIResponse> {
    const body = {
      model: 'gpt-4o-mini',
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;

    return {
      content: message.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined
    };
  }

  private async chatAnthropic(options: AIRequestOptions): Promise<AIResponse> {
    const systemMessage = options.messages.find(m => m.role === 'system');
    const userMessages = options.messages.filter(m => m.role !== 'system');

    const body: any = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens ?? 1000,
      messages: userMessages.map(m => ({
        role: m.role,
        content: m.content
      }))
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let content = '';

    for (const block of data.content) {
      if (block.type === 'text') {
        content += block.text;
      }
    }

    return {
      content,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      } : undefined
    };
  }

  private async chatGoogle(options: AIRequestOptions): Promise<AIResponse> {
    const systemMessage = options.messages.find(m => m.role === 'system');
    const userMessages = options.messages.filter(m => m.role !== 'system');

    const contents = userMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const body: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1000
      }
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates[0];
    let content = '';

    for (const part of candidate.content.parts) {
      if (part.text) {
        content += part.text;
      }
    }

    return {
      content,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount
      } : undefined
    };
  }

  private getMockResponse(options: AIRequestOptions): AIResponse {
    console.log('[AI Mock Mode] Generating mock response for:', options.messages[options.messages.length - 1]?.content?.substring(0, 100));

    const userQuery = options.messages[options.messages.length - 1]?.content || '';

    let mockContent = 'This is a mock AI response. Enable a real AI provider to get actual analysis.';

    if (userQuery.toLowerCase().includes('training') || userQuery.toLowerCase().includes('workout')) {
      mockContent = 'Based on your recent training metrics, I recommend focusing on recovery this week. Your activity levels have been high, so consider adding an extra rest day and ensuring you\'re getting adequate sleep.';
    } else if (userQuery.toLowerCase().includes('nutrition') || userQuery.toLowerCase().includes('diet')) {
      mockContent = 'Your nutrition plan looks solid. Make sure you\'re consuming enough protein (aim for 1.6-2.2g per kg of body weight) to support your training. Consider timing your carbohydrate intake around your workouts for optimal performance.';
    } else if (userQuery.toLowerCase().includes('sleep') || userQuery.toLowerCase().includes('rest')) {
      mockContent = 'Sleep is crucial for recovery and performance. Based on your profile, aim for 7-9 hours per night. Try to maintain a consistent sleep schedule and create a relaxing bedtime routine.';
    }

    return {
      content: mockContent,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    };
  }
}

export function getAIProvider(): AIProviderService {
  const provider = (process.env.AI_PROVIDER || 'openai') as AIProvider;
  const mockMode = process.env.AI_MOCK_MODE === 'true';

  let apiKey = '';

  if (!mockMode) {
    switch (provider) {
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY || '';
        break;
      case 'anthropic':
        apiKey = process.env.ANTHROPIC_API_KEY || '';
        break;
      case 'google':
        apiKey = process.env.GOOGLE_AI_API_KEY || '';
        break;
    }

    if (!apiKey) {
      console.warn(`[AI Provider] No API key found for ${provider}, falling back to mock mode`);
      return new AIProviderService(provider, '', true);
    }
  }

  console.log(`[AI Provider] Initialized ${provider} provider (mock mode: ${mockMode})`);
  return new AIProviderService(provider, apiKey, mockMode);
}
