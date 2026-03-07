import { createClient } from "npm:@supabase/supabase-js@2";
import { getAIProvider } from "../_shared/ai-provider.ts";
import { RateLimiter, RATE_LIMIT_CONFIGS } from "../_shared/rate-limiter.ts";

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

    // ─── RATE LIMITING ───────────────────────────────────────────────────────
    const rateLimiter = new RateLimiter();
    const rateLimitResult = await rateLimiter.checkRateLimit(
      user.id,
      RATE_LIMIT_CONFIGS.AI_CHAT
    );

    if (!rateLimitResult.allowed) {
      return rateLimiter.createRateLimitResponse(rateLimitResult);
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

    // ─── LOAD PERSONAL BASELINE DATA ─────────────────────────────────────────
    const { data: userBaselines } = await supabase
      .from("user_baselines")
      .select("metric, rolling_avg")
      .eq("user_id", user.id);

    // ─── LOAD EXTENDED PROFILE DATA ──────────────────────────────────────────
    const { data: trainingProfile } = await supabase
      .from("user_training")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: lifestyleProfile } = await supabase
      .from("user_lifestyle")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: interestsProfile } = await supabase
      .from("user_interests")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: wellnessGoals } = await supabase
      .from("user_wellness_goals")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // ─── LOAD ACTIVE INJURY PROFILE ───────────────────────────────────────────
    const { data: injuryProfile } = await supabase
      .from("user_injury_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build baseline lookup map
    const baselineMap: Record<string, number> = {};
    userBaselines?.forEach((b: any) => { baselineMap[b.metric] = Number(b.rolling_avg); });

    // Helper: format a metric vs its personal baseline
    const vsBaseline = (current: number, metric: string, unit = ''): string => {
      const bl = baselineMap[metric];
      if (!bl) return `${current}${unit}`;
      const delta = ((current - bl) / bl * 100);
      const dir = delta >= 0 ? 'above' : 'below';
      return `${current}${unit} (${Math.abs(delta).toFixed(1)}% ${dir} your ${Math.round(bl)}${unit} personal baseline)`;
    };

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
      
      // Calculate Fatigue Index: (Strain / 2000) × 50 + (cappedMonotony / 2.5) × 50
      const cappedMonotony = Math.min(avgMonotony, 2.5);
      fatigueIndex = Math.min(100, Math.round((Math.min(avgStrain, 2000) / 2000) * 50 + (cappedMonotony / 2.5) * 50));
      
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
      const hasActiveInjuryProfile = !!(injuryProfile as any)?.is_active;

      // Check for overload from training trends
      const latestTrend = trainingTrends?.[0];
      const isOverloaded = latestTrend?.acwr !== null && latestTrend?.acwr > 1.5;

      if (hasSevereSymptoms || hasPainSymptoms || hasHighRiskAnomalies ||
          hasHighRiskDeviations || hasActiveInjuries || hasActiveInjuryProfile || isOverloaded) {
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

    // ─── EDGE CASE FLAGS (for Task 7 — test all edge cases) ───────────────────
    const daysToEvent = wellnessGoals?.target_date
      ? Math.floor((new Date(wellnessGoals.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    const isPreCompetition = daysToEvent !== null && daysToEvent >= 0 && daysToEvent <= 14;
    const injuryKeywords = ['pain', 'hurt', 'sore', 'ache', 'injury', 'injur', 'strain', 'sprain', 'twinge', 'discomfort', 'niggling', 'twinge'];
    const queryLower = query.toLowerCase();
    const hasInjuryFlagInQuestion = injuryKeywords.some(kw => queryLower.includes(kw));

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
    // Sport, position, training phase
    let sportContext = "";
    if (trainingProfile?.preferred_activities?.length) {
      sportContext += `Sport/Activities: ${trainingProfile.preferred_activities.join(", ")}\n`;
    }
    if (trainingProfile?.training_frequency) sportContext += `Training Frequency: ${trainingProfile.training_frequency}\n`;
    if (trainingProfile?.intensity_preference) sportContext += `Intensity Preference: ${trainingProfile.intensity_preference}\n`;
    if (trainingProfile?.current_phase) sportContext += `Current Training Phase: ${trainingProfile.current_phase}\n`;
    if (trainingProfile?.equipment_access?.length) sportContext += `Equipment: ${trainingProfile.equipment_access.join(", ")}\n`;

    // Lifestyle and stress
    let lifestyleContext = "";
    if (lifestyleProfile?.stress_level) lifestyleContext += `Current Stress Level: ${lifestyleProfile.stress_level}\n`;
    if (lifestyleProfile?.work_schedule) lifestyleContext += `Work Schedule: ${lifestyleProfile.work_schedule}\n`;
    if (lifestyleProfile?.daily_routine) lifestyleContext += `Daily Routine: ${lifestyleProfile.daily_routine}\n`;

    // Interests and hobbies
    let hobbiesContext = "";
    if (interestsProfile) {
      const all = [...(interestsProfile.hobbies || []), ...(interestsProfile.interests || [])];
      if (all.length) hobbiesContext = `Hobbies/Interests: ${all.join(", ")}\n`;
    }

    // Event/goal timeline
    let eventContext = "";
    if (wellnessGoals?.target_date) {
      const daysToEvent = Math.floor((new Date(wellnessGoals.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToEvent > 0) eventContext += `Next Event/Goal: ${wellnessGoals.target_date} (${daysToEvent} days away)\n`;
    }
    if (wellnessGoals?.goals?.length) eventContext += `Wellness Goals: ${wellnessGoals.goals.join(", ")}\n`;

    // Personal baseline comparison block
    let baselineContext = "";
    if (Object.keys(baselineMap).length > 0) {
      baselineContext = "\nPERSONAL BASELINES (28-day rolling averages):\n";
      if (baselineMap['hrv']) baselineContext += `- HRV Baseline: ${Math.round(baselineMap['hrv'])}ms\n`;
      if (baselineMap['sleep_score']) baselineContext += `- Sleep Score Baseline: ${Math.round(baselineMap['sleep_score'])}\n`;
      if (baselineMap['acwr']) baselineContext += `- ACWR Baseline: ${baselineMap['acwr'].toFixed(2)}\n`;
      if (baselineMap['strain']) baselineContext += `- Strain Baseline: ${Math.round(baselineMap['strain'])}\n`;
      if (baselineMap['chronic_load']) baselineContext += `- Chronic Load Baseline: ${baselineMap['chronic_load'].toFixed(1)}\n`;
    } else {
      baselineContext = "\nPERSONAL BASELINES: Still building (not enough history yet — use rolling trend averages from wearable data).\n";
    }

    // Latest HRV and sleep with baseline comparison for quick reference
    let currentVsBaseline = "";
    if (wearableSessions && wearableSessions.length > 0) {
      const latest = wearableSessions[0];
      if (latest.hrv_avg && baselineMap['hrv']) {
        currentVsBaseline += `\nCURRENT vs BASELINE:\n- HRV: ${vsBaseline(Math.round(latest.hrv_avg), 'hrv', 'ms')}\n`;
      }
      if (latest.sleep_score && baselineMap['sleep_score']) {
        currentVsBaseline += `- Sleep Score: ${vsBaseline(latest.sleep_score, 'sleep_score')}\n`;
      }
    }
    if (trainingTrends && trainingTrends.length > 0 && trainingTrends[0].acwr != null && baselineMap['acwr']) {
      currentVsBaseline += `- ACWR: ${vsBaseline(Number(trainingTrends[0].acwr.toFixed(2)), 'acwr')}\n`;
    }

    // ─── BUILD INJURY SAFETY HEADER — always first in contextInfo ────────────
    const injurySafetyHeader = (() => {
      if (!injuryProfile) return '';
      const ip = injuryProfile as any;
      const phaseLabels: Record<string, string> = {
        acute: 'Acute', sub_acute: 'Sub-Acute', rehabilitation: 'Rehabilitation',
        return_to_sport: 'Return to Sport', full_clearance: 'Full Clearance'
      };
      let header = `⚠️ ACTIVE INJURY — READ BEFORE RESPONDING:\n`;
      header += `Injury: ${ip.injury_type?.replace(/_/g, ' ')} — ${ip.body_location}\n`;
      header += `Phase: ${phaseLabels[ip.current_phase] ?? ip.current_phase}\n`;
      if (ip.load_restrictions) {
        header += `\nPROHIBITED ACTIVITIES (NEVER SUGGEST — NON-NEGOTIABLE):\n${ip.load_restrictions}\n`;
        header += `Before mentioning ANY activity in your response: cross-check it against these restrictions. If it conflicts, name a specific compliant alternative instead.\n`;
      }
      return header + '\n';
    })();

    const contextInfo = `
${injurySafetyHeader}ATHLETE PROFILE:
Name: ${userProfile?.name || "Not provided"}
Age: ${userProfile?.dob ? Math.floor((Date.now() - new Date(userProfile.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : "Not provided"}
Gender: ${userProfile?.gender || "Not specified"}
Goals: ${userProfile?.goals?.join(", ") || "Not provided"}
Activity Level: ${userProfile?.activity_level || "Not specified"}
Injury History: ${userProfile?.injuries?.join(", ") || "None listed"}
Medical Conditions: ${userProfile?.conditions?.join(", ") || "None listed"}
${sportContext}${lifestyleContext}${hobbiesContext}${eventContext}
USER CONTEXT (enhanced):
Nutrition: ${JSON.stringify(userContext?.nutrition_profile || {}, null, 2)}
Medical: ${JSON.stringify(userContext?.medical_profile || {}, null, 2)}
Training: ${JSON.stringify(userContext?.training_profile || {}, null, 2)}

HEALTH PROFILE FROM DOCUMENTS:
${healthProfile?.ai_synthesis || "No comprehensive health profile available yet."}
${documentsContext}
${baselineContext}
${currentVsBaseline}
${wearableContext}
${anomaliesContext}
${deviationsContext}
${symptomsContext}

${(() => {
  if (!injuryProfile) return '';
  const ip = injuryProfile as any;
  const injuryDate = new Date(ip.injury_date);
  const daysSince = Math.floor((Date.now() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));
  const phaseLabels: Record<string, string> = {
    acute: 'Acute', sub_acute: 'Sub-Acute', rehabilitation: 'Rehabilitation',
    return_to_sport: 'Return to Sport', full_clearance: 'Full Clearance'
  };
  let block = `\nACTIVE INJURY PROFILE (MANDATORY CONTEXT — READ BEFORE RESPONDING):\n`;
  block += `Injury: ${ip.injury_type?.replace(/_/g, ' ')} — ${ip.body_location}\n`;
  block += `Current Phase: ${phaseLabels[ip.current_phase] ?? ip.current_phase} (Day ${daysSince})\n`;
  if (ip.treating_practitioner_name) {
    block += `Treating Practitioner: ${ip.treating_practitioner_name}`;
    if (ip.treating_practitioner_type) block += ` (${ip.treating_practitioner_type.replace(/_/g, ' ')})`;
    block += `\n`;
  }
  if (ip.load_restrictions) {
    block += `\n!!! LOAD RESTRICTIONS — NEVER VIOLATE IN ANY RESPONSE !!!\n${ip.load_restrictions}\n`;
    block += `These are non-negotiable. Never suggest an activity that conflicts with these restrictions.\n`;
  }
  if (ip.target_return_date) {
    const daysToReturn = Math.floor((new Date(ip.target_return_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    block += `Target Return: ${ip.target_return_date} (${daysToReturn > 0 ? `${daysToReturn} days away` : 'overdue — advise practitioner check-in'})\n`;
  }
  if (Array.isArray(ip.clearance_milestones) && ip.clearance_milestones.length > 0) {
    const next = (ip.clearance_milestones as any[]).find(m => !m.achieved);
    if (next) block += `Next Milestone: "${next.milestone}" (not yet achieved)\n`;
  }
  return block;
})()}
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

    // ─── NO DATA PROTOCOL (Task 7) ────────────────────────────────────────────
    const noDataProtocol = !hasWearableData ? `
═══ NO WEARABLE DATA PROTOCOL (MANDATORY) ═══
The user has NO wearable data (Oura, Garmin, etc.) connected or synced.

RULES:
1. NEVER pretend you have data. Do NOT say "your HRV", "your sleep score", "your readiness" as if you have it.
2. For questions that REQUIRE data (recovery, overtraining, sleep analysis, HRV, load) — be honest: "I don't have your wearable data yet. Connect your device in Settings and sync — then I can give you a proper answer."
3. You MAY offer general wellness principles that don't rely on data (e.g. "Generally, 7-9h sleep supports recovery" or "Listen to your body when fatigued").
4. Gently guide them to connect a device: "Once you connect your Oura Ring or Garmin in Settings, I'll be able to personalise this."
5. Never give data-specific advice (e.g. "your ACWR suggests...") when no data exists.
` : '';

    // ─── PRE-COMPETITION PROTOCOL (Task 7) ────────────────────────────────────
    const preCompetitionProtocol = isPreCompetition && daysToEvent !== null ? `
═══ PRE-COMPETITION PROTOCOL (MANDATORY) ═══
The user has an event in ${daysToEvent} days. Race/competition week context applies.

RULES:
1. Do NOT recommend hard or intense sessions. Prioritise freshness over fitness.
2. Taper guidance: easy movement, short sharp efforts only if race is >3 days out, full rest day before race.
3. If they ask "can I do one more hard session?" — advise against. "You've done the work. Now it's about staying fresh."
4. Emphasise sleep, hydration, and low stress. No new stimuli.
` : '';

    // ─── INJURY FLAG IN QUESTION — extra emphasis (Task 7) ─────────────────────
    const injuryFlagEmphasis = hasInjuryFlagInQuestion ? `
NOTE: The user's question mentions pain, injury, or discomfort. Apply INJURY FLAG IN QUESTION PROTOCOL. Default to caution. Never suggest pushing through.
` : '';

    // ─── SEND TO AI ───────────────────────────────────────────────────────────
    const ai = getAIProvider();
    let aiResponse;

    // ─── BUILD NAME PERSONALIZATION INSTRUCTION ────────────────────────────
    const memoryPreferredName = memoryBank?.find((m: { memory_key: string; memory_value: string }) => m.memory_key === 'preferred_name')?.memory_value;
    const userName = userProfile?.name?.split(' ')[0] || memoryPreferredName?.split(' ')[0] || null;
    const nameInstruction = userName ? `
NAME USAGE: The user's first name is "${userName}". Do NOT use it by default. Only use the name when it adds emotional or contextual value — such as praising consistency ("Your consistency has been impressive this week, ${userName}"), expressing concern, referencing a previously reported issue ("Given what you mentioned about your knee, ${userName}"), or acknowledging multi-day progress. Never start with the name. Never use it more than once per response. Never use it in purely technical statements.
` : '';

    try {
      aiResponse = await ai.chat({
        messages: [
          {
            role: "system",
            content: `You are Yves — a medical-grade sports performance advisor. You combine the clinical precision of a sports medicine physician, the tactical knowledge of an elite S&C coach, and the warmth of a trusted mentor who has followed this athlete's journey closely.

═══ CORE PERSONA ═══
DIRECT: No filler phrases. No "That's a great question." No "Certainly!" Speak with authority and get to what matters immediately.
ANALYTICAL: Always cite exact numbers. Name the metric, state the exact value, compare to their personal baseline with % or point difference.
WARM: You know this person — their sport, their injuries, their goals, their struggles. Speak with that familiarity, not like a wellness chatbot.
EMPATHETIC: Acknowledge the human context before delivering hard truths. You are a trusted advisor, not a data dashboard.
NEVER: generic preamble, vague qualifiers ("a bit", "somewhat", "might want to consider"), wellness platitudes ("listen to your body", "stay hydrated"), or population-norm comparisons.
Never mention data sources, systems, models, or detection mechanisms. Never say "the system", "we detected", or "your data shows".

═══ PERSONAL BASELINE RULE (MANDATORY) ═══
NEVER compare a metric to population averages or generic norms.
ALWAYS compare to THIS athlete's own established baseline.
Correct: "Your HRV of 52ms is 18% below your personal baseline of 63ms — that's meaningful."
Wrong: "Your HRV is a bit low for someone your age."
If no long-term baseline exists, use their available rolling average and state it honestly:
"Over the past X days you've averaged Yms — today's Zms sits [above/below] that."

═══ CONTEXT ANCHORING (MANDATORY) ═══
Every response must connect to at least ONE of:
- Their specific sport, position, or training phase (name it explicitly)
- A named injury or condition they have (reference it directly)
- Their event timeline (e.g., "with your half marathon 19 days out...")
- Their stress level or life context (e.g., "with elevated stress this week...")
- Their hobbies or interests when making an analogy (keep it natural, not forced)

═══ VAGUE QUESTION PROTOCOL (MANDATORY) ═══
If the question is too broad to give precise, personalised advice — such as "Am I overtraining?", "What should I do today?", "Is this normal?", "How am I doing?", "Should I train?" — you MUST ask EXACTLY ONE clarifying question before answering. Pick the single most useful unknown.
Do NOT give generic advice. Do NOT give a list of options. Ask ONE question first.
Example: "Before I give you a useful answer — are you feeling physically exhausted, or is it more of a mental and motivational drag?"
Example: "To give you a real answer — what specifically feels off? Your sleep, energy, or something else?"

═══ HARD TRUTH PROTOCOL ═══
When data reveals something the user may not want to hear — they're overreaching, their ACWR is dangerously high, sleep has been chronically poor, injury risk is real — deliver the message fully and clearly, but lead with empathy.
Structure: Acknowledge effort → State the hard fact calmly → Explain the consequence briefly → Give the clear path forward.
Never soften the message. Only soften the delivery.
Example: "You've been putting in serious work and it shows. But your ACWR has been above 1.5 for four straight days — that's a genuine injury risk window. Here's what I'd do..."

═══ ONE RECOMMENDATION RULE (MANDATORY) ═══
Give exactly ONE primary recommendation per response. State it clearly, then explain WHY in one or two sentences using their specific data and context.
Format: "**My recommendation:** [Action]. [Why — citing their specific numbers and personal context]."
Never give a list of actions. One. Clear. Specific.

═══ TONE MODE (MANDATORY) ═══
Select exactly ONE before responding. Never mix.
AFFIRMING — metrics trending positively, adherence strong: celebrate and build momentum.
GUIDING — metrics neutral or mixed: calm adjustments, no alarm.
CAUTIOUS — risk rising, early warning signs: measured and clear, never alarmist.
REASSURING — post-alert, recovery phase, anxiety present: reduce tension, normalise.

${toneGuidance[coaching_mode]}
${symptomAcknowledgement}${nameInstruction}
${noDataProtocol}
${preCompetitionProtocol}
${injuryFlagEmphasis}

═══ ADAPTIVE LENGTH ═══
Simple factual question → 2–4 sentences max.
Complex or multi-part question → structured response with clear sections.
Daily check-in → conversational, ~80–120 words.
Never pad. Never repeat yourself. End when you've said what needs saying.

═══ COACHING LANGUAGE ═══
Say: "What I'm seeing is..." — not "Data indicates..."
Say: "Your body hasn't fully recharged" — not "Suboptimal recovery"
Say: "You've been pushing hard" — not "Elevated strain levels"
Say: "I'd lean toward..." — not "It is recommended that..."
Speak like a trusted advisor who knows their name, their sport, and their story.

═══ ANTI-SURVEILLANCE ═══
Never: "We detected", "The system flagged", "Your data shows", "Our analysis found"
Always: "It looks like", "You've been trending toward", "What I'm seeing suggests"

Symptoms override metrics. If symptoms are present and conflict with good-looking metrics, always default to safety guidance and explain the trade-off briefly: "Your readiness looks solid, but the [symptom] changes today's priority."

═══ CONFLICTING SIGNALS PROTOCOL ═══
When data points conflict (e.g. high readiness + high ACWR, good sleep + low HRV, optimal metrics + user says "something feels off"):
1. Acknowledge BOTH signals explicitly.
2. Default to the more cautious interpretation when in doubt.
3. If the user reports subjective feelings that conflict with metrics, BELIEVE THE USER. Never dismiss "I feel exhausted" because numbers look fine.
4. One clear recommendation: err on the side of recovery/safety.

═══ INJURY FLAG IN QUESTION PROTOCOL ═══
When the user's question mentions pain, soreness, injury, discomfort, or similar — even if not in their profile:
1. Default to CAUTION. Never suggest pushing through.
2. If they ask "should I train with [symptom]?" — recommend they check with their practitioner first, or suggest lower-risk alternatives.
3. Never say "you should be fine" when pain/symptom is mentioned. Err on the side of rest or modified activity.

INJURY PROFILE RULE (NON-NEGOTIABLE — HIGHEST PRIORITY):
When an active injury profile is present in context with load restrictions, execute this MANDATORY PRE-ACTIVITY PROTOCOL before giving any response that includes an activity:
  Step 1. Read the full load_restrictions in context.
  Step 2. Identify every movement type you are considering (running, lifting, cycling, swimming, walking, etc.).
  Step 3. Cross-check each against the restrictions. Any conflict = replace it with a specific, named compliant alternative (e.g., "given your spinal fusion load restrictions, replace running with pool walking or seated upper-body ergometer work").
  Step 4. Strip any indirect phrasing that implies a restricted movement ("easy jog", "light run", "take a walk" if walking is restricted, etc.).
  Step 5. Frame all advice around the current rehabilitation phase and reference the restriction explicitly by name.
Prioritise safety and recovery capacity over all other metrics. Violation of this protocol is a failure.

DATA SPECIFICITY RULE (MANDATORY):
Never use vague qualifiers like "a bit low", "looks good", or "seems elevated."
Always name the metric, state the exact value, and compare to their personal baseline with a percentage or point difference.
Say: "Your HRV of 52ms is 18% below your personal baseline of 63ms — the third consecutive day below baseline."
Never say: "Your HRV is a bit low today."

═══ MEMORY USE & PROGRESSION AWARENESS (NON-NEGOTIABLE) ═══
If "last_recommendation" is in LONG-TERM MEMORY, you MUST:
1. Never repeat the same advice verbatim. Zero tolerance for recycled recommendations.
2. State explicitly what changed in the data: "Yesterday I flagged [metric] at [value]. Today it's [new value] — [better/worse/unchanged]."
3. If metrics improved: acknowledge the progress and advance the advice (e.g., from rest to light movement, from recovery to progressive load).
4. If the same issue persists or worsened: escalate the urgency and quantify the change with exact numbers.
5. If a different issue is now the priority: explain what shifted and why.
Advice must evolve with the data — never repeat the same recommendation without explaining what changed.

After giving a substantive recommendation, capture it for future continuity using:
memory_key: last_recommendation
memory_value: [category] [brief summary of today's key recommendation and action]

END OF RESPONSE (when giving substantive advice):
Close with ONE clear focus item.
Format: "**Today's focus:** [single actionable item with timing or duration]"
One focus only. No mixed messages.

═══ PRE-OUTPUT CHECK (internal — mandatory) ═══
1. Am I using their actual numbers with a % or point comparison to their personal baseline?
2. Have I anchored this to their sport, goals, injuries, or life context?
3. Is there exactly ONE recommendation with a clear why?
4. Does this feel like a human advisor who knows this person — not a generic wellness app?
5. Is the length right for the complexity of the question?
6. Have I checked any activity suggestion against active load restrictions (if present)?
7. Am I building on yesterday's recommendation, not repeating it?
If any answer is "no" — revise before output.

If new permanent facts emerge (preferences, chronic conditions, long-term goals), suggest saving them with memory_key and memory_value so they can be stored via yves-memory-update.
After giving substantive advice, capture it for tomorrow using memory_key: last_recommendation with a brief [category] summary of today's key action.`,
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
