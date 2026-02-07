import { createClient } from "npm:@supabase/supabase-js@2";
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-yves-recommendations] Fetching fresh data for user ${userId}`);

    // Fetch latest wearable sessions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: sessions } = await supabase
      .from("wearable_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", sevenDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(7);

    // Fetch user profile
    const { data: profile } = await supabase
      .from("user_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Fetch user documents
    const { data: documents } = await supabase
      .from("user_documents")
      .select("document_type, ai_summary, parsed_content")
      .eq("user_id", userId)
      .eq("processing_status", "completed");

    // Fetch latest recovery trends
    const { data: recoveryTrend } = await supabase
      .from("recovery_trends")
      .select("*")
      .eq("user_id", userId)
      .order("period_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch latest activity trends
    const { data: activityTrend } = await supabase
      .from("activity_trends")
      .select("*")
      .eq("user_id", userId)
      .order("period_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build context from fresh data
    let context = "Generate personalized health recommendations based on this user's current data:\n\n";

    // Add wearable data
    if (sessions && sessions.length > 0) {
      const latest = sessions[0];
      context += "## Current Wearable Metrics (Latest Sync)\n";
      if (latest.sleep_score) context += `- Sleep Score: ${latest.sleep_score}\n`;
      if (latest.readiness_score) context += `- Readiness Score: ${latest.readiness_score}\n`;
      if (latest.activity_score) context += `- Activity Score: ${latest.activity_score}\n`;
      if (latest.total_steps) context += `- Steps: ${latest.total_steps}\n`;
      if (latest.total_calories) context += `- Total Calories: ${latest.total_calories}\n`;
      if (latest.active_calories) context += `- Active Calories: ${latest.active_calories}\n`;
      if (latest.spo2_avg) context += `- SpO2: ${latest.spo2_avg}%\n`;
      context += `- Date: ${latest.date}\n\n`;

      // Add 7-day averages
      const avgSleep = sessions.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / sessions.length;
      const avgReadiness = sessions.reduce((sum, s) => sum + (s.readiness_score || 0), 0) / sessions.length;
      context += `## 7-Day Averages\n`;
      context += `- Avg Sleep Score: ${avgSleep.toFixed(1)}\n`;
      context += `- Avg Readiness: ${avgReadiness.toFixed(1)}\n\n`;
    }

    // Add recovery/training load data
    if (recoveryTrend) {
      context += "## Training Load & Recovery\n";
      if (recoveryTrend.acwr) context += `- ACWR: ${recoveryTrend.acwr.toFixed(2)} (${recoveryTrend.acwr_trend || 'stable'})\n`;
      if (recoveryTrend.monotony) context += `- Monotony: ${recoveryTrend.monotony.toFixed(2)}\n`;
      if (recoveryTrend.strain) context += `- Strain: ${recoveryTrend.strain.toFixed(1)}\n`;
      if (recoveryTrend.recovery_score) context += `- Recovery Score: ${recoveryTrend.recovery_score}\n`;
      context += "\n";
    }

    // Add activity trends
    if (activityTrend) {
      context += "## Activity Trends\n";
      if (activityTrend.steps_avg_7d) context += `- 7-Day Avg Steps: ${Math.round(activityTrend.steps_avg_7d)}\n`;
      if (activityTrend.steps_delta) context += `- Steps Delta vs Baseline: ${activityTrend.steps_delta > 0 ? '+' : ''}${Math.round(activityTrend.steps_delta)}\n`;
      context += `- Trend: ${activityTrend.trend_direction || 'stable'}\n\n`;
    }

    // Add user profile
    if (profile) {
      context += "## User Profile\n";
      if (profile.name) context += `- Name: ${profile.name}\n`;
      if (profile.goals?.length) context += `- Goals: ${profile.goals.join(", ")}\n`;
      if (profile.activity_level) context += `- Activity Level: ${profile.activity_level}\n`;
      if (profile.conditions?.length) context += `- Health Conditions: ${profile.conditions.join(", ")}\n`;
      if (profile.injuries?.length) context += `- Injuries: ${profile.injuries.join(", ")}\n`;
      context += "\n";
    }

    // Add document insights
    if (documents && documents.length > 0) {
      context += "## Uploaded Health Documents\n";
      for (const doc of documents) {
        context += `- ${doc.document_type}: ${doc.ai_summary || 'Document processed'}\n`;
      }
      context += "\n";
    }

    console.log(`[generate-yves-recommendations] Built context with ${sessions?.length || 0} sessions, ${documents?.length || 0} documents`);

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
          content: 'You are Yves, a calm, highly experienced performance coach and clinician. You speak to users as an intelligent human would, not as a system. Your goal is to help users make better daily decisions, not to scare or control them. You avoid alarmist language, certainty, and overuse of medical terms. You never mention data sources, systems, models, or detection mechanisms. Speak WITH the user, not AT the user. TONE MODE SELECTION (MANDATORY): Before generating recommendations, determine exactly ONE tone mode. Never mix tones. AFFIRMING — positive trends, good adherence. GUIDING — neutral trends, calm adjustments. CAUTIOUS — rising risk, early warnings. REASSURING — post-alert, uncertainty, anxiety reduction. Selection based on: deviation from baseline, consecutive pattern days, injury/symptom history, previous response to similar advice. MODULAR STRUCTURE: Assemble each recommendation from 2–4 of these components, never all at once, vary between days: Observation (required), Affirmation (optional), Soft counterfactual (optional), Recommendation (required), Gentle closing question (optional). Do NOT follow a fixed structure. NAME USAGE: Do NOT use the user\'s name by default. Only use it when it adds emotional or contextual value — praising consistency, expressing concern, referencing a previously reported issue, or acknowledging multi-day progress. Never start with the name. Never use it more than once. Never in purely technical statements. GROUNDED OBSERVATION RULE: Every recommendation MUST begin with a grounded observation about the user\'s recent pattern — referencing a trend, a direction of change, and a short timeframe. Never give advice without first anchoring it to an observable pattern. Use language like "You\'ve been trending toward…", "Over the past few days…", "Recently, your training has…". Never provide generic advice or advice without context. SOFT COUNTERFACTUAL: When appropriate, include ONE soft counterfactual sentence explaining what is likely to happen if nothing changes today. No certainty, no injury guarantees, no fear language, no urgency. The counterfactual is optional — never include more than one. Generate actionable, specific, personalized recommendations based on the user\'s complete health profile and current metrics. Be concise but specific. Use Lucide icon names for the icon field (e.g., "Activity", "Heart", "Moon", "Apple", "AlertTriangle").'
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

    // Delete old recommendations and insert fresh ones
    await supabase
      .from("yves_recommendations")
      .delete()
      .eq("user_id", userId);

    // Insert new recommendations
    for (const rec of recommendations) {
      await supabase
        .from("yves_recommendations")
        .insert({
          user_id: userId,
          recommendation_text: rec.message,
          category: rec.category,
          priority: rec.priority,
          source: "oura_sync",
        });
    }

    console.log(`[generate-yves-recommendations] [SUCCESS] Generated and stored ${recommendations.length} recommendations for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[generate-yves-recommendations] [ERROR]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
