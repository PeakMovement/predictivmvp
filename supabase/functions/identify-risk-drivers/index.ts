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

interface CorrectiveAction {
  strategy: string;
  instruction: string;
  intensity: 'rest' | 'light' | 'moderate' | 'normal';
  volumeAdjustment?: string;
  focusArea?: string;
  recommendedActivity?: string;
  avoidActivities?: string[];
}

interface UserProfile {
  preferredActivities?: string[];
  interests?: string[];
  injuries?: string[];
  injuryDetails?: Record<string, unknown>;
  trainingFrequency?: string;
  intensityPreference?: string;
}

interface RiskDriverResult {
  primary: RiskDriver | null;
  secondary: RiskDriver | null;
  explanation: string;
  riskLevel: 'low' | 'moderate' | 'high';
  allDrivers: RiskDriver[];
  correctiveAction: CorrectiveAction;
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
  // Cap strain at 2000 and monotony at 2.5 per architecture spec
  const cappedStrain = strain !== null ? Math.min(strain, 2000) : 0;
  const cappedMonotony = monotony !== null ? Math.min(monotony, 2.5) : 0;
  const strainContrib = (cappedStrain / 2000) * 50;
  const monotonyContrib = (cappedMonotony / 2.5) * 50;
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

function identifyRiskDrivers(metrics: RiskMetrics, thresholds: typeof THRESHOLDS = THRESHOLDS): RiskDriverResult {
  const allDrivers: RiskDriver[] = [];

  const fatigueIndex = metrics.fatigueIndex ?? calculateFatigueIndex(metrics.strain, metrics.monotony);
  const hrvDeviation = calculateHrvDeviation(metrics.hrvCurrent, metrics.hrvBaseline);

  // Evaluate ACWR
  if (metrics.acwr !== null) {
    const { severity, threshold, isElevated } = evaluateRiskFactor(metrics.acwr, thresholds.acwr);
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
    const { severity, threshold, isElevated } = evaluateRiskFactor(metrics.monotony, thresholds.monotony);
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
    const { severity, threshold, isElevated } = evaluateRiskFactor(metrics.strain, thresholds.strain);
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
    const { severity, threshold, isElevated } = evaluateRiskFactor(fatigueIndex, thresholds.fatigueIndex);
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
    const { severity, threshold, isElevated } = evaluateRiskFactor(hrvDeviation, thresholds.hrvDeviation);
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
    const { severity, threshold, isElevated } = evaluateRiskFactor(metrics.sleepScore, thresholds.sleepScore, true);
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

  const correctiveAction = generateCorrectiveAction(primary, secondary, riskLevel);

  return { primary, secondary, explanation, riskLevel, allDrivers, correctiveAction };
}

function generateCorrectiveAction(
  primary: RiskDriver | null,
  secondary: RiskDriver | null,
  riskLevel: 'low' | 'moderate' | 'high'
): CorrectiveAction {
  if (!primary || riskLevel === 'low') {
    return {
      strategy: "Continue as planned",
      instruction: "Your metrics support your current training approach. Proceed with today's planned session.",
      intensity: 'normal'
    };
  }

  const actionRules: Record<string, CorrectiveAction> = {
    monotony: {
      strategy: "Change training modality",
      instruction: "Switch to a different activity type today. If you normally run, try cycling or swimming.",
      intensity: 'moderate',
      focusArea: "Cross-training or alternative movement patterns"
    },
    acwr: {
      strategy: "Reduce training volume",
      instruction: "Cut today's planned volume by 20-40%. Shorten your session or reduce sets/reps.",
      intensity: 'moderate',
      volumeAdjustment: "Reduce 20-40%",
      focusArea: "Technique and quality over quantity"
    },
    fatigue: {
      strategy: "Active recovery session",
      instruction: "Replace your planned workout with gentle movement: walking, stretching, or yoga.",
      intensity: 'light',
      focusArea: "Mobility and nervous system restoration"
    },
    strain: {
      strategy: "Reduce training load",
      instruction: "Lower both intensity and volume today. Focus on movement quality.",
      intensity: 'light',
      volumeAdjustment: "Reduce 30-50%",
      focusArea: "Deload and recovery"
    },
    sleep: {
      strategy: "Low intensity session",
      instruction: "Keep today's session short and easy. Avoid high-intensity efforts.",
      intensity: 'light',
      focusArea: "Gentle movement and early finish"
    },
    hrv: {
      strategy: "Prioritize recovery",
      instruction: "Choose restorative activities: gentle yoga, meditation, or light walking.",
      intensity: 'light',
      focusArea: "Parasympathetic activation"
    },
    symptoms: {
      strategy: "Offload affected area",
      instruction: "Avoid loading the symptomatic area. Choose alternative movements.",
      intensity: 'moderate',
      focusArea: "Alternative movement patterns, protect affected area"
    }
  };

  let action = actionRules[primary.id] || {
    strategy: "Modify training approach",
    instruction: "Adjust today's session based on your body's signals.",
    intensity: 'moderate' as const
  };

  if (riskLevel === 'high') {
    if (action.intensity === 'moderate') {
      action = { ...action, intensity: 'light', instruction: action.instruction + " Given elevated risk, err on the side of less today." };
    } else if (action.intensity === 'light') {
      action = { ...action, intensity: 'rest', instruction: "Consider taking today as a complete rest day." };
    }
  }

  return action;
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

// Activity categories for matching user preferences
const ACTIVITY_CATEGORIES: Record<string, string[]> = {
  cardio: ['running', 'cycling', 'swimming', 'rowing', 'elliptical', 'walking', 'hiking'],
  strength: ['weightlifting', 'resistance training', 'powerlifting', 'crossfit'],
  flexibility: ['yoga', 'pilates', 'stretching', 'mobility work', 'tai chi'],
  recovery: ['walking', 'light yoga', 'stretching', 'swimming', 'foam rolling'],
  lowImpact: ['cycling', 'swimming', 'elliptical', 'rowing', 'yoga', 'pilates']
};

// Body parts affected by different activities
const ACTIVITY_BODY_IMPACT: Record<string, string[]> = {
  running: ['knee', 'ankle', 'hip', 'lower back', 'shin', 'foot'],
  cycling: ['knee', 'hip', 'lower back'],
  swimming: ['shoulder', 'neck'],
  weightlifting: ['shoulder', 'back', 'wrist', 'elbow'],
  yoga: [],
  walking: ['ankle', 'foot'],
  rowing: ['back', 'shoulder', 'wrist'],
  tennis: ['shoulder', 'elbow', 'wrist', 'knee'],
  basketball: ['knee', 'ankle'],
  soccer: ['knee', 'ankle', 'hip'],
  pilates: [],
  stretching: []
};

function findSafeActivities(injuries: string[], allActivities: string[]): string[] {
  const injuryLower = injuries.map(i => i.toLowerCase());
  
  return allActivities.filter(activity => {
    const activityLower = activity.toLowerCase();
    const impactedAreas = Object.entries(ACTIVITY_BODY_IMPACT)
      .find(([key]) => activityLower.includes(key.toLowerCase()))?.[1] || [];
    
    return !impactedAreas.some(area => 
      injuryLower.some(injury => injury.includes(area) || area.includes(injury))
    );
  });
}

function personalizeCorrectiveAction(
  baseAction: CorrectiveAction,
  userProfile: UserProfile,
  symptoms: Array<{ type: string; severity: string }>
): CorrectiveAction {
  const preferred = userProfile.preferredActivities || [];
  const interests = userProfile.interests || [];
  const injuries = userProfile.injuries || [];
  const allPreferred = [...new Set([...preferred, ...interests])];
  
  const symptomLocations = symptoms.map(s => s.type.toLowerCase());
  const areasToAvoid = [...injuries.map(i => i.toLowerCase()), ...symptomLocations];
  
  // Find activities to avoid
  const avoidActivities: string[] = [];
  if (areasToAvoid.length > 0) {
    Object.entries(ACTIVITY_BODY_IMPACT).forEach(([activity, bodyParts]) => {
      if (bodyParts.some(part => areasToAvoid.some(area => 
        area.includes(part) || part.includes(area)
      ))) {
        avoidActivities.push(activity);
      }
    });
  }
  
  let recommendedActivity = '';
  
  switch (baseAction.strategy) {
    case 'Change training modality':
      const safePreferred = findSafeActivities(areasToAvoid, allPreferred);
      if (safePreferred.length > 0) {
        const lowImpactMatch = safePreferred.find(a => 
          ACTIVITY_CATEGORIES.lowImpact.some(li => a.toLowerCase().includes(li))
        );
        recommendedActivity = lowImpactMatch || safePreferred[0];
      } else {
        recommendedActivity = findSafeActivities(areasToAvoid, ACTIVITY_CATEGORIES.lowImpact)[0] || 'light walking';
      }
      break;
      
    case 'Active recovery session':
    case 'Prioritize recovery':
      const recoveryOptions = ACTIVITY_CATEGORIES.recovery;
      const preferredRecovery = allPreferred.find(p => 
        recoveryOptions.some(r => p.toLowerCase().includes(r))
      );
      const safeRecovery = findSafeActivities(areasToAvoid, recoveryOptions);
      recommendedActivity = preferredRecovery || safeRecovery[0] || 'gentle walking';
      break;
      
    case 'Low intensity session':
      const userLowImpact = allPreferred.filter(p =>
        ACTIVITY_CATEGORIES.lowImpact.some(li => p.toLowerCase().includes(li))
      );
      const safeLowImpact = findSafeActivities(areasToAvoid, userLowImpact);
      if (safeLowImpact.length > 0) {
        recommendedActivity = `Easy ${safeLowImpact[0].toLowerCase()}`;
      } else if (allPreferred.some(p => p.toLowerCase().includes('cycling'))) {
        recommendedActivity = 'Easy cycling session';
      } else {
        recommendedActivity = 'Light walking or easy movement';
      }
      break;
      
    case 'Reduce training volume':
    case 'Reduce training load':
      if (allPreferred.length > 0) {
        const safeActivity = findSafeActivities(areasToAvoid, allPreferred)[0];
        if (safeActivity) {
          recommendedActivity = `Reduced ${safeActivity.toLowerCase()} session`;
        }
      }
      break;
      
    case 'Offload affected area':
      const safeOptions = findSafeActivities(areasToAvoid, allPreferred);
      if (safeOptions.length > 0) {
        recommendedActivity = safeOptions[0];
      } else {
        const safeFallbacks = findSafeActivities(areasToAvoid, ['walking', 'swimming', 'cycling', 'yoga']);
        recommendedActivity = safeFallbacks[0] || 'Upper body work only';
      }
      break;
  }
  
  let instruction = baseAction.instruction;
  if (recommendedActivity) {
    instruction += ` Based on your preferences, try: ${recommendedActivity}.`;
  }
  if (avoidActivities.length > 0) {
    instruction += ` Avoid: ${[...new Set(avoidActivities)].slice(0, 3).join(', ')}.`;
  }
  
  return {
    ...baseAction,
    instruction,
    recommendedActivity: recommendedActivity || undefined,
    avoidActivities: [...new Set(avoidActivities)]
  };
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

    // Fetch all required data in parallel (including user profile for personalization)
    const [
      trainingTrendsResult,
      recoveryTrendsResult,
      wearableSessionsResult,
      userBaselinesResult,
      symptomCheckInsResult,
      userTrainingResult,
      userInterestsResult,
      userInjuriesResult,
      alertSettingsResult
    ] = await Promise.all([
      supabase.from("training_trends").select("*").eq("user_id", userId).gte("date", sevenDaysAgoStr).order("date", { ascending: false }).limit(7),
      supabase.from("recovery_trends").select("*").eq("user_id", userId).gte("period_date", sevenDaysAgoStr).order("period_date", { ascending: false }).limit(7),
      supabase.from("wearable_sessions").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(7),
      supabase.from("user_baselines").select("*").eq("user_id", userId),
      supabase.from("symptom_check_ins").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      supabase.from("user_training").select("preferred_activities, training_frequency, intensity_preference").eq("user_id", userId).maybeSingle(),
      supabase.from("user_interests").select("interests, hobbies").eq("user_id", userId).maybeSingle(),
      supabase.from("user_injuries").select("injuries, injury_details").eq("user_id", userId).maybeSingle(),
      supabase.from("alert_settings").select("*").eq("user_id", userId).maybeSingle()
    ]);

    const trainingTrends = trainingTrendsResult.data || [];
    const recoveryTrends = recoveryTrendsResult.data || [];
    const wearableSessions = wearableSessionsResult.data || [];
    const userBaselines = userBaselinesResult.data || [];
    const symptomCheckIns = symptomCheckInsResult.data || [];
    const userTraining = userTrainingResult.data;
    const userInterests = userInterestsResult.data;
    const userInjuries = userInjuriesResult.data;
    const alertSettings = alertSettingsResult.data;

    // FIX 3: Build effective thresholds — start from hardcoded defaults, override with user's alert_settings
    const effectiveThresholds: typeof THRESHOLDS = {
      acwr: {
        critical: alertSettings?.acwr_critical_threshold ?? THRESHOLDS.acwr.critical,
        elevated: THRESHOLDS.acwr.elevated,
        optimal_low: THRESHOLDS.acwr.optimal_low,
        optimal_high: THRESHOLDS.acwr.optimal_high,
      },
      monotony: {
        critical: alertSettings?.monotony_critical_threshold ?? THRESHOLDS.monotony.critical,
        elevated: THRESHOLDS.monotony.elevated,
        moderate: THRESHOLDS.monotony.moderate,
      },
      strain: {
        critical: alertSettings?.strain_critical_threshold ?? THRESHOLDS.strain.critical,
        elevated: THRESHOLDS.strain.elevated,
        moderate: THRESHOLDS.strain.moderate,
      },
      fatigueIndex: THRESHOLDS.fatigueIndex,
      hrvDeviation: {
        critical: alertSettings?.hrv_drop_threshold ?? THRESHOLDS.hrvDeviation.critical,
        elevated: THRESHOLDS.hrvDeviation.elevated,
        moderate: THRESHOLDS.hrvDeviation.moderate,
      },
      sleepScore: {
        critical: alertSettings?.sleep_score_threshold ?? THRESHOLDS.sleepScore.critical,
        elevated: THRESHOLDS.sleepScore.elevated,
        moderate: THRESHOLDS.sleepScore.moderate,
      },
    };

    // Build user profile for personalization
    const userProfile: UserProfile = {
      preferredActivities: userTraining?.preferred_activities || [],
      interests: [...(userInterests?.interests || []), ...(userInterests?.hobbies || [])],
      injuries: userInjuries?.injuries || [],
      injuryDetails: userInjuries?.injury_details as Record<string, unknown> | undefined,
      trainingFrequency: userTraining?.training_frequency || undefined,
      intensityPreference: userTraining?.intensity_preference || undefined
    };

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

    const result = identifyRiskDrivers(riskMetrics, effectiveThresholds);
    
    // Apply personalization to corrective action
    if (userProfile.preferredActivities?.length || userProfile.interests?.length || userProfile.injuries?.length) {
      const personalizedAction = personalizeCorrectiveAction(
        result.correctiveAction,
        userProfile,
        symptomCheckIns.map(s => ({ type: s.symptom_type, severity: s.severity }))
      );
      result.correctiveAction = personalizedAction;
    }


    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        metrics: riskMetrics,
        userProfile: {
          hasPreferences: (userProfile.preferredActivities?.length || 0) > 0,
          hasInjuries: (userProfile.injuries?.length || 0) > 0
        }
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
