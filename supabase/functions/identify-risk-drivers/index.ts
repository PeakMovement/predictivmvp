import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RiskMetrics {
  acwr: number | null;
  monotony: number | null;
  strain: number | null;
  hrvCurrent: number | null;
  hrvBaseline: number | null;
  sleepScore: number | null;
  fatigueIndex?: number | null;
  symptoms: Array<{ type: string; severity: string; createdAt: Date | string }>;
}

interface RiskDriver {
  id: string;
  label: string;
  severity: number;
  value: number | null;
  threshold: number;
  explanation: string;
  category: 'training_load' | 'recovery' | 'physiological' | 'symptoms';
}

interface RiskDriverResult {
  primary: RiskDriver | null;
  secondary: RiskDriver | null;
  explanation: string;
  riskLevel: 'low' | 'moderate' | 'high';
  allDrivers: RiskDriver[];
}

// Thresholds for each risk factor
const THRESHOLDS = {
  acwr: { critical: 1.5, elevated: 1.3, optimal_low: 0.8, optimal_high: 1.3 },
  monotony: { critical: 2.5, elevated: 2.0, moderate: 1.5 },
  strain: { critical: 3500, elevated: 2500, moderate: 1500 },
  fatigueIndex: { critical: 80, elevated: 70, moderate: 50 },
  hrvDeviation: { critical: 30, elevated: 20, moderate: 10 },
  sleepScore: { critical: 50, elevated: 60, moderate: 70 }
};

function calculateFatigueIndex(strain: number | null, monotony: number | null): number | null {
  if (strain === null && monotony === null) return null;
  const strainContrib = strain !== null ? (strain / 200) * 50 : 0;
  const monotonyContrib = monotony !== null ? (monotony / 3) * 50 : 0;
  return Math.min(Math.round(strainContrib + monotonyContrib), 100);
}

function calculateHrvDeviation(current: number | null, baseline: number | null): number | null {
  if (current === null || baseline === null || baseline === 0) return null;
  return Math.round(((baseline - current) / baseline) * 100);
}

function evaluateRiskFactor(
  value: number | null,
  thresholds: { critical: number; elevated: number; moderate?: number },
  isInverted: boolean = false
): { severity: number; threshold: number; isElevated: boolean } {
  if (value === null) {
    return { severity: 0, threshold: thresholds.critical, isElevated: false };
  }

  let severity = 0;
  let threshold = thresholds.moderate || thresholds.elevated;
  let isElevated = false;

  if (isInverted) {
    if (value <= thresholds.critical) {
      severity = 90;
      threshold = thresholds.critical;
      isElevated = true;
    } else if (value <= thresholds.elevated) {
      severity = 65;
      threshold = thresholds.elevated;
      isElevated = true;
    } else if (thresholds.moderate && value <= thresholds.moderate) {
      severity = 35;
      threshold = thresholds.moderate;
      isElevated = true;
    }
  } else {
    if (value >= thresholds.critical) {
      severity = 90;
      threshold = thresholds.critical;
      isElevated = true;
    } else if (value >= thresholds.elevated) {
      severity = 65;
      threshold = thresholds.elevated;
      isElevated = true;
    } else if (thresholds.moderate && value >= thresholds.moderate) {
      severity = 35;
      threshold = thresholds.moderate;
      isElevated = true;
    }
  }

  return { severity, threshold, isElevated };
}

function identifyRiskDrivers(metrics: RiskMetrics): RiskDriverResult {
  const allDrivers: RiskDriver[] = [];
  
  const fatigueIndex = metrics.fatigueIndex ?? calculateFatigueIndex(metrics.strain, metrics.monotony);
  const hrvDeviation = calculateHrvDeviation(metrics.hrvCurrent, metrics.hrvBaseline);

  // Evaluate ACWR
  if (metrics.acwr !== null) {
    const { severity, threshold, isElevated } = evaluateRiskFactor(metrics.acwr, THRESHOLDS.acwr);
    if (isElevated) {
      allDrivers.push({
        id: 'acwr',
        label: 'Elevated ACWR',
        severity,
        value: metrics.acwr,
        threshold,
        explanation: `Training load ratio at ${metrics.acwr.toFixed(2)} exceeds safe threshold (${threshold})`,
        category: 'training_load'
      });
    }
  }

  // Evaluate Monotony
  if (metrics.monotony !== null) {
    const { severity, threshold, isElevated } = evaluateRiskFactor(metrics.monotony, THRESHOLDS.monotony);
    if (isElevated) {
      allDrivers.push({
        id: 'monotony',
        label: 'High training monotony',
        severity,
        value: metrics.monotony,
        threshold,
        explanation: `Training variation score of ${metrics.monotony.toFixed(1)} exceeds safe threshold (${threshold})`,
        category: 'training_load'
      });
    }
  }

  // Evaluate Strain
  if (metrics.strain !== null) {
    const { severity, threshold, isElevated } = evaluateRiskFactor(metrics.strain, THRESHOLDS.strain);
    if (isElevated) {
      allDrivers.push({
        id: 'strain',
        label: 'High accumulated strain',
        severity,
        value: metrics.strain,
        threshold,
        explanation: `Weekly strain at ${Math.round(metrics.strain)} exceeds recovery capacity (${threshold})`,
        category: 'training_load'
      });
    }
  }

  // Evaluate Fatigue Index
  if (fatigueIndex !== null) {
    const { severity, threshold, isElevated } = evaluateRiskFactor(fatigueIndex, THRESHOLDS.fatigueIndex);
    if (isElevated) {
      allDrivers.push({
        id: 'fatigue',
        label: 'Elevated fatigue',
        severity,
        value: fatigueIndex,
        threshold,
        explanation: `Fatigue index at ${fatigueIndex}% from accumulated strain`,
        category: 'recovery'
      });
    }
  }

  // Evaluate HRV Deviation
  if (hrvDeviation !== null) {
    const { severity, threshold, isElevated } = evaluateRiskFactor(hrvDeviation, THRESHOLDS.hrvDeviation);
    if (isElevated) {
      allDrivers.push({
        id: 'hrv',
        label: 'Suppressed HRV',
        severity,
        value: hrvDeviation,
        threshold,
        explanation: `HRV ${hrvDeviation}% below baseline indicates autonomic stress`,
        category: 'physiological'
      });
    }
  }

  // Evaluate Sleep Score
  if (metrics.sleepScore !== null) {
    const { severity, threshold, isElevated } = evaluateRiskFactor(metrics.sleepScore, THRESHOLDS.sleepScore, true);
    if (isElevated) {
      allDrivers.push({
        id: 'sleep',
        label: 'Poor sleep quality',
        severity,
        value: metrics.sleepScore,
        threshold,
        explanation: `Sleep score of ${metrics.sleepScore} below recovery threshold (${threshold})`,
        category: 'recovery'
      });
    }
  }

  // Evaluate Symptoms
  const recentSymptoms = metrics.symptoms.filter(s => {
    const symptomDate = new Date(s.createdAt);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return symptomDate >= threeDaysAgo;
  });

  const severeSymptoms = recentSymptoms.filter(s => s.severity === 'severe' || s.severity === 'high');
  const moderateSymptoms = recentSymptoms.filter(s => s.severity === 'moderate');

  if (severeSymptoms.length > 0) {
    allDrivers.push({
      id: 'symptoms',
      label: 'Recent symptoms reported',
      severity: 75,
      value: severeSymptoms.length,
      threshold: 1,
      explanation: `${severeSymptoms.length} severe symptom(s) reported: ${severeSymptoms.map(s => s.type).join(', ')}`,
      category: 'symptoms'
    });
  } else if (moderateSymptoms.length > 0) {
    allDrivers.push({
      id: 'symptoms',
      label: 'Recent symptoms reported',
      severity: 45,
      value: moderateSymptoms.length,
      threshold: 1,
      explanation: `${moderateSymptoms.length} moderate symptom(s) reported`,
      category: 'symptoms'
    });
  }

  allDrivers.sort((a, b) => b.severity - a.severity);

  const primary = allDrivers[0] || null;
  const secondary = allDrivers[1] || null;
  const explanation = generateRiskExplanation(primary, secondary);

  let riskLevel: 'low' | 'moderate' | 'high' = 'low';
  if (primary) {
    if (primary.severity >= 80 || (primary.severity >= 60 && secondary && secondary.severity >= 50)) {
      riskLevel = 'high';
    } else if (primary.severity >= 50 || allDrivers.length >= 2) {
      riskLevel = 'moderate';
    }
  }

  return { primary, secondary, explanation, riskLevel, allDrivers };
}

function generateRiskExplanation(primary: RiskDriver | null, secondary: RiskDriver | null): string {
  if (!primary) {
    return "No significant risk factors detected. Continue with your current training approach.";
  }

  const explanationTemplates: Record<string, Record<string, string>> = {
    monotony: {
      fatigue: "Repeating similar training patterns with limited recovery",
      hrv: "Repetitive training causing autonomic stress",
      sleep: "Training monotony compounded by poor sleep recovery",
      strain: "High repetition with excessive load accumulation",
      symptoms: "Repetitive training patterns correlating with reported symptoms",
      acwr: "Monotonous training with workload imbalance",
      default: "Training patterns lack sufficient variety for optimal adaptation"
    },
    acwr: {
      fatigue: "Training load exceeds recovery capacity, causing accumulated fatigue",
      hrv: "Training load exceeds readiness, stress response elevated",
      sleep: "Workload imbalance combined with insufficient sleep recovery",
      monotony: "Excessive load with repetitive training patterns",
      symptoms: "High training load correlating with reported symptoms",
      strain: "Acute workload significantly exceeds chronic baseline",
      default: "Training load ratio indicates elevated injury risk"
    },
    fatigue: {
      sleep: "Accumulated fatigue from insufficient sleep recovery",
      hrv: "Fatigue accumulation affecting autonomic balance",
      monotony: "Fatigue from repetitive training without variation",
      acwr: "Fatigue from sustained high training loads",
      symptoms: "Elevated fatigue correlating with physical symptoms",
      strain: "High fatigue from excessive weekly strain",
      default: "Accumulated fatigue requires additional recovery focus"
    },
    hrv: {
      sleep: "Autonomic stress compounded by poor sleep quality",
      fatigue: "Suppressed HRV indicating incomplete recovery",
      symptoms: "Physiological stress compounding with reported symptoms",
      acwr: "Autonomic stress from training load imbalance",
      monotony: "HRV suppression from repetitive training stress",
      strain: "Autonomic stress from high training strain",
      default: "Heart rate variability indicates elevated stress state"
    },
    sleep: {
      fatigue: "Poor sleep accelerating fatigue accumulation",
      hrv: "Sleep deficit affecting autonomic recovery",
      acwr: "Insufficient sleep recovery for current training load",
      monotony: "Sleep quality suffering from training patterns",
      symptoms: "Poor sleep correlating with reported symptoms",
      strain: "Sleep insufficient to recover from training strain",
      default: "Sleep quality limiting recovery and adaptation"
    },
    symptoms: {
      fatigue: "Reported symptoms with underlying fatigue",
      hrv: "Symptoms correlating with physiological stress markers",
      sleep: "Symptoms potentially linked to poor sleep recovery",
      acwr: "Symptoms appearing during high training load period",
      monotony: "Symptoms from repetitive stress patterns",
      strain: "Symptoms correlating with high training strain",
      default: "Recent symptoms warrant training modification"
    },
    strain: {
      fatigue: "High weekly strain causing fatigue accumulation",
      monotony: "Excessive strain from repetitive high-load training",
      hrv: "Training strain affecting autonomic balance",
      sleep: "High strain outpacing sleep recovery capacity",
      acwr: "Strain contributing to workload imbalance",
      symptoms: "High strain correlating with physical symptoms",
      default: "Weekly training strain exceeds safe recovery capacity"
    }
  };

  const primaryId = primary.id;
  const secondaryId = secondary?.id || 'default';
  
  const primaryTemplates = explanationTemplates[primaryId] || {};
  return primaryTemplates[secondaryId] || primaryTemplates.default || `${primary.label} identified as primary concern`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body.user_id || null;
    } catch {
      // No body
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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    // Fetch all required data in parallel
    const [
      trainingTrendsResult,
      recoveryTrendsResult,
      wearableSessionsResult,
      userBaselinesResult,
      symptomCheckInsResult
    ] = await Promise.all([
      supabase.from("training_trends").select("*").eq("user_id", userId).gte("date", sevenDaysAgoStr).order("date", { ascending: false }).limit(7),
      supabase.from("recovery_trends").select("*").eq("user_id", userId).gte("period_date", sevenDaysAgoStr).order("period_date", { ascending: false }).limit(7),
      supabase.from("wearable_sessions").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("user_baselines").select("*").eq("user_id", userId),
      supabase.from("symptom_check_ins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10)
    ]);

    const trainingTrends = trainingTrendsResult.data || [];
    const recoveryTrends = recoveryTrendsResult.data || [];
    const wearableSessions = wearableSessionsResult.data || [];
    const userBaselines = userBaselinesResult.data || [];
    const symptomCheckIns = symptomCheckInsResult.data || [];

    // Extract metrics from latest data
    const latestTraining = trainingTrends[0];
    const latestRecovery = recoveryTrends[0];
    const latestSession = wearableSessions[0];
    
    // Get HRV baseline
    const hrvBaseline = userBaselines.find(b => b.metric === 'hrv')?.rolling_avg || null;
    
    // Calculate averages for strain (weekly)
    const weeklyStrain = trainingTrends.reduce((sum, t) => sum + (t.strain || 0), 0);

    const riskMetrics: RiskMetrics = {
      acwr: latestRecovery?.acwr ?? latestTraining?.acwr ?? null,
      monotony: latestRecovery?.monotony ?? latestTraining?.monotony ?? null,
      strain: weeklyStrain || latestRecovery?.strain || null,
      hrvCurrent: latestSession?.hrv_avg ?? null,
      hrvBaseline: hrvBaseline,
      sleepScore: latestSession?.sleep_score ?? null,
      symptoms: symptomCheckIns.map(s => ({
        type: s.symptom_type,
        severity: s.severity,
        createdAt: s.created_at
      }))
    };

    const result = identifyRiskDrivers(riskMetrics);

    console.log(`[identify-risk-drivers] User ${userId}: Primary=${result.primary?.id || 'none'}, Secondary=${result.secondary?.id || 'none'}, Level=${result.riskLevel}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        metrics: riskMetrics
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[identify-risk-drivers] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
