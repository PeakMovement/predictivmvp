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
    try {
      const body = await req.json() as YvesIntelligenceRequest;
      userId = body.user_id || null;
      focusMode = body.focus_mode || null;
      forceRefresh = body.force_refresh || false;
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

    // Check for cached intelligence with matching focus mode
    const { data: existingIntelligence } = await supabase
      .from("daily_briefings")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .eq("category", "unified")
      .eq("focus_mode", focusMode)
      .maybeSingle();

    // Check if we should use cache
    if (!forceRefresh && existingIntelligence && existingIntelligence.context_used) {
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
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        console.log(`[generate-yves-intelligence] Cache expired for user ${userId} (age: ${Math.round(cacheAge / 1000 / 60)} minutes), regenerating`);
      }
    } else if (forceRefresh) {
      console.log(`[generate-yves-intelligence] Force refresh requested for user ${userId}, bypassing cache`);
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
    ] = await Promise.all([
      supabase.from("user_documents").select("document_type, file_name, parsed_content, ai_summary, tags").eq("user_id", userId).eq("processing_status", "completed").order("uploaded_at", { ascending: false }).limit(10),
      supabase.from("yves_memory_bank").select("memory_key, memory_value").eq("user_id", userId),
      supabase.from("yves_recommendations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("user_adaptation_profile").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("risk_trajectories").select("*").eq("user_id", userId).order("calculation_date", { ascending: false }).limit(5),
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
    const adaptationProfile = adaptationProfileResult.data;
    const riskTrajectories = riskTrajectoriesResult.data || [];

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
      await supabase.from("daily_briefings").upsert({
        user_id: userId,
        date: today,
        content: silentResponse.dailyBriefing.summary,
        context_used: { 
          ...silentResponse, 
          reasoning: reasoningContext,
          silent: true 
        },
        category: "unified",
      });

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

    // Current health state
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
      
      if (latestSession.hrv_avg !== null) {
        promptContext += `• HRV: ${latestSession.hrv_avg}ms\n`;
      }
      
      if (latestSession.resting_hr !== null) {
        promptContext += `• Resting HR: ${latestSession.resting_hr}bpm\n`;
      }
      promptContext += "\n";
    }

    // Training trends
    if (trainingTrends.length > 0) {
      const latestTrend = trainingTrends[0];
      promptContext += "═══ TRAINING STATUS ═══\n\n";
      
      if (latestTrend.acwr !== null) {
        promptContext += `ACWR: ${latestTrend.acwr.toFixed(2)}`;
        if (latestTrend.acwr > 1.5) promptContext += " ⚠️ HIGH RISK\n";
        else if (latestTrend.acwr > 1.3) promptContext += " ⚠️ ELEVATED\n";
        else if (latestTrend.acwr < 0.8) promptContext += " ℹ️ CAN INCREASE\n";
        else promptContext += " ✓ OPTIMAL\n";
      }
      if (latestTrend.monotony !== null && latestTrend.monotony > 2.0) {
        promptContext += `Monotony: ${latestTrend.monotony.toFixed(2)} ⚠️ HIGH - needs variety\n`;
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

═══ CRITICAL RULES ═══
1. Always provide meaningful, personalized content - never be generic
2. Even on stable days, find patterns worth acknowledging or celebrating
3. Recommendations must align with the JUSTIFICATION provided by the reasoning engine
4. Do NOT recommend categories marked as "suppress" (low adherence)
5. DO prioritize categories marked as high adherence
6. Connect observations to the user's specific context, goals, and recent patterns

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
  ]
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

    const userPrompt = `Based on this user's data and the reasoning engine analysis, generate ONE dominant insight:\n\n${promptContext}`;

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
        max_tokens: 800,
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
    console.log(`[generate-yves-intelligence] Saving briefing to database for user ${userId}, date: ${today}, category: unified, focus_mode: ${focusMode}`);

    const { data: savedBriefing, error: saveError } = await supabase.from("daily_briefings").upsert({
      user_id: userId,
      date: today,
      content: briefingContent.trim(),
      context_used: {
        ...intelligenceData,
        reasoning: reasoningContext,
        coaching_mode
      },
      category: "unified",
      focus_mode: focusMode,
      focus_context: {
        mode: focusMode,
        emphasis: focusModeContext.topicEmphasis,
        applied_at: new Date().toISOString()
      }
    }).select();

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
