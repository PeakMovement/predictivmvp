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

    // ─── AUTH ────────────────────────────────────────────────────────────────
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

    // ─── INPUT ───────────────────────────────────────────────────────────────
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[yves-chat] Processing query for user ${user.id}`);

    // ─── LOAD USER CONTEXT ───────────────────────────────────────────────────
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

    const { data: userProfile } = await supabase
      .from("user_profile")
      .select("goals, activity_level, injuries, notes")
      .eq("user_id", user.id)
      .maybeSingle();

    // ─── LOAD RECENT CONVERSATION HISTORY (last 5) ────────────────────────────
    const { data: recentHistory } = await supabase
      .from("insight_history")
      .select("query, response")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const conversationHistory = recentHistory?.length
      ? recentHistory.map((h) => `User: ${h.query}\nYves: ${h.response}`).join("\n\n")
      : "No prior conversation history found.";

    // ─── LOAD LONG-TERM MEMORY BANK ──────────────────────────────────────────
    const { data: memoryBank } = await supabase
      .from("yves_memory_bank")
      .select("memory_key, memory_value")
      .eq("user_id", user.id);

    const memoryContext = memoryBank?.length
      ? memoryBank.map((m) => `${m.memory_key}: ${m.memory_value}`).join("\n")
      : "No long-term memory stored yet.";

    // ─── LOAD WEARABLE DATA CONTEXT ──────────────────────────────────────────
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split("T")[0];

    // Query wearable_summary for last 14 days
    const { data: wearableSummary } = await supabase
      .from("wearable_summary")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", fourteenDaysAgoStr)
      .order("date", { ascending: false });

    // Query wearable_sessions for last 7 entries
    const { data: wearableSessions } = await supabase
      .from("wearable_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(7);

    // Build wearable context string
    let wearableContext = "";
    let hasWearableData = false;

    if (wearableSummary && wearableSummary.length > 0) {
      hasWearableData = true;
      const avgStrain = wearableSummary.reduce((sum, s) => sum + (s.strain || 0), 0) / wearableSummary.length;
      const avgMonotony = wearableSummary.reduce((sum, s) => sum + (s.monotony || 0), 0) / wearableSummary.length;
      const avgAcwr = wearableSummary.reduce((sum, s) => sum + (s.acwr || 0), 0) / wearableSummary.length;

      // Calculate trends from last 3 entries
      const last3 = wearableSummary.slice(0, 3);
      let strainTrend = "stable";
      if (last3.length >= 2) {
        const strainDiff = (last3[0]?.strain || 0) - (last3[last3.length - 1]?.strain || 0);
        strainTrend = strainDiff > 0.5 ? "↑ increasing" : strainDiff < -0.5 ? "↓ decreasing" : "stable";
      }

      const latestSource = wearableSummary[0]?.source || "unknown";
      const latestDate = wearableSummary[0]?.date || "unknown";

      wearableContext = `\nWEARABLE DATA SUMMARY (Last 14 days):
- Avg Training Strain: ${avgStrain.toFixed(1)} (${strainTrend})
- Avg Monotony: ${avgMonotony.toFixed(2)}
- Avg ACWR (Acute:Chronic Workload): ${avgAcwr.toFixed(2)}
- Last Synced: ${latestDate} via ${latestSource}`;
    }

    if (wearableSessions && wearableSessions.length > 0) {
      hasWearableData = true;
      const sessionsWithReadiness = wearableSessions.filter(s => s.readiness_score !== null);
      const sessionsWithSleep = wearableSessions.filter(s => s.sleep_score !== null);

      if (sessionsWithReadiness.length > 0) {
        const avgReadiness = sessionsWithReadiness.reduce((sum, s) => sum + (s.readiness_score || 0), 0) / sessionsWithReadiness.length;
        
        // Calculate readiness trend from last 3
        const last3Readiness = sessionsWithReadiness.slice(0, 3);
        let readinessTrend = "stable";
        if (last3Readiness.length >= 2) {
          const readinessDiff = (last3Readiness[0]?.readiness_score || 0) - (last3Readiness[last3Readiness.length - 1]?.readiness_score || 0);
          readinessTrend = readinessDiff > 5 ? "↑ improving" : readinessDiff < -5 ? "↓ declining" : "stable";
        }

        wearableContext += `\n- Avg Readiness Score: ${avgReadiness.toFixed(0)} (${readinessTrend})`;
      }

      if (sessionsWithSleep.length > 0) {
        const avgSleep = sessionsWithSleep.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / sessionsWithSleep.length;
        
        // Calculate sleep trend from last 3
        const last3Sleep = sessionsWithSleep.slice(0, 3);
        let sleepTrend = "stable";
        if (last3Sleep.length >= 2) {
          const sleepDiff = (last3Sleep[0]?.sleep_score || 0) - (last3Sleep[last3Sleep.length - 1]?.sleep_score || 0);
          sleepTrend = sleepDiff > 5 ? "↑ improving" : sleepDiff < -5 ? "↓ declining" : "stable";
        }

        wearableContext += `\n- Avg Sleep Score: ${avgSleep.toFixed(0)} (${sleepTrend})`;
      }

      // Add recent activity metrics
      const latestSession = wearableSessions[0];
      if (latestSession) {
        wearableContext += `\n- Latest Activity: ${latestSession.total_steps || 0} steps, ${latestSession.total_calories || 0} cal`;
        if (latestSession.resting_hr) wearableContext += `, HR: ${latestSession.resting_hr}`;
        if (latestSession.hrv_avg) wearableContext += `, HRV: ${latestSession.hrv_avg}`;
      }
    }

    if (!hasWearableData) {
      wearableContext = "\nWEARABLE DATA: No wearable data available yet. User may need to connect a device.";
    }

    // ─── BUILD PROMPT CONTEXT ────────────────────────────────────────────────
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
${wearableContext}

RECENT CONVERSATION HISTORY:
${conversationHistory}

LONG-TERM MEMORY:
${memoryContext}

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
            content: `You are Yves, an AI health intelligence coach. Always respond in full sentences with clear grammar, natural pacing, and friendly professionalism. Use markdown formatting for readability:
• Bold important keywords or section titles.
• Keep responses concise and conversational.
• Ensure lists are consistently formatted and punctuated.
• Maintain a warm, coaching tone — never robotic.

You provide personalized, actionable advice using all available context (profile, history, memory).
If new permanent facts arise (preferences, chronic conditions, long-term goals),
suggest saving them with memory_key and memory_value so they can be stored via yves-memory-update.`,
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

    // ─── STORE INSIGHT HISTORY ───────────────────────────────────────────────
    await supabase.from("insight_history").insert({
      user_id: user.id,
      query,
      response,
      context_used: hasWearableData ? wearableContext : null,
      provider: "openai", // Default provider, update if using different AI
    });

    console.log(`[yves-chat] Response generated and saved for user ${user.id}`);

    // ─── MEMORY AUTO-CAPTURE ─────────────────────────────────────────────────
    if (response.includes("memory_key:") && response.includes("memory_value:")) {
      try {
        const match = response.match(/memory_key:\s*(.+?)\s*memory_value:\s*(.+?)(?:$|\n)/);
        if (match) {
          const [, memory_key, memory_value] = match;
          await supabase.functions.invoke("yves-memory-update", {
            body: { user_id: user.id, memory_key: memory_key.trim(), memory_value: memory_value.trim() },
          });
          console.log(`[yves-chat] Memory updated: ${memory_key.trim()}`);
        }
      } catch (err) {
        console.warn("[yves-chat] Memory update skipped:", err);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      response,
      has_wearable_data: hasWearableData 
    }), {
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
