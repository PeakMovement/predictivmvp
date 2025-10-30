export type AIProvider = 'openai' | 'anthropic' | 'google' | 'mock';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIToolCall {
  name: string;
  arguments: string;
}

export interface AIResponse {
  content: string;
  toolCalls?: AIToolCall[];
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface AIRequestOptions {
  messages: AIMessage[];
  tools?: AITool[];
  toolChoice?: { type: 'function'; function: { name: string } };
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
    const body: any = {
      model: 'gpt-4o-mini',
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096
    };

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools;
      if (options.toolChoice) {
        body.tool_choice = options.toolChoice;
      }
    }

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
      toolCalls: message.tool_calls?.map((tc: any) => ({
        name: tc.function.name,
        arguments: tc.function.arguments
      }))
    };
  }

  private async chatAnthropic(options: AIRequestOptions): Promise<AIResponse> {
    const systemMessage = options.messages.find(m => m.role === 'system');
    const userMessages = options.messages.filter(m => m.role !== 'system');

    const body: any = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens ?? 4096,
      messages: userMessages.map(m => ({
        role: m.role,
        content: m.content
      }))
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }));

      if (options.toolChoice) {
        body.tool_choice = {
          type: 'tool',
          name: options.toolChoice.function.name
        };
      }
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
    const toolCalls: AIToolCall[] = [];

    for (const block of data.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          name: block.name,
          arguments: JSON.stringify(block.input)
        });
      }
    }

    return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
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
        maxOutputTokens: options.maxTokens ?? 4096
      }
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    if (options.tools && options.tools.length > 0) {
      body.tools = [{
        functionDeclarations: options.tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters
        }))
      }];
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
    const toolCalls: AIToolCall[] = [];

    for (const part of candidate.content.parts) {
      if (part.text) {
        content += part.text;
      } else if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args)
        });
      }
    }

    return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }

  private getMockResponse(options: AIRequestOptions): AIResponse {
    console.log('[AI Mock Mode] Generating mock response');

    if (options.tools && options.tools.length > 0) {
      const tool = options.tools[0];
      const mockData = this.generateMockToolData(tool.function.name, tool.function.parameters);

      return {
        content: '',
        toolCalls: [{
          name: tool.function.name,
          arguments: JSON.stringify(mockData)
        }]
      };
    }

    return {
      content: 'This is a mock AI response. Enable a real AI provider to get actual analysis.'
    };
  }

  private generateMockToolData(toolName: string, schema: any): any {
    if (toolName.includes('nutrition')) {
      return {
        daily_calories: 2500,
        macros: { protein_g: 150, carbs_g: 300, fat_g: 80 },
        meal_timing: ['7:00 AM - Breakfast', '12:00 PM - Lunch', '7:00 PM - Dinner'],
        special_considerations: ['High protein for recovery'],
        supplements: ['Whey protein', 'Creatine']
      };
    }

    if (toolName.includes('medical')) {
      return {
        conditions: [
          { name: 'Exercise-induced asthma', severity: 'mild', diagnosed_date: '2020-01' }
        ],
        medications: [
          { name: 'Albuterol inhaler', dosage: '2 puffs', frequency: 'As needed before exercise' }
        ],
        allergies: ['Pollen'],
        contraindications: ['Avoid high-intensity training during high pollen count']
      };
    }

    if (toolName.includes('training')) {
      return {
        program_name: 'Marathon Training Plan',
        duration_weeks: 16,
        current_phase: 'build',
        weekly_schedule: [
          { day: 'Monday', workout_type: 'Easy run', duration_min: 45, intensity: 'easy' },
          { day: 'Wednesday', workout_type: 'Tempo run', duration_min: 60, intensity: 'moderate' },
          { day: 'Saturday', workout_type: 'Long run', duration_min: 120, intensity: 'easy' }
        ],
        goal_race_date: '2025-04-15',
        weekly_volume_km: 55
      };
    }

    if (toolName.includes('recommendation')) {
      return {
        recommendations: [
          {
            priority: 'high',
            title: 'Monitor Training Load',
            message: 'Your recent metrics suggest increased fatigue. Consider a recovery day.',
            actionText: 'View Trends',
            category: 'training',
            icon: 'Activity'
          },
          {
            priority: 'medium',
            title: 'Nutrition Check',
            message: 'Ensure adequate protein intake for recovery.',
            actionText: 'Review Meal Plan',
            category: 'nutrition',
            icon: 'Apple'
          },
          {
            priority: 'low',
            title: 'Stay Consistent',
            message: 'Your training is progressing well. Keep up the good work!',
            actionText: 'Continue',
            category: 'general',
            icon: 'Check'
          }
        ]
      };
    }

    return {};
  }
}

export function getAIProvider(): AIProviderService {
  const provider = (Deno.env.get('AI_PROVIDER') || 'openai') as AIProvider;
  const mockMode = Deno.env.get('AI_MOCK_MODE') === 'true';

  let apiKey = '';

  if (!mockMode) {
    switch (provider) {
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY') || '';
        break;
      case 'anthropic':
        apiKey = Deno.env.get('ANTHROPIC_API_KEY') || '';
        break;
      case 'google':
        apiKey = Deno.env.get('GOOGLE_AI_API_KEY') || '';
        break;
    }

    if (!apiKey) {
      throw new Error(`[AI Provider] No API key found for ${provider}. Please set ${provider.toUpperCase()}_API_KEY environment variable.`);
    }
  }

  return new AIProviderService(provider, apiKey, mockMode);
}
