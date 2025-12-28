import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface YvesIntelligenceRequest {
  user_id?: string;
}

interface YvesIntelligenceOutput {
  dailyBriefing: {
    summary: string;
    keyChanges: string[];
    riskHighlights: string[];
  };
  recommendations: Array<{
    text: string;
    category: 'training' | 'recovery' | 'nutrition' | 'medical' | 'sleep' | 'activity';
    priority: 'high' | 'medium' | 'low';
    reasoning: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;
    try {
      const body = await req.json() as YvesIntelligenceRequest;
      userId = body.user_id || null;
    } catch {
      // No body provided
    }

    if (!userId) {
      // Try to get from auth header
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if we already have today's intelligence
    const { data: existingIntelligence } = await supabase
      .from("daily_briefings")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .eq("category", "unified")
      .maybeSingle();

    if (existingIntelligence && existingIntelligence.context_used) {
      console.log(`[generate-yves-intelligence] Returning cached intelligence for user ${userId}`);
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          data: existingIntelligence.context_used as YvesIntelligenceOutput,
          content: existingIntelligence.content,
          created_at: existingIntelligence.created_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── LOAD ALL USER DATA ────────────────────────────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const [
      wearableSummaryResult,
      wearableSessionsResult,
      userDocumentsResult,
      memoryBankResult,
      userProfileResult,
      userContextResult,
      symptomCheckInsResult,
      recentRecommendationsResult,
    ] = await Promise.all([
      supabase.from("wearable_summary").select("*").eq("user_id", userId).gte("date", sevenDaysAgoStr).order("date", { ascending: false }),
      supabase.from("wearable_sessions").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("user_documents").select("document_type, file_name, parsed_content, ai_summary, tags").eq("user_id", userId).eq("processing_status", "completed").order("uploaded_at", { ascending: false }).limit(5),
      supabase.from("yves_memory_bank").select("memory_key, memory_value").eq("user_id", userId),
      supabase.from("user_profile").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_context_enhanced").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("symptom_check_ins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("yves_recommendations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    ]);

    const wearableSummary = wearableSummaryResult.data || [];
    const wearableSessions = wearableSessionsResult.data || [];
    const userDocuments = userDocumentsResult.data || [];
    const memoryBank = memoryBankResult.data || [];
    const userProfile = userProfileResult.data;
    const userContext = userContextResult.data;
    const symptomCheckIns = symptomCheckInsResult.data || [];
    const recentRecommendations = recentRecommendationsResult.data || [];

    const hasWearableData = wearableSummary.length > 0 || wearableSessions.length > 0;

    // ─── BUILD COMPREHENSIVE CONTEXT ─────────────────────────────────────────
    let promptContext = "";

    // Wearable metrics
    if (hasWearableData) {
      if (wearableSessions.length > 0) {
        const latestSession = wearableSessions[0];
        const previousSession = wearableSessions[1];

        promptContext += `CURRENT HEALTH STATE (${latestSession.date}):\n`;
        
        if (latestSession.readiness_score !== null) {
          const readinessChange = previousSession?.readiness_score 
            ? latestSession.readiness_score - previousSession.readiness_score 
            : 0;
          promptContext += `- Readiness Score: ${latestSession.readiness_score}/100 (${readinessChange >= 0 ? '+' : ''}${readinessChange} vs yesterday)\n`;
        }
        
        if (latestSession.sleep_score !== null) {
          const sleepChange = previousSession?.sleep_score 
            ? latestSession.sleep_score - previousSession.sleep_score 
            : 0;
          promptContext += `- Sleep Score: ${latestSession.sleep_score}/100 (${sleepChange >= 0 ? '+' : ''}${sleepChange} vs yesterday)\n`;
        }
        
        if (latestSession.activity_score !== null) {
          promptContext += `- Activity Score: ${latestSession.activity_score}/100\n`;
        }
        
        if (latestSession.hrv_avg !== null) {
          promptContext += `- HRV: ${latestSession.hrv_avg}ms\n`;
        }
        
        if (latestSession.resting_hr !== null) {
          promptContext += `- Resting HR: ${latestSession.resting_hr}bpm\n`;
        }
        
        if (latestSession.total_steps) {
          promptContext += `- Steps: ${latestSession.total_steps}\n`;
        }
        
        if (latestSession.active_calories) {
          promptContext += `- Active Calories: ${latestSession.active_calories}\n`;
        }
        
        promptContext += "\n";
      }

      // Weekly trends
      if (wearableSummary.length > 0) {
        const avgStrain = wearableSummary.reduce((sum, s) => sum + (s.strain || 0), 0) / wearableSummary.length;
        const avgAcwr = wearableSummary.reduce((sum, s) => sum + (s.acwr || 0), 0) / wearableSummary.length;
        
        promptContext += `7-DAY TRAINING TRENDS:\n`;
        promptContext += `- Avg Strain: ${avgStrain.toFixed(1)}\n`;
        promptContext += `- ACWR (Acute:Chronic Workload Ratio): ${avgAcwr.toFixed(2)}`;
        
        if (avgAcwr > 1.5) {
          promptContext += ` ⚠️ HIGH RISK - Potential overtraining\n`;
        } else if (avgAcwr < 0.8) {
          promptContext += ` ⚠️ LOW - Undertrained, can increase load\n`;
        } else {
          promptContext += ` ✓ OPTIMAL ZONE\n`;
        }
        promptContext += "\n";
      }

      // Multi-day trend analysis
      if (wearableSessions.length >= 3) {
        const avgReadiness = wearableSessions
          .filter(s => s.readiness_score !== null)
          .reduce((sum, s) => sum + (s.readiness_score || 0), 0) / wearableSessions.filter(s => s.readiness_score !== null).length;
        
        const avgSleep = wearableSessions
          .filter(s => s.sleep_score !== null)
          .reduce((sum, s) => sum + (s.sleep_score || 0), 0) / wearableSessions.filter(s => s.sleep_score !== null).length;
        
        promptContext += `3-DAY AVERAGES:\n`;
        if (!isNaN(avgReadiness)) promptContext += `- Avg Readiness: ${avgReadiness.toFixed(0)}\n`;
        if (!isNaN(avgSleep)) promptContext += `- Avg Sleep Score: ${avgSleep.toFixed(0)}\n`;
        promptContext += "\n";
      }
    }

    // Recent symptoms
    if (symptomCheckIns.length > 0) {
      promptContext += `RECENT SYMPTOM CHECK-INS:\n`;
      symptomCheckIns.slice(0, 3).forEach(s => {
        promptContext += `- ${s.symptom_type} (${s.severity}): ${s.description || 'No description'}\n`;
      });
      promptContext += "\n";
    }

    // User documents
    if (userDocuments.length > 0) {
      promptContext += `UPLOADED HEALTH DOCUMENTS:\n`;
      for (const doc of userDocuments) {
        promptContext += `- ${doc.document_type}: `;
        if (doc.ai_summary) {
          promptContext += `${doc.ai_summary.slice(0, 200)}...\n`;
        } else if (doc.tags?.length > 0) {
          promptContext += `Tags: ${doc.tags.join(", ")}\n`;
        } else {
          promptContext += `${doc.file_name}\n`;
        }
      }
      promptContext += "\n";
    }

    // User profile & goals
    if (userProfile) {
      promptContext += `USER PROFILE:\n`;
      if (userProfile.name) promptContext += `- Name: ${userProfile.name}\n`;
      if (userProfile.goals?.length > 0) promptContext += `- Goals: ${userProfile.goals.join(", ")}\n`;
      if (userProfile.activity_level) promptContext += `- Activity Level: ${userProfile.activity_level}\n`;
      if (userProfile.injuries?.length > 0) promptContext += `- Current Injuries: ${userProfile.injuries.join(", ")}\n`;
      if (userProfile.conditions?.length > 0) promptContext += `- Health Conditions: ${userProfile.conditions.join(", ")}\n`;
      promptContext += "\n";
    }

    // Memory/preferences
    if (memoryBank.length > 0) {
      promptContext += `YVES MEMORY (past conversations):\n`;
      memoryBank.slice(0, 5).forEach(m => {
        const valueStr = typeof m.memory_value === 'string' 
          ? m.memory_value 
          : JSON.stringify(m.memory_value).slice(0, 100);
        promptContext += `- ${m.memory_key}: ${valueStr}\n`;
      });
      promptContext += "\n";
    }

    // Recent recommendations for continuity
    if (recentRecommendations.length > 0) {
      promptContext += `PREVIOUS RECOMMENDATIONS (for continuity):\n`;
      recentRecommendations.slice(0, 3).forEach(r => {
        promptContext += `- ${r.category}: ${r.recommendation_text.slice(0, 100)}...\n`;
      });
      promptContext += "\n";
    }

    // ─── AI CALL WITH STRUCTURED OUTPUT ────────────────────────────────────
    const systemPrompt = `You are Yves, an AI health intelligence coach. You MUST generate a coordinated daily health analysis with BOTH a daily briefing AND actionable recommendations.

CRITICAL: The briefing and recommendations MUST be consistent - they should reference the same data and not contradict each other.

Generate output as a JSON object with this exact structure:
{
  "dailyBriefing": {
    "summary": "2-3 sentence interpretive summary of current health state",
    "keyChanges": ["change1", "change2", "change3"],
    "riskHighlights": ["risk1 if any"]
  },
  "recommendations": [
    {
      "text": "Specific actionable recommendation",
      "category": "training|recovery|nutrition|medical|sleep|activity",
      "priority": "high|medium|low",
      "reasoning": "Brief explanation tied to the data"
    }
  ]
}

RULES:
1. Daily Briefing should interpret the health state, highlight changes from previous days, and identify any risks
2. Recommendations should be practical next steps that EXPAND on the briefing insights
3. Include 2-4 recommendations ordered by priority
4. Reference specific numbers from the data
5. If readiness is low (<70), prioritize recovery recommendations
6. If ACWR is >1.3, warn about overtraining
7. Consider the user's goals and health conditions
8. Be encouraging but honest about areas needing attention

RESPOND WITH ONLY THE JSON OBJECT, NO OTHER TEXT.`;

    const userPrompt = hasWearableData 
      ? `Analyze this user's health data and generate a coordinated briefing + recommendations:\n\n${promptContext}`
      : userProfile
        ? `Generate a welcoming intelligence report for a new user:\n\n${promptContext}\n\nEncourage them to connect their Oura Ring for personalized insights.`
        : `Generate a brief welcome message as JSON, encouraging the user to set up their profile and connect their Oura Ring.`;

    console.log(`[generate-yves-intelligence] Calling AI for user ${userId}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[generate-yves-intelligence] AI error:`, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `AI error: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: "AI returned no content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from AI response
    let intelligenceData: YvesIntelligenceOutput;
    try {
      // Remove markdown code blocks if present
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      intelligenceData = JSON.parse(content);
    } catch (parseError) {
      console.error(`[generate-yves-intelligence] JSON parse error:`, parseError, content);
      
      // Fallback structure
      intelligenceData = {
        dailyBriefing: {
          summary: "Unable to generate personalized briefing. Please ensure your Oura Ring is connected and synced.",
          keyChanges: [],
          riskHighlights: [],
        },
        recommendations: [{
          text: "Connect your Oura Ring to unlock personalized health insights",
          category: "recovery",
          priority: "high",
          reasoning: "Wearable data enables accurate health tracking"
        }]
      };
    }

    // Create readable briefing content for storage
    const briefingContent = `${intelligenceData.dailyBriefing.summary}\n\n` +
      (intelligenceData.dailyBriefing.keyChanges.length > 0 
        ? `📊 Key Changes:\n${intelligenceData.dailyBriefing.keyChanges.map(c => `• ${c}`).join('\n')}\n\n` 
        : '') +
      (intelligenceData.dailyBriefing.riskHighlights.length > 0 
        ? `⚠️ Attention:\n${intelligenceData.dailyBriefing.riskHighlights.map(r => `• ${r}`).join('\n')}` 
        : '');

    // ─── SAVE TO DATABASE ────────────────────────────────────────────────
    await supabase.from("daily_briefings").upsert({
      user_id: userId,
      date: today,
      content: briefingContent.trim(),
      context_used: intelligenceData,
      category: "unified",
    });

    // Also save individual recommendations
    for (const rec of intelligenceData.recommendations) {
      await supabase.from("yves_recommendations").insert({
        user_id: userId,
        recommendation_text: rec.text,
        category: rec.category,
        priority: rec.priority,
        source: "unified-intelligence",
      });
    }

    console.log(`[generate-yves-intelligence] Intelligence generated for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        data: intelligenceData,
        content: briefingContent.trim(),
        created_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-yves-intelligence] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
