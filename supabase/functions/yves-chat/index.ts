import { createClient } from "npm:@supabase/supabase-js@2";
import { getAIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── AUTH VALIDATION ───────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PARSE BODY ───────────────────────────────────────────────────────────
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[yves-chat] Processing query for user ${user.id}`);

    // ─── LOAD CONTEXT DATA ────────────────────────────────────────────────────
    const { data: userContext } = await supabase
      .from("user_context_enhanced")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: healthProfile } = await supabase
      .from("user_health_profiles")
      .select("profile_data, ai_synthesis")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 🔹 NEW: Fetch user_profile questionnaire data
    const { data: userProfile } = await supabase
      .from("user_profile")
      .select("goals, activity_level, injuries, notes")
      .eq("user_id", user.id)
      .maybeSingle();

    // ─── BUILD CONTEXT PROMPT ─────────────────────────────────────────────────
    const contextInfo = `
USER PROFILE CONTEXT:
Goals: ${userProfile?.goals || "Not provided"}
Activity Level: ${userProfile?.activity_level || "Not specified"}
Injuries: ${userProfile?.injuries || "None listed"}
Lifestyle Notes: ${userProfile?.notes || "None provided"}

USER CONTEXT:
Nutrition Profile: ${JSON.stringify(userContext?.nutrition_profile || {}, null, 2)}
Medical Profile: ${JSON.stringify(userContext?.medical_profile || {}, null, 2)}
Training Profile: ${JSON.stringify(userContext?.training_profile || {}, null, 2)}

HEALTH PROFILE:
${healthProfile?.ai_synthesis || "No comprehensive health profile available yet."}

USER QUESTION:
${query}
`;

    // ─── SEND TO AI ───────────────────────────────────────────────────────────
    const ai = getAIProvider();
    let aiResponse;

    try {
      aiResponse = await ai.chat({
        messages: [
          {
            role: "system",
            content: `You are Yves, an AI health intelligence coach for the Predictiv platform. 
You provide personalized, actionable advice based on the user's complete health context including 
their training program, nutrition plan, medical conditions, current metrics, and personal preferences.
Be conversational but professional. Provide specific, actionable recommendations. 
Reference their specific health data when relevant. 
If you don't have enough context to give specific advice, ask clarifying questions.`,
          },
          { role: "user", content: contextInfo },
        ],
        temperature: 0.7,
        maxTokens: 1000,
      });
    } catch (aiError) {
      console.error("[yves-chat] AI Provider error:", aiError);
      const errorMessage = aiError instanceof Error ? aiError.message : "Unknown error";

      if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Rate limit exceeded. Please wait a moment before trying again.",
            errorCode: "RATE_LIMIT",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (errorMessage.includes("402") || errorMessage.toLowerCase().includes("payment required")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "AI credits exhausted. Please add more credits to your workspace.",
            errorCode: "PAYMENT_REQUIRED",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      throw aiError;
    }

    const response = aiResponse.content || "I apologize, but I was unable to generate a response. Please try again.";

    await supabase.from("insight_history").insert({
      user_id: user.id,
      query,
      response,
    });

    console.log(`[yves-chat] Response generated and saved for user ${user.id}`);

    return new Response(JSON.stringify({ success: true, response }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[yves-chat] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
