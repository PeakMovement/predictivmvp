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

    // ─── INPUT VALIDATION ─────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate request shape
    if (typeof body !== "object" || body === null) {
      return new Response(JSON.stringify({ error: "Request body must be an object" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = body as { query?: unknown };

    // Validate query field
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required and must be a string" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce length limits to prevent DoS
    if (query.length > 5000) {
      return new Response(JSON.stringify({ error: "Query exceeds maximum length of 5000 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query cannot be empty" }), {
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

    // ─── LOAD HEALTH ANOMALIES (NEW) ─────────────────────────────────────────
    const { data: healthAnomalies } = await supabase
      .from("health_anomalies")
      .select("*")
      .eq("user_id", user.id)
      .is("acknowledged_at", null)
      .order("detected_at", { ascending: false })
      .limit(10);

    // ─── LOAD USER DEVIATIONS (NEW) ──────────────────────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const { data: userDeviations } = await supabase
      .from("user_deviations")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", sevenDaysAgoStr)
      .order("date", { ascending: false });

    // ─── LOAD SYMPTOM CHECK-INS (NEW) ────────────────────────────────────────
    const { data: symptomCheckIns } = await supabase
      .from("symptom_check_ins")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);

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

    // ─── BUILD HEALTH ANOMALIES CONTEXT (NEW) ────────────────────────────────
    let anomaliesContext = "";
    if (healthAnomalies && healthAnomalies.length > 0) {
      anomaliesContext = "\n\n⚠️ ACTIVE HEALTH ANOMALIES:";
      for (const anomaly of healthAnomalies) {
        const severityIcon = anomaly.severity === "high" ? "🔴" : anomaly.severity === "medium" ? "🟠" : "🟡";
        anomaliesContext += `\n${severityIcon} ${anomaly.metric_name}: ${anomaly.anomaly_type}`;
        if (anomaly.deviation_percent) {
          anomaliesContext += ` (${anomaly.deviation_percent > 0 ? "+" : ""}${anomaly.deviation_percent.toFixed(1)}% from baseline)`;
        }
        if (anomaly.notes) {
          anomaliesContext += ` - ${anomaly.notes}`;
        }
      }
    }

    // ─── BUILD USER DEVIATIONS CONTEXT (NEW) ─────────────────────────────────
    let deviationsContext = "";
    if (userDeviations && userDeviations.length > 0) {
      deviationsContext = "\n\nTREND DEVIATIONS (Last 7 days):";
      const riskZoneOrder = { "high-risk": 0, "moderate-risk": 1, "elevated": 2, "optimal": 3 };
      const sortedDeviations = [...userDeviations].sort((a, b) => 
        (riskZoneOrder[a.risk_zone as keyof typeof riskZoneOrder] || 3) - 
        (riskZoneOrder[b.risk_zone as keyof typeof riskZoneOrder] || 3)
      );
      
      for (const dev of sortedDeviations.slice(0, 5)) {
        const riskIcon = dev.risk_zone === "high-risk" ? "🔴" : 
                         dev.risk_zone === "moderate-risk" ? "🟠" : 
                         dev.risk_zone === "elevated" ? "🟡" : "🟢";
        deviationsContext += `\n${riskIcon} ${dev.metric}: ${dev.deviation?.toFixed(1) || 0}% deviation (${dev.risk_zone || "unknown"})`;
        if (dev.baseline_value && dev.current_value) {
          deviationsContext += ` [baseline: ${dev.baseline_value} → current: ${dev.current_value}]`;
        }
      }
    }

    // ─── COACHING MODE CLASSIFICATION ─────────────────────────────────────────
    // Classify user context into one of: general_wellness, performance, rehab
    type CoachingMode = 'general_wellness' | 'performance' | 'rehab';
    
    const classifyCoachingMode = (): CoachingMode => {
      // Priority 1: REHAB - Check for symptoms, pain, injury risk, or high deviations
      const hasRecentSymptoms = symptomCheckIns && symptomCheckIns.length > 0;
      const hasSevereSymptoms = symptomCheckIns?.some(s => 
        s.severity === 'severe' || s.severity === 'moderate'
      );
      const hasPainSymptoms = symptomCheckIns?.some(s => 
        s.symptom_type?.toLowerCase().includes('pain') ||
        s.symptom_type?.toLowerCase().includes('ache') ||
        s.symptom_type?.toLowerCase().includes('sore') ||
        s.symptom_type?.toLowerCase().includes('injury')
      );
      const hasHighRiskAnomalies = healthAnomalies?.some(a => 
        a.severity === 'high' || a.severity === 'critical'
      );
      const hasHighRiskDeviations = userDeviations?.some(d => 
        d.risk_zone === 'high-risk' || d.risk_zone === 'moderate-risk'
      );
      const hasActiveInjuries = userProfile?.injuries?.length > 0;
      
      // Check for overload from training trends
      const latestTrend = trainingTrends?.[0];
      const isOverloaded = latestTrend?.acwr !== null && latestTrend?.acwr > 1.5;

      if (hasSevereSymptoms || hasPainSymptoms || hasHighRiskAnomalies || 
          hasHighRiskDeviations || hasActiveInjuries || isOverloaded) {
        return 'rehab';
      }

      // Priority 2: PERFORMANCE - Check for training focus, goals, high activity
      const performanceGoals = ['performance', 'strength', 'endurance', 'speed', 
        'muscle', 'training', 'competition', 'race', 'marathon', 'triathlon', 
        'gym', 'running', 'cycling', 'swimming', 'conditioning'];
      
      const hasPerformanceGoals = userProfile?.goals?.some((g: string) => 
        performanceGoals.some(pg => g.toLowerCase().includes(pg))
      );
      const hasHighActivityLevel = userProfile?.activity_level === 'very_active' || 
        userProfile?.activity_level === 'extremely_active';
      const hasTrainingData = trainingTrends && trainingTrends.length >= 3;
      const hasOptimalACWR = latestTrend?.acwr !== null && 
        latestTrend?.acwr >= 0.8 && latestTrend?.acwr <= 1.3;

      if (hasPerformanceGoals || (hasHighActivityLevel && hasTrainingData) || hasOptimalACWR) {
        return 'performance';
      }

      // Priority 3: GENERAL_WELLNESS - Default for recovery, sleep, stress, mobility
      return 'general_wellness';
    };

    const coaching_mode: CoachingMode = classifyCoachingMode();
    console.log(`[yves-chat] Coaching mode: ${coaching_mode} for user ${user.id}`);

    // ─── BUILD SYMPTOM CHECK-INS CONTEXT (NEW) ───────────────────────────────
    let symptomsContext = "";
    if (symptomCheckIns && symptomCheckIns.length > 0) {
      symptomsContext = "\n\nRECENT SYMPTOM CHECK-INS:";
      for (const symptom of symptomCheckIns.slice(0, 5)) {
        const severityIcon = symptom.severity === "severe" ? "🔴" : symptom.severity === "moderate" ? "🟠" : "🟡";
        const date = new Date(symptom.created_at).toLocaleDateString();
        symptomsContext += `\n${severityIcon} ${date}: ${symptom.symptom_type} (${symptom.severity})`;
        if (symptom.body_location) {
          symptomsContext += ` - Location: ${symptom.body_location}`;
        }
        if (symptom.description) {
          symptomsContext += ` - "${symptom.description.slice(0, 100)}${symptom.description.length > 100 ? "..." : ""}"`;
        }
        if (symptom.triggers && symptom.triggers.length > 0) {
          symptomsContext += ` - Triggers: ${symptom.triggers.join(", ")}`;
        }
      }
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
${anomaliesContext}
${deviationsContext}
${symptomsContext}

RECENT CONVERSATION HISTORY:
${conversationHistory}

LONG-TERM MEMORY:
${memoryContext}

USER QUESTION:
${query}
`;

    // ─── BUILD TONE GUIDANCE BASED ON COACHING MODE ───────────────────────────
    const toneGuidance: Record<CoachingMode, string> = {
      general_wellness: `
CURRENT TONE: GENERAL WELLNESS
• Be CALM and REASSURING - Create a sense of peace and balance
• Use LOW PRESSURE language - Never create urgency or stress
• Be SUPPORTIVE - Validate their journey and small wins
• Use gentle suggestions: "consider", "you might enjoy", "when you're ready"
• Focus on overall wellbeing, not just metrics`,

      performance: `
CURRENT TONE: PERFORMANCE
• Be CONFIDENT and MOTIVATING - Project certainty and energy
• Be DIRECTIVE - Give clear, actionable instructions
• Be GOAL-ORIENTED - Connect advice to their performance objectives
• Challenge them appropriately: "let's push", "time to capitalize", "build on this momentum"
• Reference metrics to support recommendations`,

      rehab: `
CURRENT TONE: REHAB
• Be CAUTIOUS and PROTECTIVE - Prioritize safety above all
• Be PRECISE - Specific about what to do AND what to avoid
• Be SAFETY-FIRST - Always err on the side of caution
• Be EMPATHETIC - Acknowledge frustration with limitations
• Never suggest pushing through symptoms or ignoring warning signs`
    };

    // ─── BUILD SYMPTOM ACKNOWLEDGEMENT INSTRUCTION ────────────────────────────
    const hasRecentSymptoms = symptomCheckIns && symptomCheckIns.length > 0;
    const recentSymptomTypes = hasRecentSymptoms 
      ? symptomCheckIns.map((s: any) => s.symptom_type).filter(Boolean).slice(0, 3).join(', ')
      : '';
    const symptomAcknowledgement = hasRecentSymptoms ? `
SYMPTOM-AWARE CONVERSATION (MANDATORY):
The user has logged recent symptoms${recentSymptomTypes ? ` (${recentSymptomTypes})` : ''}. Make the conversation feel alive and caring:

WARM OPENERS (use naturally when starting a response):
• "Before we dive in, how's the [symptom] you mentioned earlier?"
• "Let's check in on how your body's been feeling."
• "I noticed you logged [symptom] recently—how's that going?"
• "First things first: how are you feeling today?"

ACKNOWLEDGEMENT (when discussing health topics):
• "I see you've been dealing with [symptom] recently."
• "Given the [symptom] you logged, let's factor that in."

Guidelines:
- Use warm openers when the conversation is starting or shifting topics
- Acknowledge symptoms when relevant to the user's question
- Feel natural and human—don't force it if unrelated to their question
- Do NOT provide medical advice—just show you care and remember
` : '';

    // ─── SEND TO AI ───────────────────────────────────────────────────────────
    const ai = getAIProvider();
    let aiResponse;

    // ─── BUILD NAME PERSONALIZATION INSTRUCTION ────────────────────────────
    const userName = userProfile?.name?.split(' ')[0] || null;
    const nameInstruction = userName ? `
NAME USAGE: The user's first name is "${userName}". Do NOT use it by default. Only use the name when it adds emotional or contextual value — such as praising consistency ("Your consistency has been impressive this week, ${userName}"), expressing concern, referencing a previously reported issue ("Given what you mentioned about your knee, ${userName}"), or acknowledging multi-day progress. Never start with the name. Never use it more than once per response. Never use it in purely technical statements.
` : '';

    try {
      aiResponse = await ai.chat({
        messages: [
          {
            role: "system",
            content: `You are Yves, a calm, highly experienced performance coach and clinician.

═══ CORE IDENTITY ═══
You speak to users as an intelligent human would, not as a system.
Your goal is to help users make better daily decisions, not to scare or control them.
You avoid alarmist language, certainty, and overuse of medical terms.
You never mention data sources, systems, models, or detection mechanisms.
Speak WITH the user, not AT the user.
Always respond in full sentences with clear grammar, natural pacing, and friendly professionalism.

═══ GROUNDED OBSERVATION RULE ═══
Every response MUST begin with a grounded observation about the user's recent pattern.
The observation must reference: a trend, a direction of change, and a short timeframe.
Never give advice without first anchoring it to an observable pattern.
Use language like: "You've been trending toward…", "Over the past few days…", "Recently, your training has…"
Never provide generic advice or advice without context.

═══ SOFT COUNTERFACTUAL ═══
When appropriate, include ONE soft counterfactual sentence explaining what is likely to happen if nothing changes today.
Rules: No certainty, no injury guarantees, no fear language, no urgency. Tone must be informational and calm.
Examples: "If this pattern continues today, recovery may feel slightly delayed." / "Keeping intensity high again could make stiffness more noticeable later this week." / "Without a small adjustment, fatigue may carry into tomorrow."
The counterfactual is optional. Never include more than one.


═══ TONE MODE SELECTION (MANDATORY) ═══
Before generating any response, determine exactly ONE tone mode based on the user's current context. Never mix tones in a single response.
• AFFIRMING — Use when trends are positive, adherence is good. Celebrate consistency and progress.
• GUIDING — Use when trends are neutral. Offer calm adjustment suggestions without alarm.
• CAUTIOUS — Use when risk is rising or early warning signs appear. Be measured but clear about what you're observing.
• REASSURING — Use post-alert, during uncertainty, or when the user may feel anxious. Reduce tension, normalize the situation.
Selection is based on: deviation from baseline, consecutive days of a pattern, injury/symptom history, and previous response to similar advice.

═══ MODULAR PROMPT STRUCTURE ═══
Assemble responses from these components — use 2–4 per response, never all at once, and vary structure between days:
• Observation (required) — a grounded pattern observation
• Affirmation (optional) — acknowledge effort or consistency
• Soft counterfactual (optional) — one calm "if nothing changes" sentence
• Recommendation (required) — specific, actionable suggestion
• Gentle closing question (optional) — invite reflection or check-in
Do NOT follow a fixed paragraph structure. This prevents sounding repetitive.

${toneGuidance[coaching_mode]}
${symptomAcknowledgement}${nameInstruction}
COACHING LANGUAGE (use instead of clinical phrasing):
• "Metrics indicate" → "What I'm seeing suggests"
• "Consider reducing intensity" → "Let's ease off today"
• "Suboptimal recovery" → "Your body hasn't fully recharged"
• "Data suggests" → "It looks like"
• "Recommend" → "I'd suggest" or "Let's try"
• "Elevated strain" → "You've been pushing hard"
Speak like a trusted coach, not a medical report.

CONFLICT RESOLUTION (symptoms vs metrics):
If performance metrics are strong BUT symptoms are present, ALWAYS default to safety-oriented guidance.
Explain the trade-off briefly: "Your metrics look solid, but the [symptom] changes today's priority."
Symptoms override metrics. Safety first, always.

Use markdown formatting for readability:
• Bold important keywords or section titles.
• Keep responses concise and conversational.
• Ensure lists are consistently formatted and punctuated.

TODAY'S FOCUS (when providing recommendations):
End substantive advice with a "Today's Focus" section containing ONE clear action with timing/duration.
Format: "**🎯 Today's Focus:** [single actionable item]"
Example: "**🎯 Today's Focus:** 20 minutes of easy movement and an early bedtime."
One focus only. No mixed messages.

You provide personalized, actionable advice using ALL available context:
- User's profile (goals, activity level, injuries, conditions)
- Uploaded documents (nutrition plans, medical records, training programs)
- Oura Ring data (sleep, readiness, activity scores, steps, calories)
- Health anomalies (flagged deviations requiring attention)
- Trend deviations (metrics moving outside normal baseline ranges)
- Symptom check-ins (user-reported symptoms with severity and triggers)
- Conversation history and long-term memory

CRITICAL REASONING INSTRUCTIONS:
1. When health anomalies are present, ALWAYS address them proactively.
2. Cross-reference symptoms with trend deviations to identify patterns.
3. Consider the relationship between training load, recovery metrics, and reported symptoms.
4. Provide actionable recommendations based on the combined context.
5. If symptoms conflict with good metrics, prioritize symptom-based safety guidance.

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
            body: { 
              user_id: user.id, 
              memory_key: memory_key.trim(), 
              memory_value: memory_value.trim(),
              source_timestamp: new Date().toISOString() // For memory_cleared_at safeguard
            },
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
