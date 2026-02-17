import { createClient } from "npm:@supabase/supabase-js@2";
import { getFocusModePromptContext, filterRecommendationsByFocus } from "../_shared/focus-mode-prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FocusMode = 'recovery' | 'performance' | 'pain_management' | 'balance' | 'custom';

interface YvesIntelligenceRequest {
  user_id?: string;
  focus_mode?: FocusMode;
  force_refresh?: boolean;
  refresh_nonce?: string;
}

interface YvesIntelligenceOutput {
  dailyBriefing: {
    summary: string;
    keyChanges: string[];
    riskHighlights: string[];
    todaysFocus?: string;
  };
  recommendations: Array<{
    text: string;
    category: 'training' | 'recovery' | 'nutrition' | 'sleep' | 'mindset' | 'performance';
    priority: 'high' | 'medium' | 'low';
    reasoning: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYERED REASONING ENGINE - 4 LAYERS THAT MUST PASS BEFORE SPEAKING
// ═══════════════════════════════════════════════════════════════════════════════

interface LayerResult {
  pass: boolean;
  confidence: number;
  reason: string;
  findings: Record<string, unknown>;
}

interface ReasoningContext {
  layer1_physiological: LayerResult;
  layer2_risk_trajectory: LayerResult;
  layer3_behavior_psychology: LayerResult;
  layer4_interests_adherence: LayerResult;
  overall_confidence: number;
  should_speak: boolean;
  silence_reason?: string;
  justification: {
    why_this_issue: string | null;
    why_now: string | null;
    why_this_intervention: string | null;
    why_this_user: string | null;
    all_justified: boolean;
  };
}

// Layer 1: Physiological State Analysis
function evaluatePhysiologicalState(
  wearableSessions: any[],
  trainingTrends: any[],
  recoveryTrends: any[],
  userBaselines: any[],
  userDeviations: any[]
): LayerResult {
  const findings: Record<string, unknown> = {};
  let confidence = 0;
  let pass = false;
  let reason = "";

  // Need at least 3 days of data for trend analysis
  if (wearableSessions.length < 3) {
    return {
      pass: false,
      confidence: 0,
      reason: "Insufficient data for trend analysis (need 3+ days)",
      findings: { data_days: wearableSessions.length }
    };
  }

  const latest = wearableSessions[0];
  const previous = wearableSessions[1];
  const weekAgo = wearableSessions[wearableSessions.length - 1];

  // Trend direction analysis
  const readinessTrend = latest?.readiness_score && previous?.readiness_score
    ? latest.readiness_score - previous.readiness_score
    : null;
  const sleepTrend = latest?.sleep_score && previous?.sleep_score
    ? latest.sleep_score - previous.sleep_score
    : null;
  const hrvTrend = latest?.hrv_avg && previous?.hrv_avg
    ? latest.hrv_avg - previous.hrv_avg
    : null;

  findings.trend_direction = {
    readiness: readinessTrend !== null ? (readinessTrend > 0 ? 'improving' : readinessTrend < 0 ? 'declining' : 'stable') : 'unknown',
    sleep: sleepTrend !== null ? (sleepTrend > 0 ? 'improving' : sleepTrend < 0 ? 'declining' : 'stable') : 'unknown',
    hrv: hrvTrend !== null ? (hrvTrend > 0 ? 'improving' : hrvTrend < 0 ? 'declining' : 'stable') : 'unknown',
  };

  // Variability analysis (standard deviation over window)
  const validReadiness = wearableSessions.filter(s => s.readiness_score !== null);
  if (validReadiness.length >= 3) {
    const avgReadiness = validReadiness.reduce((sum, s) => sum + s.readiness_score, 0) / validReadiness.length;
    const variance = validReadiness.reduce((sum, s) => sum + Math.pow(s.readiness_score - avgReadiness, 2), 0) / validReadiness.length;
    findings.variability_analysis = {
      readiness_avg: avgReadiness.toFixed(1),
      readiness_std: Math.sqrt(variance).toFixed(1),
      is_stable: Math.sqrt(variance) < 10
    };
    confidence += 20;
  }

  // Recovery vs Load balance
  const latestTrend = trainingTrends[0];
  if (latestTrend?.acwr !== null) {
    const acwr = latestTrend.acwr;
    findings.recovery_vs_load = {
      acwr: acwr,
      zone: acwr < 0.8 ? 'underloading' : acwr > 1.5 ? 'overloading' : acwr > 1.3 ? 'elevated' : 'optimal',
      balance: acwr >= 0.8 && acwr <= 1.3 ? 'balanced' : 'imbalanced'
    };
    confidence += 25;
  }

  // Trajectory change detection (significant shifts from baseline)
  const significantDeviations = userDeviations.filter(d => Math.abs(d.deviation || 0) > 15);
  findings.trajectory_changes = {
    count: significantDeviations.length,
    metrics: significantDeviations.map(d => d.metric),
    highest_deviation: significantDeviations.length > 0 
      ? Math.max(...significantDeviations.map(d => Math.abs(d.deviation || 0)))
      : 0
  };
  
  if (significantDeviations.length > 0) {
    confidence += 15;
  }

  // Baseline comparison
  if (userBaselines.length >= 3) {
    findings.baseline_established = true;
    confidence += 20;
  } else {
    findings.baseline_established = false;
  }

  // Pass if we have enough data to analyze (lowered threshold for more insights)
  pass = confidence >= 20;
  reason = pass
    ? `Physiological state analyzable (confidence: ${confidence}%)`
    : `Insufficient physiological data for analysis`;

  return { pass, confidence: Math.min(confidence, 100), reason, findings };
}

// Layer 2: Risk Trajectory Evaluation
function evaluateRiskTrajectory(
  layer1: LayerResult,
  riskTrajectories: any[],
  healthAnomalies: any[],
  userDeviations: any[],
  symptomCheckIns: any[]
): LayerResult {
  const findings: Record<string, unknown> = {};
  let confidence = 0;
  let reason = "";

  // If Layer 1 failed, this layer cannot proceed meaningfully
  if (!layer1.pass) {
    return {
      pass: false,
      confidence: 0,
      reason: "Cannot evaluate risk trajectory without physiological state",
      findings: { blocked_by: "layer1_failed" }
    };
  }

  // NOISE FILTER: Distinguish normal fluctuations from meaningful signals
  const significantDeviations = userDeviations.filter(d => Math.abs(d.deviation || 0) > 10);
  const criticalDeviations = userDeviations.filter(d => d.risk_zone === 'high-risk' || d.risk_zone === 'moderate-risk');
  const recentSymptoms = symptomCheckIns.filter(s => {
    const symptomDate = new Date(s.created_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return symptomDate >= threeDaysAgo;
  });

  // Noise detection: Single day spikes without pattern are noise
  const singleDaySpike = significantDeviations.length === 1 && 
    !criticalDeviations.length && 
    !recentSymptoms.length;
  
  findings.noise_filter = {
    significant_deviations: significantDeviations.length,
    critical_deviations: criticalDeviations.length,
    recent_symptoms: recentSymptoms.length,
    is_noise: singleDaySpike,
    noise_reason: singleDaySpike ? "Single day deviation without supporting signals" : null
  };

  if (singleDaySpike) {
    confidence = 20;
  } else {
    confidence += 30;
  }

  // EARLY WARNING DETECTION: Patterns that precede problems
  const earlyWarnings: string[] = [];
  
  // Consecutive declining days
  const physiologicalTrends = layer1.findings.trend_direction as Record<string, string> | undefined;
  if (physiologicalTrends) {
    const decliningMetrics = Object.entries(physiologicalTrends)
      .filter(([_, trend]) => trend === 'declining')
      .map(([metric, _]) => metric);
    
    if (decliningMetrics.length >= 2) {
      earlyWarnings.push(`Multiple metrics declining: ${decliningMetrics.join(', ')}`);
    }
  }

  // High-risk zone entries
  if (criticalDeviations.length > 0) {
    earlyWarnings.push(`Metrics in risk zone: ${criticalDeviations.map(d => d.metric).join(', ')}`);
    confidence += 20;
  }

  // Recent symptoms correlating with metric changes
  if (recentSymptoms.length > 0 && significantDeviations.length > 0) {
    earlyWarnings.push("Symptoms correlating with metric deviations");
    confidence += 15;
  }

  findings.early_warning_detection = {
    warnings: earlyWarnings,
    count: earlyWarnings.length,
    severity: earlyWarnings.length >= 2 ? 'elevated' : earlyWarnings.length === 1 ? 'mild' : 'none'
  };

  // RISK ACCUMULATION MODEL: Track compounding risk
  const riskFactors: number[] = [];
  
  if (criticalDeviations.length > 0) riskFactors.push(30);
  if (recentSymptoms.length > 0) riskFactors.push(20);
  if (healthAnomalies.filter(a => a.severity === 'high').length > 0) riskFactors.push(25);
  if (earlyWarnings.length >= 2) riskFactors.push(15);
  
  const accumulatedRisk = riskFactors.reduce((a, b) => a + b, 0);
  findings.risk_accumulation = {
    factors: riskFactors.length,
    accumulated_score: accumulatedRisk,
    level: accumulatedRisk >= 50 ? 'high' : accumulatedRisk >= 25 ? 'moderate' : 'low',
    meaningful: accumulatedRisk >= 25 // Only meaningful if risk is at least moderate
  };

  // Pass if we can distinguish signal from noise AND risk is meaningful OR no risk
  const isNoise = findings.noise_filter && (findings.noise_filter as any).is_noise;
  const riskIsMeaningful = (findings.risk_accumulation as any).meaningful;
  
  // SILENCE IS VALID: If it's just noise, we should not speak
  if (isNoise && !riskIsMeaningful) {
    return {
      pass: false,
      confidence: confidence,
      reason: "Signal is noise without meaningful risk - SILENCE IS APPROPRIATE",
      findings
    };
  }

  reason = `Risk trajectory evaluated: ${(findings.risk_accumulation as any).level} risk`;
  
  return { 
    pass: true, 
    confidence: Math.min(confidence, 100), 
    reason, 
    findings 
  };
}

// Layer 3: Behavior & Psychology Evaluation
function evaluateBehaviorPsychology(
  layer2: LayerResult,
  adaptationProfile: any,
  engagementHistory: any[],
  recentRecommendations: any[]
): LayerResult {
  const findings: Record<string, unknown> = {};
  let confidence = 50; // Start at 50% - we can still advise without full history
  let reason = "";

  // If Layer 2 indicated silence is appropriate, propagate that
  if (!layer2.pass && layer2.reason.includes("SILENCE")) {
    return {
      pass: false,
      confidence: 0,
      reason: layer2.reason,
      findings: { blocked_by: "layer2_silence" }
    };
  }

  // COMPLIANCE HISTORY
  const followedCount = recentRecommendations.filter(r => r.feedback_score >= 4).length;
  const totalRecommendations = recentRecommendations.length;
  const complianceRate = totalRecommendations > 0 
    ? Math.round((followedCount / totalRecommendations) * 100) 
    : 50; // Default to 50% if no history

  findings.compliance_history = {
    followed: followedCount,
    total: totalRecommendations,
    rate: complianceRate,
    trend: complianceRate > 60 ? 'good' : complianceRate > 40 ? 'moderate' : 'low'
  };

  // PROMPT RESPONSE PATTERNS
  const acknowledgedRecs = recentRecommendations.filter(r => r.acknowledged_at);
  const avgResponseHours = adaptationProfile?.avg_response_time_hours || null;
  
  findings.response_patterns = {
    acknowledged_count: acknowledgedRecs.length,
    avg_response_hours: avgResponseHours,
    responsiveness: avgResponseHours !== null 
      ? (avgResponseHours < 6 ? 'high' : avgResponseHours < 24 ? 'moderate' : 'low')
      : 'unknown'
  };

  // FATIGUE AND OVERRIDE TENDENCIES
  const recentDismissals = recentRecommendations.filter(r => r.feedback_score <= 2).length;
  const dismissalRate = totalRecommendations > 0 
    ? Math.round((recentDismissals / totalRecommendations) * 100)
    : 0;

  findings.fatigue_override = {
    dismissal_rate: dismissalRate,
    showing_fatigue: dismissalRate > 40,
    recommendation: dismissalRate > 40 ? 'reduce_frequency' : 'maintain_frequency'
  };

  // Adjust confidence based on user's receptiveness
  if (complianceRate > 60) {
    confidence += 20;
  } else if (complianceRate < 40 && totalRecommendations >= 3) {
    confidence -= 10; // Reduce confidence if user rarely follows advice
  }

  // If user is showing fatigue, we should be more selective
  if ((findings.fatigue_override as any).showing_fatigue) {
    confidence -= 15;
    reason = "User showing recommendation fatigue - be more selective";
  } else {
    reason = `Behavior patterns analyzed: ${complianceRate}% compliance rate`;
  }

  return { 
    pass: true, // This layer advises but doesn't block
    confidence: Math.max(confidence, 30), 
    reason, 
    findings 
  };
}

// Layer 4: Interests & Adherence Probability
function evaluateInterestsAdherence(
  layer3: LayerResult,
  userProfile: any,
  userInterests: any,
  userTraining: any,
  adaptationProfile: any
): LayerResult {
  const findings: Record<string, unknown> = {};
  let confidence = 50;
  let reason = "";

  // Propagate silence from earlier layers
  if (!layer3.pass && (layer3.findings as any).blocked_by) {
    return {
      pass: false,
      confidence: 0,
      reason: layer3.reason,
      findings: { blocked_by: (layer3.findings as any).blocked_by }
    };
  }

  // EXPLICIT INTERESTS
  const explicitInterests: string[] = [];
  if (userInterests?.interests?.length > 0) {
    explicitInterests.push(...userInterests.interests);
  }
  if (userInterests?.hobbies?.length > 0) {
    explicitInterests.push(...userInterests.hobbies);
  }
  if (userTraining?.preferred_activities?.length > 0) {
    explicitInterests.push(...userTraining.preferred_activities);
  }

  findings.explicit_interests = {
    count: explicitInterests.length,
    items: explicitInterests.slice(0, 10),
    has_interests: explicitInterests.length > 0
  };

  if (explicitInterests.length > 0) {
    confidence += 15;
  }

  // IMPLICIT PREFERENCES (from adaptation profile)
  const preferredCategories = adaptationProfile?.preferred_categories || {};
  const effectiveTone = adaptationProfile?.effective_tone || 'balanced';
  const followThroughRate = adaptationProfile?.follow_through_rate || 50;

  findings.implicit_preferences = {
    preferred_categories: preferredCategories,
    effective_tone: effectiveTone,
    follow_through_rate: followThroughRate
  };

  // ADHERENCE PROBABILITY RANKING
  // Categories with higher historical follow-through should be prioritized
  const categoryRankings: Record<string, number> = {};
  for (const [category, rate] of Object.entries(preferredCategories)) {
    categoryRankings[category] = rate as number;
  }

  // Sort categories by adherence probability
  const rankedCategories = Object.entries(categoryRankings)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, rate]) => ({ category: cat, adherence_probability: rate }));

  findings.adherence_ranking = {
    categories: rankedCategories,
    suppress_low_adherence: rankedCategories.filter(c => c.adherence_probability < 30).map(c => c.category),
    prioritize_high_adherence: rankedCategories.filter(c => c.adherence_probability > 60).map(c => c.category)
  };

  // User goals alignment
  const userGoals = userProfile?.goals || [];
  findings.goals_alignment = {
    goals: userGoals,
    has_goals: userGoals.length > 0
  };

  if (userGoals.length > 0) {
    confidence += 10;
  }

  reason = `Interests & adherence evaluated: ${rankedCategories.length} categories ranked`;

  return { 
    pass: true, 
    confidence: Math.min(confidence, 100), 
    reason, 
    findings 
  };
}

// Build Justification Chain
function buildJustification(
  layer1: LayerResult,
  layer2: LayerResult,
  layer3: LayerResult,
  layer4: LayerResult,
  userProfile: any
): ReasoningContext['justification'] {
  let why_this_issue: string | null = null;
  let why_now: string | null = null;
  let why_this_intervention: string | null = null;
  let why_this_user: string | null = null;

  // WHY THIS ISSUE: From Layer 1 & 2 findings
  const riskLevel = (layer2.findings.risk_accumulation as any)?.level;
  const earlyWarnings = (layer2.findings.early_warning_detection as any)?.warnings || [];
  if (riskLevel === 'high' || riskLevel === 'moderate') {
    why_this_issue = `Risk level is ${riskLevel} with ${earlyWarnings.length} early warning(s)`;
  } else if (layer1.pass) {
    why_this_issue = "Physiological state requires attention based on trend analysis";
  }

  // WHY NOW: From Layer 1 trajectory changes
  const trajectoryChanges = (layer1.findings.trajectory_changes as any);
  if (trajectoryChanges?.count > 0) {
    why_now = `${trajectoryChanges.count} significant trajectory change(s) detected today`;
  } else if (earlyWarnings.length > 0) {
    why_now = "Early warning signals detected that warrant timely intervention";
  }

  // WHY THIS INTERVENTION: From Layer 3 & 4
  const complianceHistory = (layer3.findings.compliance_history as any);
  const adherenceRanking = (layer4.findings.adherence_ranking as any);
  if (complianceHistory?.rate > 60) {
    why_this_intervention = "User has high compliance history - direct intervention appropriate";
  } else if (adherenceRanking?.prioritize_high_adherence?.length > 0) {
    why_this_intervention = `Intervention in user's high-adherence categories: ${adherenceRanking.prioritize_high_adherence.join(', ')}`;
  }

  // WHY THIS USER: From Layer 4 user profile
  const goals = userProfile?.goals || [];
  const interests = (layer4.findings.explicit_interests as any)?.items || [];
  if (goals.length > 0) {
    why_this_user = `Aligned with user's goals: ${goals.slice(0, 2).join(', ')}`;
  } else if (interests.length > 0) {
    why_this_user = `Tailored to user's interests: ${interests.slice(0, 2).join(', ')}`;
  }

  // All 4 must be answerable for full justification
  const all_justified = !!(why_this_issue && why_now && why_this_intervention && why_this_user);

  return {
    why_this_issue,
    why_now,
    why_this_intervention,
    why_this_user,
    all_justified
  };
}

// Main Reasoning Orchestrator
function executeLayeredReasoning(
  wearableSessions: any[],
  trainingTrends: any[],
  recoveryTrends: any[],
  userBaselines: any[],
  userDeviations: any[],
  riskTrajectories: any[],
  healthAnomalies: any[],
  symptomCheckIns: any[],
  adaptationProfile: any,
  recentRecommendations: any[],
  userProfile: any,
  userInterests: any,
  userTraining: any
): ReasoningContext {
  // Execute layers in sequence - each depends on previous
  const layer1 = evaluatePhysiologicalState(
    wearableSessions, trainingTrends, recoveryTrends, userBaselines, userDeviations
  );

  const layer2 = evaluateRiskTrajectory(
    layer1, riskTrajectories, healthAnomalies, userDeviations, symptomCheckIns
  );

  const layer3 = evaluateBehaviorPsychology(
    layer2, adaptationProfile, [], recentRecommendations
  );

  const layer4 = evaluateInterestsAdherence(
    layer3, userProfile, userInterests, userTraining, adaptationProfile
  );

  // Calculate overall confidence (weighted average)
  const weights = { layer1: 0.35, layer2: 0.30, layer3: 0.20, layer4: 0.15 };
  const overall_confidence = Math.round(
    layer1.confidence * weights.layer1 +
    layer2.confidence * weights.layer2 +
    layer3.confidence * weights.layer3 +
    layer4.confidence * weights.layer4
  );

  // Build justification chain
  const justification = buildJustification(layer1, layer2, layer3, layer4, userProfile);

  // Determine if we should speak
  let should_speak = true;
  let silence_reason: string | undefined;

  // SILENCE CONDITIONS (more permissive thresholds for better engagement):
  // 1. Layer 1 failed (insufficient physiological data)
  if (!layer1.pass) {
    should_speak = false;
    silence_reason = layer1.reason;
  }
  // 2. Overall confidence too low (lowered from 25 to 15)
  else if (overall_confidence < 15) {
    should_speak = false;
    silence_reason = `Confidence too low (${overall_confidence}%) to provide meaningful guidance`;
  }
  // Note: Removed overly strict silence conditions to allow more insights
  // We want to engage users even with stable data

  return {
    layer1_physiological: layer1,
    layer2_risk_trajectory: layer2,
    layer3_behavior_psychology: layer3,
    layer4_interests_adherence: layer4,
    overall_confidence,
    should_speak,
    silence_reason,
    justification
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

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
    let focusMode: FocusMode | null = null;
    let forceRefresh = false;
    let refreshNonce: string | null = null;
    try {
      const body = await req.json() as YvesIntelligenceRequest;
      userId = body.user_id || null;
      focusMode = body.focus_mode || null;
      forceRefresh = body.force_refresh || false;
      refreshNonce = body.refresh_nonce || null;
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
      console.error("[generate-yves-intelligence] No user ID provided");
      return new Response(
        JSON.stringify({ success: false, error: "User ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    console.log(`[generate-yves-intelligence] Starting intelligence generation for user ${userId}, date: ${today}, force_refresh: ${forceRefresh}`);

    // Load user's focus mode preference if not provided
    if (!focusMode) {
      const { data: focusPrefs } = await supabase
        .from("user_focus_preferences")
        .select("focus_mode")
        .eq("user_id", userId)
        .maybeSingle();

      focusMode = (focusPrefs?.focus_mode as FocusMode) || 'balance';
    }

    // On force_refresh, skip cache entirely — do NOT even query for existing briefing
    if (!forceRefresh) {
      const { data: existingIntelligence } = await supabase
        .from("daily_briefings")
        .select("*")
        .eq("user_id", userId)
        .eq("date", today)
        .eq("category", "unified")
        .eq("focus_mode", focusMode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingIntelligence && existingIntelligence.context_used) {
        // Check cache age (6-hour TTL)
        const cacheAge = Date.now() - new Date(existingIntelligence.created_at).getTime();
        const sixHoursInMs = 6 * 60 * 60 * 1000;

        if (cacheAge < sixHoursInMs) {
          console.log(`[generate-yves-intelligence] Returning cached intelligence for user ${userId} (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
          return new Response(
            JSON.stringify({
              success: true,
              cached: true,
              data: existingIntelligence.context_used as YvesIntelligenceOutput,
              content: existingIntelligence.content,
              created_at: existingIntelligence.created_at,
              focus_mode: focusMode,
              generation_id: existingIntelligence.generation_id,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.log(`[generate-yves-intelligence] Cache expired for user ${userId} (age: ${Math.round(cacheAge / 1000 / 60)} minutes), regenerating`);
        }
      }
    } else {
      console.log(`[generate-yves-intelligence] Force refresh requested for user ${userId}, fully bypassing all caches`);
    }

    // ─── CHECK DATA MATURITY FIRST ────────────────────────────────────────────
    let { data: dataMaturity, error: maturityError } = await supabase
      .from("user_data_maturity")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // If no maturity data exists, calculate it now
    if (!dataMaturity && !maturityError) {
      console.log(`[generate-yves-intelligence] No maturity data found for user ${userId}, calculating now...`);
      try {
        const maturityCalcResponse = await supabase.functions.invoke("calculate-data-maturity", {
          body: { user_id: userId }
        });

        if (maturityCalcResponse.data?.success) {
          // Refetch the maturity data
          const refetch = await supabase
            .from("user_data_maturity")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();
          dataMaturity = refetch.data;
          console.log(`[generate-yves-intelligence] Successfully calculated maturity for user ${userId}`);
        }
      } catch (calcError) {
        console.error(`[generate-yves-intelligence] Failed to calculate maturity for user ${userId}:`, calcError);
      }
    }

    console.log(`[generate-yves-intelligence] Data maturity check for user ${userId}:`, {
      maturity_level: dataMaturity?.maturity_level || 'not_found',
      maturity_score: dataMaturity?.maturity_score,
      data_days: dataMaturity?.data_days,
      wearable_connected: dataMaturity?.wearable_connected,
      error: maturityError
    });

    // If maturity is insufficient, return encouraging onboarding message
    if (dataMaturity?.maturity_level === 'insufficient') {
      console.log(`[generate-yves-intelligence] User ${userId} has insufficient data maturity - returning onboarding guidance`);
      
      const onboardingIntelligence: YvesIntelligenceOutput = {
        dailyBriefing: {
          summary: "I'm just getting to know you! Connect your Oura Ring and complete your profile so I can provide personalized insights tailored to your goals.",
          keyChanges: [],
          riskHighlights: [],
          todaysFocus: "Set up your health profile and connect your wearable to unlock personalized guidance",
        },
        recommendations: [{
          text: "Complete your health profile with your goals, preferences, and any health conditions I should know about",
          category: "performance",
          priority: "high",
          reasoning: "A complete profile helps me understand your unique needs and provide relevant, actionable advice"
        }]
      };

      await supabase.from("daily_briefings").upsert({
        user_id: userId,
        date: today,
        content: onboardingIntelligence.dailyBriefing.summary,
        context_used: onboardingIntelligence,
        category: "unified",
      });

      return new Response(
        JSON.stringify({
          success: true,
          cached: false,
          data: onboardingIntelligence,
          content: onboardingIntelligence.dailyBriefing.summary,
          created_at: new Date().toISOString(),
          maturity: dataMaturity,
          reasoning: { should_speak: false, silence_reason: "Insufficient data maturity" }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── LOAD ALL USER DATA ────────────────────────────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    console.log(`[generate-yves-intelligence] Loading user data for past 7 days (since ${sevenDaysAgoStr})...`);

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

    console.log(`[generate-yves-intelligence] Data loaded:`, {
      wearable_sessions: wearableSessionsResult.data?.length || 0,
      wearable_summary: wearableSummaryResult.data?.length || 0,
      training_trends: trainingTrendsResult.data?.length || 0,
      recovery_trends: recoveryTrendsResult.data?.length || 0,
      health_anomalies: healthAnomaliesResult.data?.length || 0,
      user_baselines: userBaselinesResult.data?.length || 0,
      user_deviations: userDeviationsResult.data?.length || 0,
      symptom_check_ins: symptomCheckInsResult.data?.length || 0,
    });

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

    // Batch 3: Documents, memory & adaptation profile
    const [
      userDocumentsResult,
      memoryBankResult,
      recentRecommendationsResult,
      adaptationProfileResult,
      riskTrajectoriesResult,
      pastBriefingsResult,
    ] = await Promise.all([
      supabase.from("user_documents").select("document_type, file_name, parsed_content, ai_summary, tags").eq("user_id", userId).eq("processing_status", "completed").order("uploaded_at", { ascending: false }).limit(10),
      supabase.from("yves_memory_bank").select("memory_key, memory_value").eq("user_id", userId),
      supabase.from("yves_recommendations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("user_adaptation_profile").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("risk_trajectories").select("*").eq("user_id", userId).order("calculation_date", { ascending: false }).limit(5),
      supabase.from("daily_briefings").select("date, content").eq("user_id", userId).eq("category", "unified").order("date", { ascending: false }).limit(3),
    ]);

    // Extract data
    const wearableSummary = wearableSummaryResult.data || [];
    const wearableSessions = wearableSessionsResult.data || [];
    const trainingTrends = trainingTrendsResult.data || [];
    // Defensive cap: old recovery_trends rows may have uncapped monotony values (e.g. 36.39)
    const recoveryTrends = (recoveryTrendsResult.data || []).map((r: any) => ({
      ...r,
      monotony: r.monotony !== null ? Math.min(r.monotony, 2.5) : null,
    }));
    const healthAnomalies = healthAnomaliesResult.data || [];
    const pastBriefings = pastBriefingsResult.data || [];
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
    const adaptationProfile = adaptationProfileResult.data;
    const riskTrajectories = riskTrajectoriesResult.data || [];

    // ═══════════════════════════════════════════════════════════════════════
    // COMPUTE METRIC DELTAS (today vs yesterday, today vs 7-day avg)
    // ═══════════════════════════════════════════════════════════════════════
    const computeDeltas = () => {
      const deltas: Record<string, { todayValue: number | null; yesterdayValue: number | null; dayOverDay: number | null; avg7d: number | null; vsAvg7d: number | null }> = {};
      
      const metricKeys = [
        { key: 'sleep_score', label: 'sleep_score' },
        { key: 'readiness_score', label: 'readiness_score' },
        { key: 'hrv_avg', label: 'hrv' },
        { key: 'resting_hr', label: 'resting_hr' },
      ];

      for (const { key, label } of metricKeys) {
        const values = wearableSessions.map((s: any) => s[key]).filter((v: any) => v !== null && v !== undefined);
        const todayVal = values[0] ?? null;
        const yesterdayVal = values[1] ?? null;
        const avg7d = values.length >= 3 ? Math.round((values.reduce((a: number, b: number) => a + b, 0) / values.length) * 10) / 10 : null;
        
        deltas[label] = {
          todayValue: todayVal,
          yesterdayValue: yesterdayVal,
          dayOverDay: todayVal !== null && yesterdayVal !== null ? Math.round((todayVal - yesterdayVal) * 10) / 10 : null,
          avg7d,
          vsAvg7d: todayVal !== null && avg7d !== null ? Math.round((todayVal - avg7d) * 10) / 10 : null,
        };
      }

      // Training trend deltas (ACWR, strain, monotony, training_load)
      const trendMetrics = [
        { key: 'acwr', label: 'acwr' },
        { key: 'strain', label: 'strain' },
        { key: 'monotony', label: 'monotony' },
        { key: 'training_load', label: 'training_load' },
      ];

      for (const { key, label } of trendMetrics) {
        const values = trainingTrends.map((t: any) => t[key]).filter((v: any) => v !== null && v !== undefined);
        const todayVal = values[0] ?? null;
        const yesterdayVal = values[1] ?? null;
        const avg7d = values.length >= 3 ? Math.round((values.reduce((a: number, b: number) => a + b, 0) / values.length) * 100) / 100 : null;

        deltas[label] = {
          todayValue: todayVal,
          yesterdayValue: yesterdayVal,
          dayOverDay: todayVal !== null && yesterdayVal !== null ? Math.round((todayVal - yesterdayVal) * 100) / 100 : null,
          avg7d,
          vsAvg7d: todayVal !== null && avg7d !== null ? Math.round((todayVal - avg7d) * 100) / 100 : null,
        };
      }

      return deltas;
    };

    const metricDeltas = computeDeltas();
    console.log(`[generate-yves-intelligence] Computed metric deltas for user ${userId}:`, JSON.stringify(metricDeltas));

    // ═══════════════════════════════════════════════════════════════════════
    // EXECUTE 4-LAYER REASONING ENGINE
    // ═══════════════════════════════════════════════════════════════════════
    const reasoningContext = executeLayeredReasoning(
      wearableSessions,
      trainingTrends,
      recoveryTrends,
      userBaselines,
      userDeviations,
      riskTrajectories,
      healthAnomalies,
      symptomCheckIns,
      adaptationProfile,
      recentRecommendations,
      userProfile,
      userInterests,
      userTraining
    );

    console.log(`[generate-yves-intelligence] Reasoning result for user ${userId}:`, {
      should_speak: reasoningContext.should_speak,
      overall_confidence: reasoningContext.overall_confidence,
      silence_reason: reasoningContext.silence_reason,
      justification: reasoningContext.justification,
      layer1_pass: reasoningContext.layer1_physiological.pass,
      layer2_pass: reasoningContext.layer2_risk_trajectory.pass,
      layer3_pass: reasoningContext.layer3_behavior_psychology.pass,
      layer4_pass: reasoningContext.layer4_interests_adherence.pass,
    });

    // ─── SILENCE IS A VALID OUTCOME ───────────────────────────────────────────
    if (!reasoningContext.should_speak) {
      console.log(`[generate-yves-intelligence] Reasoning engine says SILENCE for user ${userId}. Reason: ${reasoningContext.silence_reason}`);
      const silentResponse: YvesIntelligenceOutput = {
        dailyBriefing: {
          summary: reasoningContext.overall_confidence < 25
            ? "I'm still building your baseline. Keep syncing your data - I'll have personalized insights for you soon."
            : "Everything looks stable today. I'll speak up when there's something meaningful to share.",
          keyChanges: [],
          riskHighlights: [],
          todaysFocus: reasoningContext.overall_confidence < 25
            ? "Continue wearing your Oura Ring to build your personal baseline"
            : undefined,
        },
        recommendations: []
      };

      // Store the silent response with reasoning context
      const silentGenerationId = crypto.randomUUID();
      const silentRow = {
        user_id: userId,
        date: today,
        content: silentResponse.dailyBriefing.summary,
        context_used: { 
          ...silentResponse, 
          reasoning: reasoningContext,
          silent: true 
        },
        category: "unified",
        focus_mode: focusMode,
        generation_id: silentGenerationId,
        refresh_nonce: refreshNonce,
      };
      
      if (forceRefresh) {
        await supabase.from("daily_briefings").insert(silentRow);
      } else {
        await supabase.from("daily_briefings").upsert(silentRow);
      }

      return new Response(
        JSON.stringify({
          success: true,
          cached: false,
          data: silentResponse,
          content: silentResponse.dailyBriefing.summary,
          created_at: new Date().toISOString(),
          reasoning: {
            should_speak: false,
            silence_reason: reasoningContext.silence_reason,
            confidence: reasoningContext.overall_confidence,
            layers: {
              layer1: { pass: reasoningContext.layer1_physiological.pass, confidence: reasoningContext.layer1_physiological.confidence },
              layer2: { pass: reasoningContext.layer2_risk_trajectory.pass, confidence: reasoningContext.layer2_risk_trajectory.confidence },
              layer3: { pass: reasoningContext.layer3_behavior_psychology.pass, confidence: reasoningContext.layer3_behavior_psychology.confidence },
              layer4: { pass: reasoningContext.layer4_interests_adherence.pass, confidence: reasoningContext.layer4_interests_adherence.confidence },
            }
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── COACHING MODE CLASSIFICATION ────────────────────────────────────────
    type CoachingMode = 'general_wellness' | 'performance' | 'rehab';
    
    const classifyCoachingMode = (): CoachingMode => {
      // Use reasoning context to determine mode
      const riskLevel = (reasoningContext.layer2_risk_trajectory.findings.risk_accumulation as any)?.level;
      
      // Priority 1: REHAB - if risk is high or moderate
      if (riskLevel === 'high' || riskLevel === 'moderate') {
        return 'rehab';
      }

      // Check for symptoms or injuries
      const hasRecentSymptoms = symptomCheckIns.length > 0;
      const hasActiveInjuries = userInjuries?.injuries?.length > 0;
      
      if (hasRecentSymptoms || hasActiveInjuries) {
        return 'rehab';
      }

      // Priority 2: PERFORMANCE
      const performanceGoals = ['performance', 'strength', 'endurance', 'speed', 
        'muscle', 'training', 'competition', 'race', 'marathon', 'triathlon'];
      
      const hasPerformanceGoals = userProfile?.goals?.some((g: string) => 
        performanceGoals.some(pg => g.toLowerCase().includes(pg))
      );
      const hasHighActivityLevel = userProfile?.activity_level === 'very_active' || 
        userProfile?.activity_level === 'extremely_active';

      if (hasPerformanceGoals || hasHighActivityLevel) {
        return 'performance';
      }

      return 'general_wellness';
    };

    const coaching_mode: CoachingMode = classifyCoachingMode();
    console.log(`[generate-yves-intelligence] Coaching mode: ${coaching_mode} for user ${userId}`);

    // ─── GET FOCUS MODE CONTEXT ──────────────────────────────────────────────
    const focusModeContext = getFocusModePromptContext(focusMode!);
    console.log(`[generate-yves-intelligence] Using focus mode: ${focusMode} for user ${userId}`);

    // ─── BUILD COMPREHENSIVE CONTEXT ─────────────────────────────────────────
    let promptContext = "";

    // Include focus mode context
    promptContext += `═══ FOCUS MODE: ${focusMode?.toUpperCase()} ═══\n\n`;
    promptContext += `Topic Emphasis:\n`;
    focusModeContext.topicEmphasis.forEach(topic => {
      promptContext += `• ${topic}\n`;
    });
    promptContext += "\n";

    // Include reasoning context for AI
    promptContext += "═══ REASONING ENGINE OUTPUT ═══\n\n";
    promptContext += `Overall Confidence: ${reasoningContext.overall_confidence}%\n`;
    promptContext += `Justification:\n`;
    promptContext += `• Why this issue: ${reasoningContext.justification.why_this_issue || 'Not established'}\n`;
    promptContext += `• Why now: ${reasoningContext.justification.why_now || 'Not established'}\n`;
    promptContext += `• Why this intervention: ${reasoningContext.justification.why_this_intervention || 'Not established'}\n`;
    promptContext += `• Why this user: ${reasoningContext.justification.why_this_user || 'Not established'}\n\n`;

    // Risk summary from Layer 2
    const riskLevel = (reasoningContext.layer2_risk_trajectory.findings.risk_accumulation as any)?.level;
    const earlyWarnings = (reasoningContext.layer2_risk_trajectory.findings.early_warning_detection as any)?.warnings || [];
    promptContext += `Risk Level: ${riskLevel || 'low'}\n`;
    if (earlyWarnings.length > 0) {
      promptContext += `Early Warnings: ${earlyWarnings.join('; ')}\n`;
    }

    // Adherence guidance from Layer 4
    const adherenceRanking = reasoningContext.layer4_interests_adherence.findings.adherence_ranking as any;
    if (adherenceRanking?.prioritize_high_adherence?.length > 0) {
      promptContext += `Prioritize categories: ${adherenceRanking.prioritize_high_adherence.join(', ')}\n`;
    }
    if (adherenceRanking?.suppress_low_adherence?.length > 0) {
      promptContext += `Suppress categories (low adherence): ${adherenceRanking.suppress_low_adherence.join(', ')}\n`;
    }
    promptContext += "\n";

    // User profile section
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
    }
    promptContext += "\n";

    // Health context
    promptContext += "═══ HEALTH CONTEXT ═══\n\n";

    if (userMedical) {
      if (userMedical.conditions?.length > 0) promptContext += `Health Conditions: ${userMedical.conditions.join(", ")}\n`;
      if (userMedical.medications?.length > 0) promptContext += `Current Medications: ${userMedical.medications.join(", ")}\n`;
    }

    if (userInjuries?.injuries?.length > 0) {
      promptContext += `Current Injuries: ${userInjuries.injuries.join(", ")}\n`;
    }
    promptContext += "\n";

    // Current health state with deltas
    promptContext += "═══ CURRENT HEALTH STATE ═══\n\n";

    if (wearableSessions.length > 0) {
      const latestSession = wearableSessions[0];
      promptContext += `Today (${latestSession.date}):\n`;

      const formatDelta = (d: { todayValue: number | null; dayOverDay: number | null; avg7d: number | null; vsAvg7d: number | null } | undefined, unit = '') => {
        if (!d || d.todayValue === null) return null;
        let line = `${d.todayValue}${unit}`;
        if (d.dayOverDay !== null) line += ` (${d.dayOverDay >= 0 ? '+' : ''}${d.dayOverDay} vs yesterday`;
        if (d.vsAvg7d !== null) line += `, ${d.vsAvg7d >= 0 ? '+' : ''}${d.vsAvg7d} vs 7-day avg of ${d.avg7d}${unit}`;
        if (d.dayOverDay !== null) line += `)`;
        return line;
      };

      const readinessLine = formatDelta(metricDeltas.readiness_score, '/100');
      if (readinessLine) promptContext += `• Readiness Score: ${readinessLine}\n`;

      const sleepLine = formatDelta(metricDeltas.sleep_score, '/100');
      if (sleepLine) promptContext += `• Sleep Score: ${sleepLine}\n`;

      const hrvLine = formatDelta(metricDeltas.hrv, 'ms');
      if (hrvLine) promptContext += `• HRV: ${hrvLine}\n`;

      const rhrLine = formatDelta(metricDeltas.resting_hr, 'bpm');
      if (rhrLine) promptContext += `• Resting HR: ${rhrLine}\n`;

      promptContext += "\n";
    }

    // Explicit delta summary for AI reasoning
    promptContext += "═══ METRIC DELTAS (CHANGES) ═══\n\n";
    for (const [metric, d] of Object.entries(metricDeltas)) {
      if (d.todayValue === null) continue;
      const direction = d.dayOverDay !== null
        ? (d.dayOverDay > 0 ? '↑ improving' : d.dayOverDay < 0 ? '↓ declining' : '→ stable')
        : '? unknown';
      promptContext += `${metric}: today=${d.todayValue}, vs yesterday=${d.dayOverDay ?? 'N/A'} (${direction}), vs 7d avg=${d.vsAvg7d ?? 'N/A'}\n`;
    }
    promptContext += "\n";

    // Training trends — balanced presentation of ALL key metrics
    if (trainingTrends.length > 0) {
      const latestTrend = trainingTrends[0];
      promptContext += "═══ TRAINING STATUS ═══\n\n";
      
      if (latestTrend.acwr !== null) {
        promptContext += `ACWR: ${latestTrend.acwr.toFixed(2)}`;
        if (latestTrend.acwr > 1.5) promptContext += " ⚠️ HIGH RISK\n";
        else if (latestTrend.acwr > 1.3) promptContext += " ⚠️ ELEVATED\n";
        else if (latestTrend.acwr < 0.8) promptContext += " ℹ️ CAN INCREASE\n";
        else promptContext += " ✓ OPTIMAL — acknowledge this positive!\n";
      }

      // Monotony: context-aware presentation instead of always-on alarm
      if (latestTrend.monotony !== null) {
        const cappedMonotony = Math.min(latestTrend.monotony, 2.5);
        // Check if monotony has been at the same level for 3+ days
        const recentMonotonyValues = trainingTrends.slice(0, 3).map((t: any) => t.monotony !== null ? Math.min(t.monotony, 2.5) : null).filter((v: number | null) => v !== null);
        const monotonyStable = recentMonotonyValues.length >= 3 && Math.max(...recentMonotonyValues) - Math.min(...recentMonotonyValues) < 0.3;
        
        if (cappedMonotony > 2.0 && monotonyStable) {
          promptContext += `Monotony: ${cappedMonotony.toFixed(2)} — stable (elevated but unchanged for ${recentMonotonyValues.length}+ days, already discussed)\n`;
        } else if (cappedMonotony > 2.0) {
          promptContext += `Monotony: ${cappedMonotony.toFixed(2)} ⚠️ HIGH - needs variety\n`;
        } else {
          promptContext += `Monotony: ${cappedMonotony.toFixed(2)} ✓ HEALTHY\n`;
        }
      }

      // Sleep trend (3-day direction)
      if (wearableSessions.length >= 3) {
        const sleepScores = wearableSessions.slice(0, 3).map((s: any) => s.sleep_score).filter((v: number | null) => v !== null);
        if (sleepScores.length >= 2) {
          const sleepDirection = sleepScores[0] > sleepScores[sleepScores.length - 1] + 3 ? 'improving ↑' : sleepScores[0] < sleepScores[sleepScores.length - 1] - 3 ? 'declining ↓' : 'stable →';
          promptContext += `Sleep Trend (3-day): ${sleepDirection} (latest: ${sleepScores[0]})\n`;
        }
      }

      // HRV trend (3-day direction)
      if (wearableSessions.length >= 3) {
        const hrvValues = wearableSessions.slice(0, 3).map((s: any) => s.hrv_avg).filter((v: number | null) => v !== null);
        if (hrvValues.length >= 2) {
          const hrvDirection = hrvValues[0] > hrvValues[hrvValues.length - 1] + 3 ? 'improving ↑' : hrvValues[0] < hrvValues[hrvValues.length - 1] - 3 ? 'declining ↓' : 'stable →';
          promptContext += `HRV Trend (3-day): ${hrvDirection} (latest: ${hrvValues[0]}ms)\n`;
        }
      }

      // Readiness trend (3-day direction)
      if (wearableSessions.length >= 3) {
        const readinessScores = wearableSessions.slice(0, 3).map((s: any) => s.readiness_score).filter((v: number | null) => v !== null);
        if (readinessScores.length >= 2) {
          const readinessDirection = readinessScores[0] > readinessScores[readinessScores.length - 1] + 3 ? 'improving ↑' : readinessScores[0] < readinessScores[readinessScores.length - 1] - 3 ? 'declining ↓' : 'stable →';
          promptContext += `Readiness Trend (3-day): ${readinessDirection} (latest: ${readinessScores[0]})\n`;
        }
      }

      promptContext += "\n";
    }

    // Symptom check-ins
    if (symptomCheckIns.length > 0) {
      promptContext += "═══ RECENT SYMPTOMS ═══\n\n";
      symptomCheckIns.slice(0, 3).forEach(s => {
        promptContext += `• ${s.symptom_type} (${s.severity})`;
        if (s.description) promptContext += `: ${s.description}`;
        promptContext += "\n";
      });
      promptContext += "\n";
    }

    // Adaptation profile
    if (adaptationProfile) {
      promptContext += "═══ USER PREFERENCES ═══\n\n";
      if (adaptationProfile.effective_tone) {
        promptContext += `Preferred tone: ${adaptationProfile.effective_tone}\n`;
      }
      if (adaptationProfile.follow_through_rate !== null) {
        promptContext += `Historical follow-through: ${adaptationProfile.follow_through_rate}%\n`;
      }
      promptContext += "\n";
    }

    // ─── BUILD TONE GUIDANCE ────────────────────────────────────────────────
    const toneGuidance: Record<CoachingMode, string> = {
      general_wellness: `
═══ TONE: GENERAL WELLNESS ═══
Be CALM, SUPPORTIVE, LOW PRESSURE. Use "consider", "you might enjoy", "when you're ready".
Focus on overall wellbeing, not performance metrics.`,

      performance: `
═══ TONE: PERFORMANCE ═══
Be CONFIDENT, DIRECTIVE, GOAL-ORIENTED. Give clear, actionable instructions.
Reference metrics and connect advice to their performance objectives.`,

      rehab: `
═══ TONE: REHAB ═══
Be CAUTIOUS, PROTECTIVE, PRECISE. Prioritize safety above all.
Acknowledge frustration but enforce clear boundaries on activity.`
    };

    // ═══════════════════════════════════════════════════════════════════════
    // FACTS PACK (deterministic — identical across refreshes if data unchanged)
    // ═══════════════════════════════════════════════════════════════════════
    const buildFactsPack = () => {
      // Top 3 deltas by absolute magnitude
      const allDeltas = Object.entries(metricDeltas)
        .filter(([_, d]) => d.todayValue !== null && d.dayOverDay !== null)
        .map(([metric, d]) => ({
          metric,
          value: d.todayValue!,
          delta: d.dayOverDay!,
          direction: d.dayOverDay! > 0 ? 'up' : d.dayOverDay! < 0 ? 'down' : 'stable',
          vs_avg: d.vsAvg7d,
        }))
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 3);

      // Training summary last 48h
      const last2Sessions = wearableSessions.slice(0, 2);
      const trainingSummary48h = last2Sessions.map((s: any) => ({
        date: s.date,
        activity_score: s.activity_score,
        strain: trainingTrends.find((t: any) => t.date === s.date)?.strain ?? null,
        steps: s.steps,
      }));

      // Risk flags
      const riskFlags: string[] = [];
      const latestTrend = trainingTrends[0];
      if (latestTrend?.acwr > 1.3) riskFlags.push(`ACWR elevated: ${latestTrend.acwr.toFixed(2)}`);
      if (latestTrend?.monotony > 2.0) riskFlags.push(`Monotony high: ${Math.min(latestTrend.monotony, 2.5).toFixed(2)}`);
      if (latestTrend?.strain > 1200) riskFlags.push(`Strain elevated: ${latestTrend.strain.toFixed(0)}`);
      const decliningMetrics = allDeltas.filter(d => d.direction === 'down' && Math.abs(d.delta) > 10);
      if (decliningMetrics.length >= 2) riskFlags.push(`Multiple metrics declining: ${decliningMetrics.map(d => d.metric).join(', ')}`);

      // Goal + constraint
      const goals = userProfile?.goals || userWellnessGoals?.goals || [];
      const constraints: string[] = [];
      if (userInjuries?.injuries?.length > 0) constraints.push(...userInjuries.injuries);
      if (userMedical?.conditions?.length > 0) constraints.push(...userMedical.conditions);

      return {
        date_used: today,
        top_3_deltas: allDeltas,
        training_summary_48h: trainingSummary48h,
        risk_flags: riskFlags,
        goals: goals.slice(0, 3),
        constraints: constraints.slice(0, 3),
      };
    };

    const factsPack = buildFactsPack();

    // ═══════════════════════════════════════════════════════════════════════
    // PERSONAL PROFILE CARD (compact, server-side, injected into prompt)
    // ═══════════════════════════════════════════════════════════════════════
    const buildPersonalProfileCard = () => {
      // user_name
      const userName = userProfile?.name || memoryBank.find((m: any) => m.memory_key === 'preferred_name')?.memory_value || null;

      // primary_goal (1 line)
      const goalSources = [
        userWellnessGoals?.priority,
        ...(userProfile?.goals || []),
        ...(userWellnessGoals?.goals || []),
      ].filter(Boolean);
      const primaryGoal = goalSources.length > 0 ? goalSources[0] : null;

      // primary_constraint (injury/medical/training limitation) (1 line)
      const constraintSources: string[] = [];
      if (userInjuries?.injuries?.length > 0) constraintSources.push(...userInjuries.injuries);
      if (userMedical?.conditions?.length > 0) constraintSources.push(...userMedical.conditions);
      if (userMedical?.medications?.length > 0) constraintSources.push(`on ${userMedical.medications[0]}`);
      // Check memory bank for injury history
      const injuryMemory = memoryBank.find((m: any) => m.memory_key === 'injury_history');
      if (injuryMemory && constraintSources.length === 0) constraintSources.push(injuryMemory.memory_value);
      const primaryConstraint = constraintSources.length > 0 ? constraintSources.slice(0, 2).join('; ') : null;

      // adherence_pattern (what they actually follow vs ignore) (1 line)
      const highAdherence = (adherenceRanking?.prioritize_high_adherence || []) as string[];
      const lowAdherence = (adherenceRanking?.suppress_low_adherence || []) as string[];
      let adherencePattern: string | null = null;
      if (highAdherence.length > 0 || lowAdherence.length > 0) {
        const parts: string[] = [];
        if (highAdherence.length > 0) parts.push(`follows: ${highAdherence.join(', ')}`);
        if (lowAdherence.length > 0) parts.push(`ignores: ${lowAdherence.join(', ')}`);
        adherencePattern = parts.join(' | ');
      }
      // Fallback: use follow-through rate
      if (!adherencePattern && adaptationProfile?.follow_through_rate !== null && adaptationProfile?.follow_through_rate !== undefined) {
        adherencePattern = `${adaptationProfile.follow_through_rate}% overall follow-through`;
      }

      // preference (timing / training type / disliked categories) (1 line)
      const prefParts: string[] = [];
      const trainingPref = memoryBank.find((m: any) => m.memory_key === 'preferred_training');
      if (trainingPref) prefParts.push(trainingPref.memory_value);
      if (userTraining?.preferred_activities?.length > 0) prefParts.push(`likes ${userTraining.preferred_activities.slice(0, 2).join(', ')}`);
      if (userLifestyle?.wake_time) prefParts.push(`wakes ${userLifestyle.wake_time}`);
      if (userRecovery?.preferred_methods?.length > 0) prefParts.push(`recovery: ${userRecovery.preferred_methods[0]}`);
      const preference = prefParts.length > 0 ? prefParts.slice(0, 2).join(' | ') : null;

      return { userName, primaryGoal, primaryConstraint, adherencePattern, preference, suppressedCategories: lowAdherence };
    };

    const profileCard = buildPersonalProfileCard();
    console.log(`[generate-yves-intelligence] Profile card:`, profileCard);

    // ═══════════════════════════════════════════════════════════════════════
    // CREATIVE FRAMING PACK (changes every refresh via nonce-based rotation)
    // ═══════════════════════════════════════════════════════════════════════
    const buildCreativeFramingPack = () => {
      // Deterministic seed from nonce (or date for non-refresh)
      const seed = refreshNonce || today;
      const hashCode = (s: string) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) {
          h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        }
        return Math.abs(h);
      };
      const hash = hashCode(seed);

      const briefingTemplates = [
        'narrative',      // Story-like flow connecting metrics to daily life
        'headline_drill', // Bold headline → supporting detail → action
        'compare_contrast', // Yesterday vs today, what shifted and why
        'question_led',   // Opens with a reflective question, then answers it with data
        'milestone_check', // Framed around progress toward a goal or baseline
        'pattern_spotlight', // Highlights a multi-day pattern emerging from noise
      ];

      const toneVariants = [
        'coach',       // Warm, directive, experienced
        'analyst',     // Data-forward, precise, measured
        'supportive',  // Empathetic, validating, encouraging
        'direct',      // Concise, no-nonsense, action-first
        'minimalist',  // Sparse, poetic, zen-like calm
      ];

      const focusLenses = [
        'recovery',    // How well the body is bouncing back
        'performance', // Training readiness and load capacity
        'risk',        // Injury/overtraining warning signals
        'habit',       // Consistency and routine adherence
        'mobility',    // Movement quality, stiffness, flexibility
        'nutrition',   // Fueling, hydration, energy balance
      ];

      // Filter focus lenses by focus_mode compatibility
      const allowedLenses: Record<string, string[]> = {
        recovery: ['recovery', 'risk', 'habit', 'mobility'],
        performance: ['performance', 'recovery', 'risk', 'habit'],
        pain_management: ['recovery', 'risk', 'mobility', 'habit'],
        balance: ['recovery', 'performance', 'risk', 'habit', 'mobility', 'nutrition'],
        custom: ['recovery', 'performance', 'risk', 'habit', 'mobility', 'nutrition'],
      };

      const validLenses = allowedLenses[focusMode || 'balance'] || focusLenses;

      const template = briefingTemplates[hash % briefingTemplates.length];
      const tone = toneVariants[(hash >> 3) % toneVariants.length];
      const lens = validLenses[(hash >> 6) % validLenses.length];

      return { template, tone, lens };
    };

    const creativePack = buildCreativeFramingPack();

    // ─── AI CALL WITH STRUCTURED OUTPUT ────────────────────────────────────
    const systemPrompt = `You are Yves, a calm, highly experienced performance coach and clinician who provides thoughtful, personalized insights.

═══ CORE IDENTITY ═══
You speak to users as an intelligent human would, not as a system.
Your goal is to help users make better daily decisions, not to scare or control them.
You avoid alarmist language, certainty, and overuse of medical terms.
You never mention data sources, systems, models, or detection mechanisms.
Speak WITH the user, not AT the user.

═══ GROUNDED OBSERVATION RULE ═══
Every response MUST begin with a grounded observation about the user's recent pattern.
The observation must reference: a trend, a direction of change, and a short timeframe.
Never give advice without first anchoring it to an observable pattern.
Use language like: "You've been trending toward…", "Over the past few days…", "Recently, your training has…"
Never provide generic advice or advice without context.

═══ SOFT COUNTERFACTUAL ═══
When appropriate, include ONE soft counterfactual sentence explaining what is likely to happen if nothing changes today.
Rules: No certainty, no injury guarantees, no fear language, no urgency. Tone must be informational and calm.
Examples: "If this pattern continues today, recovery may feel slightly delayed." / "Keeping intensity high again could make stiffness more noticeable later this week."
The counterfactual is optional. Never include more than one.

${toneGuidance[coaching_mode]}

${focusModeContext.systemPromptAddition}

═══ FACTS PACK (IMMUTABLE — do NOT alter these facts) ═══
The following facts are deterministic and MUST be reflected accurately in your output.
Do NOT invent, round differently, or contradict any of these values.
- Date: ${factsPack.date_used}
- Top 3 metric changes: ${factsPack.top_3_deltas.map(d => `${d.metric}: ${d.value} (${d.direction} ${Math.abs(d.delta)}${d.vs_avg !== null ? `, vs 7d avg: ${d.vs_avg > 0 ? '+' : ''}${d.vs_avg}` : ''})`).join('; ')}
- Training last 48h: ${factsPack.training_summary_48h.map(s => `${s.date}: activity=${s.activity_score ?? 'N/A'}, strain=${s.strain ?? 'N/A'}, steps=${s.steps ?? 'N/A'}`).join(' | ')}
- Risk flags: ${factsPack.risk_flags.length > 0 ? factsPack.risk_flags.join('; ') : 'None'}
- Goals: ${factsPack.goals.length > 0 ? factsPack.goals.join(', ') : 'Not set'}
- Constraints: ${factsPack.constraints.length > 0 ? factsPack.constraints.join(', ') : 'None'}

═══ CREATIVE FRAMING PACK (MUST follow these creative instructions) ═══
- Briefing template: ${creativePack.template}
  ${creativePack.template === 'narrative' ? '→ Write as a flowing story connecting metrics to daily life' : ''}${creativePack.template === 'headline_drill' ? '→ Start with a bold 1-sentence headline, then drill into supporting detail, end with action' : ''}${creativePack.template === 'compare_contrast' ? '→ Frame as "yesterday vs today" — what shifted and why it matters' : ''}${creativePack.template === 'question_led' ? '→ Open with a reflective question, then answer it with data' : ''}${creativePack.template === 'milestone_check' ? '→ Frame around progress toward a goal or baseline comparison' : ''}${creativePack.template === 'pattern_spotlight' ? '→ Highlight a multi-day pattern emerging from noise' : ''}
- Tone variant: ${creativePack.tone}
  ${creativePack.tone === 'coach' ? '→ Warm, directive, experienced. Like a trusted coach in the locker room.' : ''}${creativePack.tone === 'analyst' ? '→ Data-forward, precise, measured. Lead with numbers, explain significance.' : ''}${creativePack.tone === 'supportive' ? '→ Empathetic, validating, encouraging. Acknowledge effort before advising.' : ''}${creativePack.tone === 'direct' ? '→ Concise, no-nonsense, action-first. Cut the preamble, get to the point.' : ''}${creativePack.tone === 'minimalist' ? '→ Sparse, poetic, zen-like calm. Few words, maximum impact.' : ''}
- Today's focus lens: ${creativePack.lens}
  → Frame your primary observation and recommendation through the "${creativePack.lens}" lens

═══ SEPARATION RULE (CRITICAL) ═══
1. The FACTS (metrics, deltas, risk flags) must NOT change across refreshes unless the underlying data changed.
2. The WORDING, STRUCTURE, and FRAMING must change each refresh based on the creative framing pack above.
3. You must use the specified template structure, tone variant, and focus lens. These are not suggestions — they are instructions.

═══ TONE MODE SELECTION (MANDATORY) ═══
Before generating output, determine exactly ONE tone mode based on the user's current context. Never mix tones in a single output.
• AFFIRMING — Use when trends are positive, adherence is good. Celebrate consistency and progress.
• GUIDING — Use when trends are neutral. Offer calm adjustment suggestions without alarm.
• CAUTIOUS — Use when risk is rising or early warning signs appear. Be measured but clear about what you're observing.
• REASSURING — Use post-alert, during uncertainty, or when the user may feel anxious. Reduce tension, normalize the situation.
Selection is based on: deviation from baseline, consecutive days of a pattern, injury/symptom history, and previous response to similar advice.

═══ MODULAR PROMPT STRUCTURE ═══
Assemble output from these components — use 2–4 per output, never all at once, vary structure between days:
• Observation (required) — a grounded pattern observation
• Affirmation (optional) — acknowledge effort or consistency
• Soft counterfactual (optional) — one calm "if nothing changes" sentence
• Recommendation (required) — specific, actionable suggestion
• Gentle closing question (optional) — invite reflection or check-in
Do NOT follow a fixed paragraph structure.

═══ PERSONAL PROFILE CARD ═══
This is WHO you are talking to. Use this to make every output personal.
- Name: ${profileCard.userName || 'Unknown'}
- Primary goal: ${profileCard.primaryGoal || 'Not set'}
- Primary constraint: ${profileCard.primaryConstraint || 'None known'}
- Adherence pattern: ${profileCard.adherencePattern || 'No data yet'}
- Preference: ${profileCard.preference || 'No preferences recorded'}
- Suppressed categories (DO NOT recommend): ${profileCard.suppressedCategories.length > 0 ? profileCard.suppressedCategories.join(', ') : 'None'}

═══ MANDATORY PERSONALIZATION RULES ═══
1. You MUST reference the user's primary goal within the first 2 sentences of the summary.
2. You MUST reference at least 1 real metric delta (from the FACTS PACK) in your summary.
3. You MUST include at least 1 recommendation that matches the user's high-adherence pattern (a "high-probability action" they are likely to follow).
4. You MUST NOT recommend anything in suppressed categories listed above.
5. If a constraint exists, recommendations must respect it (e.g., no running if knee injury).
6. NAME USAGE: Use the user's name at most ONCE in the entire output. Only when it adds emotional value (praising consistency, expressing concern). Never start with the name. Never use it in technical statements.

═══ TOPIC VARIETY (MANDATORY) ═══
Do NOT repeat the same primary topic as recent briefings.
Review the PAST BRIEFINGS section below. If you discussed training monotony or training variety yesterday, lead with a DIFFERENT observation today (sleep quality, HRV trends, readiness patterns, recovery wins, goal progress, activity consistency).
Monotony can be mentioned briefly as ongoing context, but should NOT be the headline unless it has meaningfully changed since the last briefing.
Rotate your lead topic across days. Each briefing should feel fresh.
${forceRefresh ? `\n═══ NOVELTY MODE: ACTIVE ═══\nThis is a manual refresh. The user explicitly wants FRESH content.\nRULES:\n1. Do NOT reuse the same opening line as any recent briefing shown below\n2. Do NOT lead with the same primary recommendation category unless the data absolutely demands it\n3. Choose a DIFFERENT angle or lens on the same data (e.g., if last time you led with sleep, now lead with recovery or training load)\n4. Use different sentence structures and vocabulary\n5. You MUST include a "novelty_note" field in your JSON output explaining what you changed vs the previous briefing\n` : ''}

═══ CRITICAL RULES ═══
1. Always provide meaningful, personalized content - never be generic
2. Even on stable days, find patterns worth acknowledging or celebrating
3. Recommendations must align with the JUSTIFICATION provided by the reasoning engine
4. Do NOT recommend categories marked as "suppress" (low adherence) — see PERSONAL PROFILE CARD
5. DO prioritize categories marked as high adherence
6. Connect observations to the user's specific context, goals, and recent patterns
7. Frame recommendations as options, not commands. Use "Today could be a good opportunity to…", "You might benefit from…", "It may be worth considering…". Never use "You should", "You must", or "Do this today". Support user autonomy.
8. ANTI-SURVEILLANCE: Never imply monitoring. Never say "We detected", "The system flagged", "Your data shows". Instead say "It looks like", "You've been trending toward", "Today suggests".
9. MEMORY REFERENCING: Reference past behavior only when it improves clarity or trust. Allowed: "In the past, lighter days have helped you reset well.", "You've responded well to this approach before." No long history recaps or irrelevant old data. Memory should feel helpful, not heavy.
10. TOPIC VARIETY: Never lead with the same topic as your most recent briefing. Vary your primary observation across sleep, HRV, readiness, training load, recovery, and goals.

═══ PRE-OUTPUT VALIDATION (MANDATORY) ═══
Before delivering output, internally validate:
1. Does this feel like a human coach speaking?
2. Is the advice earned by context?
3. Is the tone appropriate?
4. Is the language calm and respectful?
5. Would this encourage trust, not compliance?
6. Do the facts (metrics, deltas) exactly match the FACTS PACK?
7. Does the structure follow the assigned TEMPLATE?
8. Does the tone match the assigned TONE VARIANT?
If any answer is "no", revise before output.

═══ OUTPUT FORMAT ═══
Generate a JSON object:
{
  "dailyBriefing": {
    "summary": "2-4 sentences that feel personal and insightful. Reference specific metrics, trends, or patterns from their data. Avoid generic statements like 'everything looks stable' - instead, explain WHAT is stable and WHY that matters for them.",
    "keyChanges": ["1-2 specific observations about trends, patterns, or notable shifts. Include actual numbers or timeframes when relevant."],
    "riskHighlights": ["Only include if genuinely concerning - this can be empty"],
    "todaysFocus": "ONE clear, actionable priority with specific timing and reasoning"
  },
  "recommendations": [
    {
      "text": "Specific, actionable recommendation tied to THEIR data patterns and preferences",
      "category": "training|recovery|nutrition|sleep|mindset|performance",
      "priority": "high|medium|low",
      "reasoning": "Internal justification connecting to their specific metrics and goals"
    }
  ],
  "facts_used": {
    "top_3_deltas": ${JSON.stringify(factsPack.top_3_deltas)},
    "risk_flags": ${JSON.stringify(factsPack.risk_flags)}
  },
  "creative_framing_used": {
    "template": "${creativePack.template}",
    "tone": "${creativePack.tone}",
    "lens": "${creativePack.lens}"
  }${forceRefresh ? `,\n  "novelty_note": "Brief explanation of what is different in this output vs the previous one"` : ''}
}

═══ PERSONALIZATION ═══
- NAME USAGE: Do NOT use the user's name by default. Only use it when it adds emotional or contextual value — praising consistency, expressing concern, referencing a previously reported issue, or acknowledging multi-day progress. Never start with the name. Never use it more than once. Never use it in purely technical statements.
- REFERENCE their specific goals and preferences
- RESPECT their injuries/conditions
- MATCH their preferred tone
- CITE multi-day patterns with specific metrics and timeframes
- Celebrate consistency, progress, or positive patterns
- Provide context for why observations matter to THEM specifically

═══ ENGAGEMENT PRINCIPLE ═══
Your role is to help users understand their health data through personalized insights.
Even when metrics are stable, explain what that stability means, acknowledge their consistency,
or highlight subtle patterns they might miss. Make every briefing feel worth reading.

RESPOND WITH ONLY THE JSON OBJECT.`;

    // Include past briefings in prompt context
    let pastBriefingsContext = "";
    if (pastBriefings.length > 0) {
      if (forceRefresh) {
        pastBriefingsContext = "\n═══ PAST BRIEFINGS (NOVELTY MODE — you MUST produce different content) ═══\n\n";
        pastBriefingsContext += `LAST BRIEFING (${pastBriefings[0].date}):\n${pastBriefings[0].content?.substring(0, 500) || "No content"}\n\n`;
        const recentTopics = pastBriefings.slice(0, 3).map((b: any) => {
          const firstSentence = b.content?.split('.')[0] || '';
          return `${b.date}: "${firstSentence}"`;
        });
        pastBriefingsContext += `LAST 3 OPENING LINES (do NOT repeat these):\n${recentTopics.join('\n')}\n\n`;
      } else {
        pastBriefingsContext = "\n═══ PAST BRIEFINGS (avoid repeating these topics) ═══\n\n";
        pastBriefings.forEach((b: any) => {
          const summary = b.content?.substring(0, 1000) || "No content";
          pastBriefingsContext += `${b.date}: ${summary}\n\n`;
        });
      }
    }

    // Include memory bank for deep personalization
    let memoryContext = "";
    if (memoryBank.length > 0) {
      memoryContext = "\n═══ USER MEMORY (past observations & preferences) ═══\n\n";
      memoryBank.forEach((m: any) => {
        memoryContext += `• ${m.memory_key}: ${m.memory_value}\n`;
      });
      memoryContext += "\n";
    }

    const userPrompt = `Based on this user's data and the reasoning engine analysis, generate ONE dominant insight:\n\n${promptContext}${pastBriefingsContext}${memoryContext}`;

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
        max_tokens: 1200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[generate-yves-intelligence] AI API error for user ${userId}:`, {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        error: errorText
      });
      
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

    console.log(`[generate-yves-intelligence] AI response received for user ${userId}, content length: ${content?.length || 0}`);

    if (!content) {
      console.error(`[generate-yves-intelligence] AI returned no content for user ${userId}`);
      return new Response(
        JSON.stringify({ success: false, error: "AI returned no content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from AI response
    let intelligenceData: YvesIntelligenceOutput;
    try {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      // Fix common AI JSON issues: unescaped newlines in string values
      content = content.replace(/(?<=":[ ]*"[^"]*)\n(?=[^"]*")/g, ' ');
      intelligenceData = JSON.parse(content);
      console.log(`[generate-yves-intelligence] Successfully parsed AI response for user ${userId}`);
      
      // Extract todaysFocus from summary if not provided
      if (!intelligenceData.dailyBriefing.todaysFocus) {
        const focusMatch = intelligenceData.dailyBriefing.summary.match(/🎯\s*Today's Focus:\s*(.+?)(?:\n|$)/i);
        if (focusMatch) {
          intelligenceData.dailyBriefing.todaysFocus = focusMatch[1].trim();
          intelligenceData.dailyBriefing.summary = intelligenceData.dailyBriefing.summary
            .replace(/🎯\s*Today's Focus:\s*.+?(?:\n|$)/i, '')
            .trim();
        }
      }

      // Filter recommendations by adherence (suppress low-adherence categories)
      const suppressCategories = adherenceRanking?.suppress_low_adherence || [];
      if (suppressCategories.length > 0) {
        intelligenceData.recommendations = intelligenceData.recommendations.filter(
          rec => !suppressCategories.includes(rec.category)
        );
      }

      // Apply focus mode filtering and prioritization
      intelligenceData.recommendations = filterRecommendationsByFocus(
        intelligenceData.recommendations,
        focusMode!
      );

      // Limit to max 3 recommendations
      intelligenceData.recommendations = intelligenceData.recommendations.slice(0, 3);

    } catch (parseError) {
      console.error(`[generate-yves-intelligence] JSON parse error:`, parseError, content);
      
      intelligenceData = {
        dailyBriefing: {
          summary: "I'm analyzing your data. Check back soon for personalized insights.",
          keyChanges: [],
          riskHighlights: [],
          todaysFocus: "Continue your regular routine",
        },
        recommendations: []
      };
    }

    // Create readable briefing content
    const briefingContent = `${intelligenceData.dailyBriefing.summary}\n\n` +
      (intelligenceData.dailyBriefing.keyChanges.length > 0 
        ? `📊 Key Changes:\n${intelligenceData.dailyBriefing.keyChanges.map(c => `• ${c}`).join('\n')}\n\n` 
        : '') +
      (intelligenceData.dailyBriefing.riskHighlights.length > 0 
        ? `⚠️ Attention:\n${intelligenceData.dailyBriefing.riskHighlights.map(r => `• ${r}`).join('\n')}` 
        : '');

    // ─── SAVE TO DATABASE WITH REASONING CONTEXT ────────────────────────────
    const generationId = crypto.randomUUID();
    console.log(`[generate-yves-intelligence] Saving briefing to database for user ${userId}, date: ${today}, category: unified, focus_mode: ${focusMode}, generation_id: ${generationId}`);

    const briefingRow = {
      user_id: userId,
      date: today,
      content: briefingContent.trim(),
      context_used: {
        ...intelligenceData,
        reasoning: reasoningContext,
        coaching_mode,
        novelty_note: (intelligenceData as any).novelty_note || null,
        facts_pack: factsPack,
        creative_framing: creativePack,
        personal_profile_card: profileCard,
      },
      category: "unified",
      focus_mode: focusMode,
      focus_context: {
        mode: focusMode,
        emphasis: focusModeContext.topicEmphasis,
        applied_at: new Date().toISOString()
      },
      generation_id: generationId,
      refresh_nonce: refreshNonce,
    };

    // On force_refresh, always INSERT a new row (never upsert/overwrite)
    const { data: savedBriefing, error: saveError } = forceRefresh
      ? await supabase.from("daily_briefings").insert(briefingRow).select()
      : await supabase.from("daily_briefings").upsert(briefingRow).select();

    if (saveError) {
      console.error(`[generate-yves-intelligence] Database save error for user ${userId}:`, saveError);
    } else {
      console.log(`[generate-yves-intelligence] Successfully saved briefing for user ${userId}`, savedBriefing);
    }

    // Save recommendations
    for (const rec of intelligenceData.recommendations) {
      await supabase.from("yves_recommendations").insert({
        user_id: userId,
        recommendation_text: rec.text,
        category: rec.category,
        priority: rec.priority,
        source: "unified-intelligence",
      });
    }

    console.log(`[generate-yves-intelligence] Intelligence generated for user ${userId} (confidence: ${reasoningContext.overall_confidence}%)`);

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        data: intelligenceData,
        content: briefingContent.trim(),
        created_at: new Date().toISOString(),
        focus_mode: focusMode,
        generation_id: generationId,
        refresh_nonce: refreshNonce,
        reasoning: {
          should_speak: true,
          confidence: reasoningContext.overall_confidence,
          justification: reasoningContext.justification,
          coaching_mode,
          focus_mode: focusMode,
          layers: {
            layer1: { pass: reasoningContext.layer1_physiological.pass, confidence: reasoningContext.layer1_physiological.confidence },
            layer2: { pass: reasoningContext.layer2_risk_trajectory.pass, confidence: reasoningContext.layer2_risk_trajectory.confidence },
            layer3: { pass: reasoningContext.layer3_behavior_psychology.pass, confidence: reasoningContext.layer3_behavior_psychology.confidence },
            layer4: { pass: reasoningContext.layer4_interests_adherence.pass, confidence: reasoningContext.layer4_interests_adherence.confidence },
          }
        }
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
