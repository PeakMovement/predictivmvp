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
      .select("name, goals, activity_level, injuries, conditions, gender, dob")
      .eq("user_id", user.id)
      .maybeSingle();

    // ─── LOAD USER UPLOADED DOCUMENTS ────────────────────────────────────────
    const { data: userDocuments } = await supabase
      .from("user_documents")
      .select("document_type, file_name, parsed_content, ai_summary, tags")
      .eq("user_id", user.id)
      .eq("processing_status", "completed")
      .order("uploaded_at", { ascending: false })
      .limit(10);

    let documentsContext = "";
    if (userDocuments && userDocuments.length > 0) {
      documentsContext = "\nUPLOADED DOCUMENTS:\n";
      for (const doc of userDocuments) {
        documentsContext += `\n📄 ${doc.document_type.toUpperCase()} (${doc.file_name}):\n`;
        if (doc.ai_summary) {
          documentsContext += `Summary: ${doc.ai_summary}\n`;
        }
        if (doc.parsed_content && typeof doc.parsed_content === 'object') {
          // Include key parsed data without overwhelming the context
          const content = doc.parsed_content as Record<string, unknown>;
          const keys = Object.keys(content).slice(0, 5);
          keys.forEach(key => {
            const value = content[key];
            if (value && typeof value === 'string' && value.length < 200) {
              documentsContext += `- ${key}: ${value}\n`;
            } else if (Array.isArray(value) && value.length > 0) {
              documentsContext += `- ${key}: ${value.slice(0, 5).join(", ")}\n`;
            }
          });
        }
        if (doc.tags && doc.tags.length > 0) {
          documentsContext += `Tags: ${doc.tags.join(", ")}\n`;
        }
      }
    }

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

    // ─── LOAD WEARABLE DATA CONTEXT (Oura Ring) ──────────────────────────────
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

    // Query training_trends for calculated metrics
    const { data: trainingTrends } = await supabase
      .from("training_trends")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(7);

    // Query recovery_trends for ACWR and load data
    const { data: recoveryTrends } = await supabase
      .from("recovery_trends")
      .select("*")
      .eq("user_id", user.id)
      .order("period_date", { ascending: false })
      .limit(7);

    // Build wearable context string - ONLY reference populated fields
    let wearableContext = "";
    let hasWearableData = false;

    // Calculate derived metrics from training trends
    let fatigueIndex: number | null = null;
    let riskScore = 0;
    
    if (trainingTrends && trainingTrends.length > 0) {
      hasWearableData = true;
      
      // Get averages from training trends
      const avgStrain = trainingTrends.reduce((sum, t) => sum + (t.strain || 0), 0) / trainingTrends.length;
      const avgMonotony = trainingTrends.reduce((sum, t) => sum + (t.monotony || 0), 0) / trainingTrends.length;
      const avgACWR = trainingTrends.reduce((sum, t) => sum + (t.acwr || 0), 0) / trainingTrends.length;
      const avgHRV = trainingTrends.reduce((sum, t) => sum + (t.hrv || 0), 0) / trainingTrends.length;
      const avgSleepScore = trainingTrends.reduce((sum, t) => sum + (t.sleep_score || 0), 0) / trainingTrends.length;
      
      // Calculate Fatigue Index: (Strain / 200) × 50 + (Monotony / 3) × 50
      fatigueIndex = Math.min(100, Math.round((avgStrain / 200) * 50 + (avgMonotony / 3) * 50));
      
      // Calculate Risk Score
      if (avgACWR > 1.5) riskScore += 40;
      else if (avgACWR > 1.3) riskScore += 25;
      else if (avgACWR > 1.0) riskScore += 10;
      
      if (avgStrain > 150) riskScore += 30;
      else if (avgStrain > 100) riskScore += 15;
      
      if (fatigueIndex > 70) riskScore += 30;
      else if (fatigueIndex > 50) riskScore += 15;
      
      riskScore = Math.min(100, riskScore);
      
      // Risk level assessment
      const riskLevel = riskScore > 60 ? "HIGH" : riskScore > 30 ? "MODERATE" : "LOW";
      
      // Trend calculation
      const last3 = trainingTrends.slice(0, 3);
      let strainTrend = "stable";
      if (last3.length >= 2) {
        const strainDiff = (last3[0]?.strain || 0) - (last3[last3.length - 1]?.strain || 0);
        strainTrend = strainDiff > 0.5 ? "↑ increasing" : strainDiff < -0.5 ? "↓ decreasing" : "stable";
      }

      wearableContext = `\nTRAINING ANALYTICS (Last 7 days):
- **ACWR (Acute:Chronic Workload)**: ${avgACWR.toFixed(2)} ${avgACWR > 1.5 ? "(⚠️ High injury risk)" : avgACWR > 1.3 ? "(Elevated)" : "(Optimal)"}
- **Training Strain**: ${avgStrain.toFixed(0)} TSS (${strainTrend})
- **Training Monotony**: ${avgMonotony.toFixed(2)} ${avgMonotony > 2.0 ? "(⚠️ Too repetitive)" : "(Good variety)"}
- **Fatigue Index**: ${fatigueIndex}% ${fatigueIndex > 70 ? "(⚠️ High fatigue)" : fatigueIndex > 50 ? "(Moderate)" : "(Low)"}
- **Risk Score**: ${riskScore}/100 (${riskLevel} risk)
- **Avg HRV**: ${avgHRV.toFixed(1)} ms
- **Avg Sleep Score**: ${avgSleepScore.toFixed(0)}`;
    }

    if (wearableSummary && wearableSummary.length > 0) {
      hasWearableData = true;
      const latestSource = wearableSummary[0]?.source || "Oura Ring";
      const latestDate = wearableSummary[0]?.date || "unknown";
      wearableContext += `\n- Last Synced: ${latestDate} via ${latestSource}`;
    }

    if (wearableSessions && wearableSessions.length > 0) {
      hasWearableData = true;
      
      // Only use fields that are actually populated
      const sessionsWithReadiness = wearableSessions.filter(s => s.readiness_score !== null);
      const sessionsWithSleep = wearableSessions.filter(s => s.sleep_score !== null);
      const sessionsWithActivity = wearableSessions.filter(s => s.activity_score !== null);

      if (sessionsWithReadiness.length > 0) {
        const avgReadiness = sessionsWithReadiness.reduce((sum, s) => sum + (s.readiness_score || 0), 0) / sessionsWithReadiness.length;
        
        const last3Readiness = sessionsWithReadiness.slice(0, 3);
        let readinessTrend = "stable";
        if (last3Readiness.length >= 2) {
          const readinessDiff = (last3Readiness[0]?.readiness_score || 0) - (last3Readiness[last3Readiness.length - 1]?.readiness_score || 0);
          readinessTrend = readinessDiff > 5 ? "↑ improving" : readinessDiff < -5 ? "↓ declining" : "stable";
        }

        wearableContext += `\n\nOURA RING SCORES:
- Avg Readiness Score: ${avgReadiness.toFixed(0)} (${readinessTrend})`;
      }

      if (sessionsWithSleep.length > 0) {
        const avgSleep = sessionsWithSleep.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / sessionsWithSleep.length;
        
        const last3Sleep = sessionsWithSleep.slice(0, 3);
        let sleepTrend = "stable";
        if (last3Sleep.length >= 2) {
          const sleepDiff = (last3Sleep[0]?.sleep_score || 0) - (last3Sleep[last3Sleep.length - 1]?.sleep_score || 0);
          sleepTrend = sleepDiff > 5 ? "↑ improving" : sleepDiff < -5 ? "↓ declining" : "stable";
        }

        wearableContext += `\n- Avg Sleep Score: ${avgSleep.toFixed(0)} (${sleepTrend})`;
      }

      if (sessionsWithActivity.length > 0) {
        const avgActivity = sessionsWithActivity.reduce((sum, s) => sum + (s.activity_score || 0), 0) / sessionsWithActivity.length;
        wearableContext += `\n- Avg Activity Score: ${avgActivity.toFixed(0)}`;
      }

      // Add recent activity metrics - only include populated fields
      const latestSession = wearableSessions[0];
      if (latestSession) {
        const activityParts: string[] = [];
        if (latestSession.total_steps) activityParts.push(`${latestSession.total_steps} steps`);
        if (latestSession.active_calories) activityParts.push(`${latestSession.active_calories} active cal`);
        if (latestSession.total_calories) activityParts.push(`${latestSession.total_calories} total cal`);
        if (latestSession.spo2_avg) activityParts.push(`SpO2: ${latestSession.spo2_avg}%`);
        if (latestSession.hrv_avg) activityParts.push(`HRV: ${latestSession.hrv_avg}ms`);
        if (latestSession.resting_hr) activityParts.push(`RHR: ${latestSession.resting_hr}bpm`);
        
        if (activityParts.length > 0) {
          wearableContext += `\n- Latest Activity (${latestSession.date}): ${activityParts.join(", ")}`;
        }
      }
    }

    if (!hasWearableData) {
      wearableContext = "\nWEARABLE DATA: No wearable data available yet. User may need to connect their Oura Ring.";
    }

    // ─── BUILD PROMPT CONTEXT ────────────────────────────────────────────────
    const contextInfo = `
USER PROFILE:
Name: ${userProfile?.name || "Not provided"}
Goals: ${userProfile?.goals?.join(", ") || "Not provided"}
Activity Level: ${userProfile?.activity_level || "Not specified"}
Injuries: ${userProfile?.injuries?.join(", ") || "None listed"}
Medical Conditions: ${userProfile?.conditions?.join(", ") || "None listed"}
Gender: ${userProfile?.gender || "Not specified"}
Date of Birth: ${userProfile?.dob || "Not provided"}

USER CONTEXT:
Nutrition Profile: ${JSON.stringify(userContext?.nutrition_profile || {}, null, 2)}
Medical Profile: ${JSON.stringify(userContext?.medical_profile || {}, null, 2)}
Training Profile: ${JSON.stringify(userContext?.training_profile || {}, null, 2)}

HEALTH PROFILE FROM DOCUMENTS:
${healthProfile?.ai_synthesis || "No comprehensive health profile available yet."}
${documentsContext}
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
            content: `You are Yves, an AI health intelligence coach for the Predictiv platform. Always respond in full sentences with clear grammar, natural pacing, and friendly professionalism. Use markdown formatting for readability:
• Bold important keywords or section titles.
• Keep responses concise and conversational.
• Ensure lists are consistently formatted and punctuated.
• Maintain a warm, coaching tone — never robotic.

You provide personalized, actionable advice using ALL available context:
- User's profile (goals, activity level, injuries, conditions)
- Uploaded documents (nutrition plans, medical records, training programs)
- Oura Ring data (sleep, readiness, activity scores, steps, calories)
- Conversation history and long-term memory

When referencing health data, use the specific metrics available. If certain metrics are not available, focus on what IS available rather than mentioning missing data.

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
      provider: "lovable-ai",
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
      has_wearable_data: hasWearableData,
      has_documents: userDocuments && userDocuments.length > 0,
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
