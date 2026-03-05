export type AIProvider = 'openai' | 'anthropic' | 'google' | 'lovable' | 'mock';

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

  constructor(provider: AIProvider = 'openai', apiKey: string = '') {
    this.provider = provider;
    this.apiKey = apiKey;
  }

  async chat(options: AIRequestOptions): Promise<AIResponse> {
    switch (this.provider) {
      case 'lovable':
        return this.chatLovable(options);
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

  private async chatLovable(options: AIRequestOptions): Promise<AIResponse> {
    const body: any = {
      model: 'google/gemini-2.5-flash',
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lovable AI API error: ${response.status} - ${errorText}`);
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
}

export function getAIProvider(): AIProviderService {
  // Check available API keys
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const googleKey = Deno.env.get('GOOGLE_AI_API_KEY');

  console.log('[AI Provider] Available keys:', {
    lovable: !!lovableKey,
    openai: !!openaiKey,
    anthropic: !!anthropicKey,
    google: !!googleKey
  });

  // Prioritize Lovable AI (pre-configured, no billing issues)
  if (lovableKey) {
    console.log('[AI Provider] Using Lovable AI (google/gemini-2.5-flash)');
    return new AIProviderService('lovable', lovableKey);
  }

  // Fall back to other providers
  const explicitProvider = Deno.env.get('AI_PROVIDER') as AIProvider;
  
  if (explicitProvider === 'openai' && openaiKey) {
    console.log('[AI Provider] Using OpenAI');
    return new AIProviderService('openai', openaiKey);
  }
  
  if (explicitProvider === 'anthropic' && anthropicKey) {
    console.log('[AI Provider] Using Anthropic');
    return new AIProviderService('anthropic', anthropicKey);
  }
  
  if (explicitProvider === 'google' && googleKey) {
    console.log('[AI Provider] Using Google');
    return new AIProviderService('google', googleKey);
  }

  // Auto-detect available provider
  if (openaiKey) {
    console.log('[AI Provider] Auto-detected OpenAI');
    return new AIProviderService('openai', openaiKey);
  }
  
  if (anthropicKey) {
    console.log('[AI Provider] Auto-detected Anthropic');
    return new AIProviderService('anthropic', anthropicKey);
  }
  
  if (googleKey) {
    console.log('[AI Provider] Auto-detected Google');
    return new AIProviderService('google', googleKey);
  }

  throw new Error('[AI Provider] No API key found. Please configure LOVABLE_API_KEY or another provider.');
}
