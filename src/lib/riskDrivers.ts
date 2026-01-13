/**
 * Risk Driver Identification Engine
 * Analyzes multiple factors to identify primary and secondary risk drivers
 * Used by both frontend (useTodaysDecision) and backend (generate-yves-intelligence)
 */

export interface RiskMetrics {
  acwr: number | null;
  monotony: number | null;
  strain: number | null;
  hrvCurrent: number | null;
  hrvBaseline: number | null;
  sleepScore: number | null;
  fatigueIndex?: number | null;
  symptoms: Array<{ type: string; severity: string; createdAt: Date | string }>;
}

export interface RiskDriver {
  id: string;
  label: string;
  severity: number; // 0-100
  value: number | null;
  threshold: number;
  explanation: string;
  category: 'training_load' | 'recovery' | 'physiological' | 'symptoms';
}

export interface CorrectiveAction {
  strategy: string;
  instruction: string;
  intensity: 'rest' | 'light' | 'moderate' | 'normal';
  volumeAdjustment?: string; // e.g., "Reduce 20-40%"
  focusArea?: string; // e.g., "mobility", "technique", "cardio"
  recommendedActivity?: string; // Personalized activity recommendation
  avoidActivities?: string[]; // Activities to avoid based on injuries
}

export interface UserProfile {
  preferredActivities?: string[];
  interests?: string[];
  injuries?: string[];
  injuryDetails?: Record<string, unknown>;
  equipmentAccess?: string[];
  trainingFrequency?: string;
  intensityPreference?: string;
}

export interface RiskDriverResult {
  primary: RiskDriver | null;
  secondary: RiskDriver | null;
  explanation: string;
  riskLevel: 'low' | 'moderate' | 'high';
  allDrivers: RiskDriver[];
  correctiveAction: CorrectiveAction;
}

// Thresholds for each risk factor
const THRESHOLDS = {
  acwr: {
    critical: 1.5,
    elevated: 1.3,
    optimal_low: 0.8,
    optimal_high: 1.3
  },
  monotony: {
    critical: 2.5,
    elevated: 2.0,
    moderate: 1.5
  },
  strain: {
    critical: 3500,
    elevated: 2500,
    moderate: 1500
  },
  fatigueIndex: {
    critical: 80,
    elevated: 70,
    moderate: 50
  },
  hrvDeviation: {
    critical: 30,
    elevated: 20,
    moderate: 10
  },
  sleepScore: {
    critical: 50,
    elevated: 60,
    moderate: 70
  }
};

/**
 * Calculate fatigue index from strain and monotony
 * Formula: (Strain / 200) × 50 + (Monotony / 3) × 50, capped at 100
 */
export function calculateFatigueIndex(strain: number | null, monotony: number | null): number | null {
  if (strain === null && monotony === null) return null;
  
  const strainContrib = strain !== null ? (strain / 200) * 50 : 0;
  const monotonyContrib = monotony !== null ? (monotony / 3) * 50 : 0;
  
  return Math.min(Math.round(strainContrib + monotonyContrib), 100);
}

/**
 * Calculate HRV deviation percentage
 */
export function calculateHrvDeviation(current: number | null, baseline: number | null): number | null {
  if (current === null || baseline === null || baseline === 0) return null;
  return Math.round(((baseline - current) / baseline) * 100);
}

/**
 * Evaluate a single risk factor and return its severity score
 */
function evaluateRiskFactor(
  id: string,
  value: number | null,
  thresholds: { critical: number; elevated: number; moderate?: number },
  isInverted: boolean = false // true for metrics where lower is worse (sleep, HRV)
): { severity: number; threshold: number; isElevated: boolean } {
  if (value === null) {
    return { severity: 0, threshold: thresholds.critical, isElevated: false };
  }

  let severity = 0;
  let threshold = thresholds.moderate || thresholds.elevated;
  let isElevated = false;

  if (isInverted) {
    // For metrics where lower is worse (sleep score)
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
    // For metrics where higher is worse (ACWR, monotony, strain)
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

/**
 * Main function to identify risk drivers from metrics
 */
export function identifyRiskDrivers(metrics: RiskMetrics): RiskDriverResult {
  const allDrivers: RiskDriver[] = [];
  
  // Calculate derived metrics
  const fatigueIndex = metrics.fatigueIndex ?? calculateFatigueIndex(metrics.strain, metrics.monotony);
  const hrvDeviation = calculateHrvDeviation(metrics.hrvCurrent, metrics.hrvBaseline);

  // Evaluate ACWR
  if (metrics.acwr !== null) {
    const { severity, threshold, isElevated } = evaluateRiskFactor(
      'acwr', metrics.acwr, THRESHOLDS.acwr
    );
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
    const { severity, threshold, isElevated } = evaluateRiskFactor(
      'monotony', metrics.monotony, THRESHOLDS.monotony
    );
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
    const { severity, threshold, isElevated } = evaluateRiskFactor(
      'strain', metrics.strain, THRESHOLDS.strain
    );
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
    const { severity, threshold, isElevated } = evaluateRiskFactor(
      'fatigue', fatigueIndex, THRESHOLDS.fatigueIndex
    );
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
    const { severity, threshold, isElevated } = evaluateRiskFactor(
      'hrv', hrvDeviation, THRESHOLDS.hrvDeviation
    );
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
    const { severity, threshold, isElevated } = evaluateRiskFactor(
      'sleep', metrics.sleepScore, THRESHOLDS.sleepScore, true // inverted
    );
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

  const severeSymptoms = recentSymptoms.filter(s => 
    s.severity === 'severe' || s.severity === 'high'
  );
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

  // Sort by severity (highest first)
  allDrivers.sort((a, b) => b.severity - a.severity);

  // Get primary and secondary drivers
  const primary = allDrivers[0] || null;
  const secondary = allDrivers[1] || null;

  // Generate explanation
  const explanation = generateRiskExplanation(primary, secondary);

  // Determine overall risk level
  let riskLevel: 'low' | 'moderate' | 'high' = 'low';
  if (primary) {
    if (primary.severity >= 80 || (primary.severity >= 60 && secondary && secondary.severity >= 50)) {
      riskLevel = 'high';
    } else if (primary.severity >= 50 || allDrivers.length >= 2) {
      riskLevel = 'moderate';
    }
  }

  // Generate corrective action based on risk drivers (without profile - call separately with profile for personalization)
  const correctiveAction = generateCorrectiveAction(primary, secondary, riskLevel);

  return {
    primary,
    secondary,
    explanation,
    riskLevel,
    allDrivers,
    correctiveAction
  };
}

/**
 * Generate human-readable explanation from risk drivers
 */
export function generateRiskExplanation(
  primary: RiskDriver | null,
  secondary: RiskDriver | null
): string {
  if (!primary) {
    return "No significant risk factors detected. Continue with your current training approach.";
  }

  // Explanation templates based on driver combinations
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
  const explanation = primaryTemplates[secondaryId] || primaryTemplates.default || 
    `${primary.label} identified as primary concern`;

  return explanation;
}

// Activity categories for matching user preferences
const ACTIVITY_CATEGORIES: Record<string, string[]> = {
  cardio: ['running', 'cycling', 'swimming', 'rowing', 'elliptical', 'walking', 'hiking', 'jogging'],
  strength: ['weightlifting', 'resistance training', 'powerlifting', 'bodybuilding', 'crossfit'],
  flexibility: ['yoga', 'pilates', 'stretching', 'mobility work', 'tai chi'],
  sport: ['tennis', 'basketball', 'soccer', 'football', 'volleyball', 'golf', 'martial arts'],
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

/**
 * Find safe alternative activities based on injury locations
 */
function findSafeActivities(injuries: string[], allActivities: string[]): string[] {
  const injuryLower = injuries.map(i => i.toLowerCase());
  
  return allActivities.filter(activity => {
    const activityLower = activity.toLowerCase();
    const impactedAreas = Object.entries(ACTIVITY_BODY_IMPACT)
      .find(([key]) => activityLower.includes(key.toLowerCase()))?.[1] || [];
    
    // Activity is safe if it doesn't impact any injured areas
    return !impactedAreas.some(area => 
      injuryLower.some(injury => injury.includes(area) || area.includes(injury))
    );
  });
}

/**
 * Match corrective strategy with user preferences
 */
function matchActivityToPreferences(
  strategy: string,
  userProfile: UserProfile,
  symptoms?: Array<{ type: string; severity: string }>
): { recommendedActivity: string; avoidActivities: string[] } {
  const preferred = userProfile.preferredActivities || [];
  const interests = userProfile.interests || [];
  const injuries = userProfile.injuries || [];
  const allPreferred = [...new Set([...preferred, ...interests])];
  
  // Determine what areas to avoid based on symptoms
  const symptomLocations = symptoms?.map(s => s.type.toLowerCase()) || [];
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
  
  // Strategy-specific activity matching
  let recommendedActivity = '';
  
  switch (strategy) {
    case 'Change training modality':
      // Find alternative from user preferences that's different from usual
      const safePreferred = findSafeActivities(areasToAvoid, allPreferred);
      if (safePreferred.length > 0) {
        // Pick a low-impact option if available
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
      // Match with preferred recovery activities
      const recoveryOptions = ACTIVITY_CATEGORIES.recovery;
      const preferredRecovery = allPreferred.find(p => 
        recoveryOptions.some(r => p.toLowerCase().includes(r))
      );
      const safeRecovery = findSafeActivities(areasToAvoid, recoveryOptions);
      recommendedActivity = preferredRecovery || safeRecovery[0] || 'gentle walking';
      break;
      
    case 'Low intensity session':
      // Find low-intensity version of preferred activities
      const userLowImpact = allPreferred.filter(p =>
        ACTIVITY_CATEGORIES.lowImpact.some(li => p.toLowerCase().includes(li))
      );
      const safeLowImpact = findSafeActivities(areasToAvoid, userLowImpact);
      if (safeLowImpact.length > 0) {
        recommendedActivity = `Easy ${safeLowImpact[0].toLowerCase()}`;
      } else if (allPreferred.some(p => p.toLowerCase().includes('cycling'))) {
        recommendedActivity = 'Easy cycling session';
      } else if (allPreferred.some(p => p.toLowerCase().includes('swim'))) {
        recommendedActivity = 'Easy swimming session';
      } else {
        recommendedActivity = 'Light walking or easy movement';
      }
      break;
      
    case 'Reduce training volume':
    case 'Reduce training load':
      // Suggest scaled version of preferred activity
      if (allPreferred.length > 0) {
        const safeActivity = findSafeActivities(areasToAvoid, allPreferred)[0];
        if (safeActivity) {
          recommendedActivity = `Reduced ${safeActivity.toLowerCase()} session`;
        }
      }
      break;
      
    case 'Offload affected area':
      // Find activities that don't load affected areas
      const safeOptions = findSafeActivities(areasToAvoid, allPreferred);
      if (safeOptions.length > 0) {
        recommendedActivity = safeOptions[0];
      } else {
        // Fallback to very safe options
        const safeFallbacks = findSafeActivities(areasToAvoid, ['walking', 'swimming', 'cycling', 'yoga']);
        recommendedActivity = safeFallbacks[0] || 'Upper body work only' ;
      }
      break;
      
    default:
      if (allPreferred.length > 0) {
        const safeDefault = findSafeActivities(areasToAvoid, allPreferred);
        recommendedActivity = safeDefault[0] || allPreferred[0];
      }
  }
  
  return { 
    recommendedActivity: recommendedActivity || 'Gentle movement of your choice',
    avoidActivities: [...new Set(avoidActivities)]
  };
}

/**
 * Decision Engine: Map risk drivers to corrective actions
 * Rules:
 * - Monotony high → Change training modality
 * - ACWR high → Reduce volume 20-40%
 * - Fatigue high → Active recovery
 * - Sleep low → Low intensity session
 * - Symptom logged → Offload affected area
 * 
 * Personalization:
 * - Match with preferred activities
 * - Avoid injury-affected modalities
 * - Consider equipment access
 */
export function generateCorrectiveAction(
  primary: RiskDriver | null,
  secondary: RiskDriver | null,
  riskLevel: 'low' | 'moderate' | 'high',
  userProfile?: UserProfile,
  symptoms?: Array<{ type: string; severity: string }>
): CorrectiveAction {
  // Default action when no significant risk
  if (!primary || riskLevel === 'low') {
    return {
      strategy: "Continue as planned",
      instruction: "Your metrics support your current training approach. Proceed with today's planned session.",
      intensity: 'normal',
      focusArea: undefined
    };
  }

  // Corrective action rules based on primary driver
  const actionRules: Record<string, CorrectiveAction> = {
    monotony: {
      strategy: "Change training modality",
      instruction: "Switch to a different activity type today. If you normally run, try cycling or swimming. If you lift weights, try bodyweight or mobility work.",
      intensity: 'moderate',
      focusArea: "Cross-training or alternative movement patterns"
    },
    acwr: {
      strategy: "Reduce training volume",
      instruction: "Cut today's planned volume by 20-40%. Shorten your session or reduce sets/reps while maintaining movement quality.",
      intensity: 'moderate',
      volumeAdjustment: "Reduce 20-40%",
      focusArea: "Technique and quality over quantity"
    },
    fatigue: {
      strategy: "Active recovery session",
      instruction: "Replace your planned workout with gentle movement: walking, light stretching, yoga, or easy swimming. Keep heart rate low.",
      intensity: 'light',
      focusArea: "Mobility, blood flow, and nervous system restoration"
    },
    strain: {
      strategy: "Reduce training load",
      instruction: "Lower both intensity and volume today. Focus on movement quality with reduced resistance or pace.",
      intensity: 'light',
      volumeAdjustment: "Reduce 30-50%",
      focusArea: "Deload and recovery"
    },
    sleep: {
      strategy: "Low intensity session",
      instruction: "Keep today's session short and easy. Your body is recovering from sleep debt—avoid high-intensity or long-duration efforts.",
      intensity: 'light',
      focusArea: "Gentle movement and early finish"
    },
    hrv: {
      strategy: "Prioritize recovery",
      instruction: "Your nervous system needs recovery. Choose restorative activities: gentle yoga, meditation, light walking, or complete rest.",
      intensity: 'light',
      focusArea: "Parasympathetic activation and stress reduction"
    },
    symptoms: {
      strategy: "Offload affected area",
      instruction: "Avoid loading the symptomatic area. Choose alternative movements that don't stress the affected region while maintaining activity.",
      intensity: 'moderate',
      focusArea: "Alternative movement patterns, protect affected area"
    }
  };

  // Get primary action
  let action = actionRules[primary.id] || {
    strategy: "Modify training approach",
    instruction: "Adjust today's session based on your body's signals. Consider reducing intensity or duration.",
    intensity: 'moderate' as const,
    focusArea: "Listen to your body"
  };

  // Intensify action if risk is high or multiple drivers present
  if (riskLevel === 'high') {
    if (action.intensity === 'moderate') {
      action = {
        ...action,
        intensity: 'light',
        instruction: action.instruction + " Given elevated risk, err on the side of less today."
      };
    } else if (action.intensity === 'light') {
      action = {
        ...action,
        intensity: 'rest',
        instruction: "Consider taking today as a complete rest day. Your body is signaling a strong need for recovery."
      };
    }
  }

  // Combine with secondary driver if present
  if (secondary) {
    const secondaryHints: Record<string, string> = {
      monotony: " Also consider varying your training type.",
      acwr: " Keep volume conservative.",
      fatigue: " Prioritize feeling fresh over completing work.",
      strain: " Reduce overall load.",
      sleep: " Keep it short and finish early for better rest tonight.",
      hrv: " Focus on stress-reducing activities.",
      symptoms: " Be mindful of any symptomatic areas."
    };
    
    const hint = secondaryHints[secondary.id];
    if (hint && !action.instruction.toLowerCase().includes(secondary.id)) {
      action = {
        ...action,
        instruction: action.instruction + hint
      };
    }
  }

  // Apply personalization if user profile is available
  if (userProfile && (userProfile.preferredActivities?.length || userProfile.interests?.length || userProfile.injuries?.length)) {
    const { recommendedActivity, avoidActivities } = matchActivityToPreferences(
      action.strategy,
      userProfile,
      symptoms
    );
    
    action = {
      ...action,
      recommendedActivity,
      avoidActivities
    };
    
    // Enhance instruction with personalized recommendation
    if (recommendedActivity) {
      action.instruction = action.instruction + ` Based on your preferences, try: ${recommendedActivity}.`;
    }
    
    if (avoidActivities.length > 0) {
      action.instruction = action.instruction + ` Avoid: ${avoidActivities.slice(0, 3).join(', ')}.`;
    }
  }

  return action;
}
