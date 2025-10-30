
import { getAIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const { context, userId } = await req.json();

    console.log(`Generating Yves recommendations for user ${userId}`);

    const recommendationSchema = {
      type: "object",
      properties: {
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              priority: { type: "string", enum: ["high", "medium", "low"] },
              title: { type: "string" },
              message: { type: "string" },
              actionText: { type: "string" },
              category: { type: "string" },
              icon: { type: "string" }
            },
            required: ["priority", "title", "message", "actionText", "category"]
          },
          minItems: 3,
          maxItems: 3
        }
      },
      required: ["recommendations"]
    };

    const ai = getAIProvider();

    const aiResponse = await ai.chat({
      messages: [
        {
          role: 'system',
          content: 'You are Yves, an AI health coach for the Predictiv platform. Generate actionable, specific, personalized recommendations based on the user\'s complete health profile and current metrics. Be concise but specific. Use Lucide icon names for the icon field (e.g., "Activity", "Heart", "Moon", "Apple", "AlertTriangle").'
        },
        { role: 'user', content: context }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_recommendations",
            description: "Generate 3 personalized health recommendations",
            parameters: recommendationSchema
          }
        }
      ],
      toolChoice: { type: "function", function: { name: "generate_recommendations" } }
    });

    let recommendations = [];
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      const parsed = JSON.parse(aiResponse.toolCalls[0].arguments);
      recommendations = parsed.recommendations || [];
    }

    console.log(`Generated ${recommendations.length} recommendations for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error generating recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
