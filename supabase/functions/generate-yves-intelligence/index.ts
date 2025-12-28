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

    // Check for cached intelligence
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

    // Batch 1: Core wearable & dynamic data
    const [
      wearableSummaryResult,
      wearableSessionsResult,
      trainingTrendsResult,
      recoveryTrendsResult,
      healthAnomaliesResult,
      userBaselinesResult,
      userDeviationsResult,
      symptomCheckInsResult,
    ] = await Promise.all([
      supabase.from("wearable_summary").select("*").eq("user_id", userId).gte("date", sevenDaysAgoStr).order("date", { ascending: false }),
      supabase.from("wearable_sessions").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("training_trends").select("*").eq("user_id", userId).gte("date", sevenDaysAgoStr).order("date", { ascending: false }),
      supabase.from("recovery_trends").select("*").eq("user_id", userId).gte("period_date", sevenDaysAgoStr).order("period_date", { ascending: false }),
      supabase.from("health_anomalies").select("*").eq("user_id", userId).gte("detected_at", sevenDaysAgo.toISOString()).order("detected_at", { ascending: false }).limit(5),
      supabase.from("user_baselines").select("*").eq("user_id", userId),
      supabase.from("user_deviations").select("*").eq("user_id", userId).gte("date", sevenDaysAgoStr).order("date", { ascending: false }),
      supabase.from("symptom_check_ins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    ]);

    // Batch 2: Static/contextual profile data
    const [
      userProfileResult,
      userMedicalResult,
      userInjuriesResult,
      userLifestyleResult,
      userInterestsResult,
      userNutritionResult,
      userTrainingResult,
      userRecoveryResult,
      userMindsetResult,
      userWellnessGoalsResult,
      userHealthProfilesResult,
      userContextResult,
    ] = await Promise.all([
      supabase.from("user_profile").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_medical").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_injuries").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_lifestyle").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_interests").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_nutrition").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_training").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_recovery").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_mindset").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_wellness_goals").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_health_profiles").select("*").eq("user_id", userId).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("user_context_enhanced").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    // Batch 3: Documents & memory
    const [
      userDocumentsResult,
      memoryBankResult,
      recentRecommendationsResult,
    ] = await Promise.all([
      supabase.from("user_documents").select("document_type, file_name, parsed_content, ai_summary, tags").eq("user_id", userId).eq("processing_status", "completed").order("uploaded_at", { ascending: false }).limit(10),
      supabase.from("yves_memory_bank").select("memory_key, memory_value").eq("user_id", userId),
      supabase.from("yves_recommendations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    ]);

    // Extract data
    const wearableSummary = wearableSummaryResult.data || [];
    const wearableSessions = wearableSessionsResult.data || [];
    const trainingTrends = trainingTrendsResult.data || [];
    const recoveryTrends = recoveryTrendsResult.data || [];
    const healthAnomalies = healthAnomaliesResult.data || [];
    const userBaselines = userBaselinesResult.data || [];
    const userDeviations = userDeviationsResult.data || [];
    const symptomCheckIns = symptomCheckInsResult.data || [];
    
    const userProfile = userProfileResult.data;
    const userMedical = userMedicalResult.data;
    const userInjuries = userInjuriesResult.data;
    const userLifestyle = userLifestyleResult.data;
    const userInterests = userInterestsResult.data;
    const userNutrition = userNutritionResult.data;
    const userTraining = userTrainingResult.data;
    const userRecovery = userRecoveryResult.data;
    const userMindset = userMindsetResult.data;
    const userWellnessGoals = userWellnessGoalsResult.data;
    const userHealthProfiles = userHealthProfilesResult.data;
    const userContext = userContextResult.data;
    
    const userDocuments = userDocumentsResult.data || [];
    const memoryBank = memoryBankResult.data || [];
    const recentRecommendations = recentRecommendationsResult.data || [];

    const hasWearableData = wearableSummary.length > 0 || wearableSessions.length > 0 || trainingTrends.length > 0;
    const hasProfileData = userProfile || userMedical || userWellnessGoals;

    // ─── BUILD COMPREHENSIVE CONTEXT ─────────────────────────────────────────
    let promptContext = "";

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 1: USER PROFILE & GOALS (Static/Long-term)
    // ═══════════════════════════════════════════════════════════════════════
    promptContext += "═══ USER PROFILE & GOALS ═══\n\n";

    if (userProfile) {
      if (userProfile.name) promptContext += `Name: ${userProfile.name}\n`;
      if (userProfile.gender) promptContext += `Gender: ${userProfile.gender}\n`;
      if (userProfile.dob) {
        const age = Math.floor((Date.now() - new Date(userProfile.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        promptContext += `Age: ${age} years\n`;
      }
      if (userProfile.activity_level) promptContext += `Activity Level: ${userProfile.activity_level}\n`;
      if (userProfile.goals?.length > 0) promptContext += `Primary Goals: ${userProfile.goals.join(", ")}\n`;
    }

    if (userWellnessGoals) {
      if (userWellnessGoals.goals?.length > 0) promptContext += `Wellness Goals: ${userWellnessGoals.goals.join(", ")}\n`;
      if (userWellnessGoals.priority) promptContext += `Top Priority: ${userWellnessGoals.priority}\n`;
      if (userWellnessGoals.target_date) promptContext += `Target Date: ${userWellnessGoals.target_date}\n`;
    }

    if (userMindset) {
      if (userMindset.motivation_factors?.length > 0) promptContext += `Motivation Factors: ${userMindset.motivation_factors.join(", ")}\n`;
      if (userMindset.mental_health_focus) promptContext += `Mental Health Focus: ${userMindset.mental_health_focus}\n`;
    }

    promptContext += "\n";

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 2: HEALTH CONTEXT (Long-term conditions)
    // ═══════════════════════════════════════════════════════════════════════
    promptContext += "═══ HEALTH CONTEXT ═══\n\n";

    if (userMedical) {
      if (userMedical.conditions?.length > 0) promptContext += `Health Conditions: ${userMedical.conditions.join(", ")}\n`;
      if (userMedical.medications?.length > 0) promptContext += `Current Medications: ${userMedical.medications.join(", ")}\n`;
      if (userMedical.medical_notes) promptContext += `Medical Notes: ${userMedical.medical_notes}\n`;
    }

    if (userInjuries) {
      if (userInjuries.injuries?.length > 0) promptContext += `Current Injuries: ${userInjuries.injuries.join(", ")}\n`;
      if (userInjuries.injury_details) {
        const details = typeof userInjuries.injury_details === 'object' ? JSON.stringify(userInjuries.injury_details) : userInjuries.injury_details;
        promptContext += `Injury Details: ${details}\n`;
      }
    }

    if (userProfile?.injuries?.length > 0) {
      promptContext += `Injuries (from profile): ${userProfile.injuries.join(", ")}\n`;
    }

    if (userProfile?.conditions?.length > 0) {
      promptContext += `Conditions (from profile): ${userProfile.conditions.join(", ")}\n`;
    }

    promptContext += "\n";

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 3: LIFESTYLE & PREFERENCES
    // ═══════════════════════════════════════════════════════════════════════
    promptContext += "═══ LIFESTYLE & PREFERENCES ═══\n\n";

    if (userLifestyle) {
      if (userLifestyle.work_schedule) promptContext += `Work Schedule: ${userLifestyle.work_schedule}\n`;
      if (userLifestyle.stress_level) promptContext += `Stress Level: ${userLifestyle.stress_level}\n`;
      if (userLifestyle.daily_routine) promptContext += `Daily Routine: ${userLifestyle.daily_routine}\n`;
    }

    if (userNutrition) {
      if (userNutrition.diet_type) promptContext += `Diet Type: ${userNutrition.diet_type}\n`;
      if (userNutrition.allergies?.length > 0) promptContext += `Food Allergies: ${userNutrition.allergies.join(", ")}\n`;
      if (userNutrition.eating_pattern) promptContext += `Eating Pattern: ${userNutrition.eating_pattern}\n`;
    }

    if (userInterests) {
      if (userInterests.hobbies?.length > 0) promptContext += `Hobbies: ${userInterests.hobbies.join(", ")}\n`;
      if (userInterests.interests?.length > 0) promptContext += `Interests: ${userInterests.interests.join(", ")}\n`;
    }

    if (userTraining) {
      if (userTraining.preferred_activities?.length > 0) promptContext += `Preferred Activities: ${userTraining.preferred_activities.join(", ")}\n`;
      if (userTraining.training_frequency) promptContext += `Training Frequency: ${userTraining.training_frequency}\n`;
      if (userTraining.intensity_preference) promptContext += `Intensity Preference: ${userTraining.intensity_preference}\n`;
    }

    if (userRecovery) {
      if (userRecovery.recovery_methods?.length > 0) promptContext += `Recovery Methods: ${userRecovery.recovery_methods.join(", ")}\n`;
      if (userRecovery.sleep_hours) promptContext += `Target Sleep Hours: ${userRecovery.sleep_hours}\n`;
      if (userRecovery.sleep_quality) promptContext += `Typical Sleep Quality: ${userRecovery.sleep_quality}\n`;
    }

    if (userMindset?.stress_management) {
      promptContext += `Stress Management: ${userMindset.stress_management}\n`;
    }

    promptContext += "\n";

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 4: CURRENT HEALTH STATE (Dynamic/Daily)
    // ═══════════════════════════════════════════════════════════════════════
    promptContext += "═══ CURRENT HEALTH STATE ═══\n\n";

    if (wearableSessions.length > 0) {
      const latestSession = wearableSessions[0];
      const previousSession = wearableSessions[1];

      promptContext += `Today (${latestSession.date}):\n`;
      
      if (latestSession.readiness_score !== null) {
        const readinessChange = previousSession?.readiness_score 
          ? latestSession.readiness_score - previousSession.readiness_score 
          : 0;
        promptContext += `• Readiness Score: ${latestSession.readiness_score}/100 (${readinessChange >= 0 ? '+' : ''}${readinessChange} vs yesterday)\n`;
      }
      
      if (latestSession.sleep_score !== null) {
        const sleepChange = previousSession?.sleep_score 
          ? latestSession.sleep_score - previousSession.sleep_score 
          : 0;
        promptContext += `• Sleep Score: ${latestSession.sleep_score}/100 (${sleepChange >= 0 ? '+' : ''}${sleepChange} vs yesterday)\n`;
      }
      
      if (latestSession.activity_score !== null) {
        promptContext += `• Activity Score: ${latestSession.activity_score}/100\n`;
      }
      
      if (latestSession.hrv_avg !== null) {
        promptContext += `• HRV: ${latestSession.hrv_avg}ms\n`;
      }
      
      if (latestSession.resting_hr !== null) {
        promptContext += `• Resting HR: ${latestSession.resting_hr}bpm\n`;
      }
      
      if (latestSession.total_steps) {
        promptContext += `• Steps: ${latestSession.total_steps.toLocaleString()}\n`;
      }
      
      if (latestSession.active_calories) {
        promptContext += `• Active Calories: ${latestSession.active_calories}\n`;
      }
      
      promptContext += "\n";
    }

    // Personal baselines comparison
    if (userBaselines.length > 0) {
      promptContext += "Personal Baselines:\n";
      userBaselines.forEach(b => {
        promptContext += `• ${b.metric}: ${b.rolling_avg.toFixed(1)} (${b.data_window}-day avg)\n`;
      });
      promptContext += "\n";
    }

    // Current deviations from baseline
    if (userDeviations.length > 0) {
      const recentDeviations = userDeviations.slice(0, 5);
      const significantDeviations = recentDeviations.filter(d => Math.abs(d.deviation || 0) > 10);
      
      if (significantDeviations.length > 0) {
        promptContext += "Significant Deviations from Baseline:\n";
        significantDeviations.forEach(d => {
          const direction = (d.deviation || 0) > 0 ? "above" : "below";
          const riskLabel = d.risk_zone ? ` [${d.risk_zone.toUpperCase()}]` : "";
          promptContext += `• ${d.metric}: ${Math.abs(d.deviation || 0).toFixed(0)}% ${direction} baseline${riskLabel}\n`;
        });
        promptContext += "\n";
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 5: TRAINING TRENDS (7-day)
    // ═══════════════════════════════════════════════════════════════════════
    promptContext += "═══ 7-DAY TRAINING TRENDS ═══\n\n";

    if (trainingTrends.length > 0) {
      const latestTrend = trainingTrends[0];
      
      if (latestTrend.acwr !== null) {
        promptContext += `ACWR (Acute:Chronic Workload): ${latestTrend.acwr.toFixed(2)}`;
        if (latestTrend.acwr > 1.5) {
          promptContext += " ⚠️ HIGH RISK - Overtraining zone\n";
        } else if (latestTrend.acwr > 1.3) {
          promptContext += " ⚠️ ELEVATED - Monitor closely\n";
        } else if (latestTrend.acwr < 0.8) {
          promptContext += " ⚠️ LOW - Can increase load safely\n";
        } else {
          promptContext += " ✓ OPTIMAL ZONE\n";
        }
      }

      if (latestTrend.strain !== null) promptContext += `Training Strain: ${latestTrend.strain.toFixed(1)}\n`;
      if (latestTrend.monotony !== null) {
        promptContext += `Training Monotony: ${latestTrend.monotony.toFixed(2)}`;
        if (latestTrend.monotony > 2.0) {
          promptContext += " ⚠️ HIGH - Increase variety\n";
        } else {
          promptContext += " ✓ Healthy variety\n";
        }
      }
      if (latestTrend.acute_load !== null) promptContext += `Acute Load (7-day): ${latestTrend.acute_load.toFixed(0)}\n`;
      if (latestTrend.chronic_load !== null) promptContext += `Chronic Load (28-day): ${latestTrend.chronic_load.toFixed(0)}\n`;
      if (latestTrend.hrv !== null) promptContext += `Avg HRV: ${latestTrend.hrv.toFixed(0)}ms\n`;
      if (latestTrend.sleep_score !== null) promptContext += `Avg Sleep Score: ${latestTrend.sleep_score.toFixed(0)}\n`;
    } else if (wearableSummary.length > 0) {
      const avgStrain = wearableSummary.reduce((sum, s) => sum + (s.strain || 0), 0) / wearableSummary.length;
      const avgAcwr = wearableSummary.reduce((sum, s) => sum + (s.acwr || 0), 0) / wearableSummary.length;
      
      promptContext += `Avg Strain: ${avgStrain.toFixed(1)}\n`;
      promptContext += `ACWR: ${avgAcwr.toFixed(2)}`;
      if (avgAcwr > 1.5) {
        promptContext += " ⚠️ HIGH RISK\n";
      } else if (avgAcwr < 0.8) {
        promptContext += " ⚠️ LOW\n";
      } else {
        promptContext += " ✓ OPTIMAL\n";
      }
    }

    promptContext += "\n";

    // Recovery trends
    if (recoveryTrends.length > 0) {
      const latestRecovery = recoveryTrends[0];
      promptContext += "Recovery Trends:\n";
      if (latestRecovery.recovery_score !== null) promptContext += `• Recovery Score: ${latestRecovery.recovery_score.toFixed(0)}\n`;
      if (latestRecovery.acwr_trend) promptContext += `• ACWR Trend: ${latestRecovery.acwr_trend}\n`;
      promptContext += "\n";
    }

    // Multi-day averages from sessions
    if (wearableSessions.length >= 3) {
      const validReadiness = wearableSessions.filter(s => s.readiness_score !== null);
      const validSleep = wearableSessions.filter(s => s.sleep_score !== null);
      
      if (validReadiness.length > 0 || validSleep.length > 0) {
        promptContext += "3-Day Averages:\n";
        if (validReadiness.length > 0) {
          const avgReadiness = validReadiness.reduce((sum, s) => sum + (s.readiness_score || 0), 0) / validReadiness.length;
          promptContext += `• Avg Readiness: ${avgReadiness.toFixed(0)}\n`;
        }
        if (validSleep.length > 0) {
          const avgSleep = validSleep.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / validSleep.length;
          promptContext += `• Avg Sleep Score: ${avgSleep.toFixed(0)}\n`;
        }
        promptContext += "\n";
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 6: HEALTH ALERTS & ANOMALIES
    // ═══════════════════════════════════════════════════════════════════════
    if (healthAnomalies.length > 0 || symptomCheckIns.length > 0) {
      promptContext += "═══ HEALTH ALERTS & SYMPTOMS ═══\n\n";

      if (healthAnomalies.length > 0) {
        promptContext += "Detected Anomalies (last 7 days):\n";
        healthAnomalies.forEach(a => {
          promptContext += `• ${a.metric_name}: ${a.anomaly_type} (${a.severity} severity)`;
          if (a.deviation_percent) promptContext += ` - ${a.deviation_percent.toFixed(0)}% deviation`;
          promptContext += "\n";
        });
        promptContext += "\n";
      }

      if (symptomCheckIns.length > 0) {
        promptContext += "Recent Symptom Check-ins:\n";
        symptomCheckIns.slice(0, 3).forEach(s => {
          promptContext += `• ${s.symptom_type} (${s.severity})`;
          if (s.description) promptContext += `: ${s.description}`;
          promptContext += "\n";
        });
        promptContext += "\n";
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 7: DOCUMENTS & AI HEALTH PROFILE
    // ═══════════════════════════════════════════════════════════════════════
    if (userDocuments.length > 0 || userHealthProfiles) {
      promptContext += "═══ DOCUMENTS & HEALTH PROFILE ═══\n\n";

      if (userHealthProfiles?.ai_synthesis) {
        promptContext += `AI Health Profile Summary:\n${userHealthProfiles.ai_synthesis.slice(0, 500)}\n\n`;
      }

      if (userDocuments.length > 0) {
        promptContext += "Uploaded Health Documents:\n";
        for (const doc of userDocuments) {
          promptContext += `• ${doc.document_type}: `;
          if (doc.ai_summary) {
            promptContext += `${doc.ai_summary.slice(0, 150)}...\n`;
          } else if (doc.tags?.length > 0) {
            promptContext += `Tags: ${doc.tags.join(", ")}\n`;
          } else {
            promptContext += `${doc.file_name}\n`;
          }
        }
        promptContext += "\n";
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 8: YVES MEMORY & CONTINUITY
    // ═══════════════════════════════════════════════════════════════════════
    if (memoryBank.length > 0 || recentRecommendations.length > 0) {
      promptContext += "═══ YVES MEMORY ═══\n\n";

      if (memoryBank.length > 0) {
        promptContext += "Remembered Context:\n";
        memoryBank.slice(0, 5).forEach(m => {
          const valueStr = typeof m.memory_value === 'string' 
            ? m.memory_value 
            : JSON.stringify(m.memory_value).slice(0, 80);
          promptContext += `• ${m.memory_key}: ${valueStr}\n`;
        });
        promptContext += "\n";
      }

      if (recentRecommendations.length > 0) {
        promptContext += "Previous Recommendations (for continuity):\n";
        recentRecommendations.slice(0, 3).forEach(r => {
          promptContext += `• ${r.category}: ${r.recommendation_text.slice(0, 80)}...\n`;
        });
        promptContext += "\n";
      }
    }

    // ─── AI CALL WITH STRUCTURED OUTPUT ────────────────────────────────────
    const systemPrompt = `You are Yves, a deeply personalized AI health intelligence coach. You know this user intimately - their goals, history, preferences, and patterns over time.

═══ CORE PHILOSOPHY ═══
You are NOT a generic health advisor. Every insight must demonstrate that you KNOW this specific user. Reference their:
- Stated goals and priorities by name
- Hobbies and interests (to make recommendations engaging)
- Health conditions and injuries (to ensure safety)
- Past patterns and trends (not just today's data)
- Uploaded documents (nutrition plans, medical records, etc.)

═══ OUTPUT FORMAT ═══
Generate a JSON object with this exact structure:
{
  "dailyBriefing": {
    "summary": "2-3 sentences that interpret their current state IN CONTEXT of their goals and recent trajectory",
    "keyChanges": ["Specific change referencing multi-day patterns", "Another pattern-based observation"],
    "riskHighlights": ["Risk framed around their specific conditions/goals if any"]
  },
  "recommendations": [
    {
      "text": "Specific action tied to THEIR preferences and activities",
      "category": "training|recovery|nutrition|medical|sleep|activity",
      "priority": "high|medium|low",
      "reasoning": "Why this matters for THEIR specific goals"
    }
  ]
}

═══ PERSONALIZATION RULES (MANDATORY) ═══
1. REFERENCE THEIR GOALS: If they want to "improve sleep quality", say "Given your focus on sleep improvement..." not generic sleep tips
2. USE THEIR INTERESTS: If they enjoy yoga, recommend yoga-based recovery. If they like hiking, suggest outdoor activities
3. RESPECT THEIR BODY: Never recommend exercises that conflict with listed injuries or conditions
4. CITE PATTERNS: "Your HRV has dropped 15% over 3 days" not just "Your HRV is 42ms today"
5. CONNECT TO DOCUMENTS: If they uploaded a nutrition plan, reference it. If they have medical records, consider them
6. MATCH THEIR STYLE: Use their intensity preference and training frequency when suggesting workouts
7. CONSIDER THEIR LIFE: Factor in work schedule and stress level for timing and intensity

═══ LONGITUDINAL INTELLIGENCE ═══
- Compare today vs 3-day averages vs 7-day trends
- Identify emerging patterns before they become problems
- Reference previous recommendations and whether metrics improved
- Notice correlations (e.g., "Your sleep scores dip after high-strain days")

═══ AVOID GENERIC ADVICE ═══
❌ "Try to get 7-8 hours of sleep" (generic)
✓ "Your 6.2hr average this week is below your 7.5hr target - prioritize your wind-down routine tonight" (personal)

❌ "Consider doing some cardio" (generic)  
✓ "A 30-min cycling session fits your training style and would help offset yesterday's rest day" (personal)

═══ METRIC-BASED TRIGGERS ═══
- Readiness < 70: Prioritize recovery, reduce intensity
- ACWR > 1.3: Warn about overtraining risk, suggest deload
- ACWR < 0.8: Encourage safe load increase toward goals
- Monotony > 2.0: Suggest variety using their preferred activities
- Sleep score < 70: Address sleep as priority
- Deviation > 15% from baseline: Flag and explain significance

═══ FINAL CHECK ═══
Before outputting, verify:
□ Does this feel like it's written FOR THIS PERSON?
□ Did I reference at least one of their specific goals?
□ Did I cite a multi-day pattern, not just today?
□ Would this advice be different for someone else with different goals?

Include 2-4 recommendations ordered by priority. Be encouraging but honest.

RESPOND WITH ONLY THE JSON OBJECT, NO OTHER TEXT.`;

    let userPrompt: string;
    if (hasWearableData) {
      userPrompt = `Analyze this user's comprehensive health data and generate a coordinated briefing + recommendations:\n\n${promptContext}`;
    } else if (hasProfileData) {
      userPrompt = `Generate a personalized intelligence report for this user who has profile data but limited wearable data:\n\n${promptContext}\n\nEncourage them to sync their Oura Ring for richer insights while providing value from their profile.`;
    } else {
      userPrompt = `Generate a brief welcome message as JSON, encouraging the user to:\n1. Set up their profile with goals and preferences\n2. Connect their Oura Ring for health tracking\n\nMake it warm and explain the value of personalized health intelligence.`;
    }

    console.log(`[generate-yves-intelligence] Calling AI for user ${userId} with ${promptContext.length} chars of context`);

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
        max_tokens: 1000,
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
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      intelligenceData = JSON.parse(content);
    } catch (parseError) {
      console.error(`[generate-yves-intelligence] JSON parse error:`, parseError, content);
      
      // Fallback structure
      intelligenceData = {
        dailyBriefing: {
          summary: hasProfileData 
            ? "Welcome! I can see your profile. Connect your Oura Ring to unlock personalized daily health insights based on your goals."
            : "Welcome to Yves! Set up your profile and connect your Oura Ring to receive personalized health intelligence.",
          keyChanges: [],
          riskHighlights: [],
        },
        recommendations: [{
          text: hasProfileData 
            ? "Sync your Oura Ring to see how your daily metrics align with your health goals"
            : "Complete your profile to help me understand your health goals and preferences",
          category: "recovery",
          priority: "high",
          reasoning: "Personalized data enables accurate, goal-aligned recommendations"
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
