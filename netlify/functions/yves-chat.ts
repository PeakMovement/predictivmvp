import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { logSync } from "../utils/logger";
import { getAIProvider } from "../utils/ai-provider";

const handler: Handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      logSync('yves-chat:auth-missing', {});
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'No authorization header'
        }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      logSync('yves-chat:auth-invalid', { error: userError?.message });
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Invalid token'
        }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Request body is required'
        }),
      };
    }

    const { query } = JSON.parse(event.body);

    if (!query || typeof query !== 'string') {
      logSync('yves-chat:invalid-query', { userId: user.id });
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Query is required and must be a string'
        }),
      };
    }

    logSync('yves-chat:processing', { userId: user.id, queryLength: query.length });

    const { data: userContext } = await supabase
      .from('user_context')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: healthProfile } = await supabase
      .from('user_health_profiles')
      .select('profile_data, ai_synthesis')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const contextInfo = `
USER CONTEXT:
Preferences: ${JSON.stringify(userContext?.preferences || {}, null, 2)}
Profile: ${JSON.stringify(userContext?.profile || {}, null, 2)}
Injuries: ${JSON.stringify(userContext?.injuries || [], null, 2)}

HEALTH PROFILE:
${healthProfile?.ai_synthesis || 'No comprehensive health profile available yet.'}

USER QUESTION:
${query}
`;

    const ai = getAIProvider();

    logSync('yves-chat:calling-ai', {
      userId: user.id,
      provider: process.env.AI_PROVIDER || 'openai',
      mockMode: process.env.AI_MOCK_MODE === 'true'
    });

    const aiResponse = await ai.chat({
      messages: [
        {
          role: 'system',
          content: `You are Yves, an AI health intelligence coach for the Predictiv platform. You provide personalized, actionable advice based on the user's complete health context including their training program, nutrition plan, medical conditions, current metrics, and personal preferences.

Be conversational but professional. Provide specific, actionable recommendations. Reference their specific health data when relevant. If you don't have enough context to give specific advice, ask clarifying questions.`
        },
        { role: 'user', content: contextInfo }
      ],
      temperature: 0.7,
      maxTokens: 1000
    });

    const openAiAnswer = aiResponse.content || 'I apologize, but I was unable to generate a response. Please try again.';

    logSync('yves-chat:ai-response-received', {
      userId: user.id,
      responseLength: openAiAnswer.length,
      usage: aiResponse.usage
    });

    const { error: insertError } = await supabase
      .from('insight_history')
      .insert({
        user_id: user.id,
        query,
        response: openAiAnswer
      });

    if (insertError) {
      logSync('yves-chat:db-insert-failed', {
        userId: user.id,
        error: insertError.message
      });
    } else {
      logSync('yves-chat:db-insert-success', { userId: user.id });
    }

    logSync('yves-chat:success', {
      userId: user.id,
      responseLength: openAiAnswer.length
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        response: openAiAnswer
      }),
    };

  } catch (error: any) {
    logSync('yves-chat:error', {
      error: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
    };
  }
};

export { handler };
