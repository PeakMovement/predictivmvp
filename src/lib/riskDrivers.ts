/**
 * Risk Driver Identification Engine
 * Analyzes multiple factors to identify primary and secondary risk drivers
 * Used by both frontend (useTodaysDecision) and backend (generate-yves-intelligence)
 */

// ============================================
// DATE-BASED ROTATION HELPERS (for presentation variety)
// ============================================

/**
 * Get local date key for rotation (user's timezone)
 * Returns YYYY-MM-DD format in user's local timezone
 */
export function getLocalDateKey(): string {
  return new Date().toLocaleDateString('en-CA'); // Returns YYYY-MM-DD in local timezone
}

/**
 * Calculate a deterministic rotation index based on local date
 * Same date always returns same index for consistency
 */
export function getDateRotationIndex(variationCount: number): number {
  const dateStr = getLocalDateKey();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % variationCount;
}

// ============================================
// EXERCISE SET VARIATIONS (rotated daily)
// ============================================

interface ExerciseSetVariation {
  exercises: Array<{ name: string; prescription: string; notes?: string }>;
}

const REST_DAY_EXERCISE_VARIATIONS: ExerciseSetVariation[] = [
  {
    exercises: [
      { name: 'Complete rest', prescription: 'Full day off', notes: 'Only move if it feels restorative' },
      { name: 'OR: Gentle walk', prescription: '10-15 minutes if desired', notes: 'Keep effort very low' }
    ]
  },
  {
    exercises: [
      { name: 'Deep breathing', prescription: '5 minutes box breathing (4-4-4-4)', notes: 'Focus on full exhales' },
      { name: 'OR: Light stretching', prescription: '10 minutes gentle movement', notes: 'No forcing any position' }
    ]
  },
  {
    exercises: [
      { name: 'Meditation or mindfulness', prescription: '10-15 minutes', notes: 'Mental recovery is recovery' },
      { name: 'OR: Easy walk outdoors', prescription: '15-20 minutes', notes: 'Keep conversational pace' }
    ]
  }
];

const RECOVERY_EXERCISE_VARIATIONS: ExerciseSetVariation[] = [
  {
    exercises: [
      { name: 'Box Breathing', prescription: '4 rounds of 4-4-4-4 seconds' },
      { name: 'Gentle Walking', prescription: '10-15 minutes easy pace' },
      { name: 'Light Stretching', prescription: '5-10 minutes, no forcing' }
    ]
  },
  {
    exercises: [
      { name: 'Joint Circles', prescription: 'All major joints, 10 each direction' },
      { name: 'Cat-Cow Stretches', prescription: '10-15 reps, slow and controlled' },
      { name: 'Foam Rolling', prescription: '5-8 minutes, major muscle groups' }
    ]
  },
  {
    exercises: [
      { name: 'Easy Movement', prescription: '15-20 minutes walk or swim' },
      { name: 'Hip Mobility', prescription: '5 minutes each side' },
      { name: 'Deep Breathing', prescription: '5 minutes relaxation focus' }
    ]
  }
];

const LIGHT_CARDIO_EXERCISE_VARIATIONS: ExerciseSetVariation[] = [
  {
    exercises: [
      { name: 'Easy cycling or walking', prescription: '15-20 minutes steady state', notes: 'Keep effort conversational' },
      { name: 'Hip circles', prescription: '10 each direction' },
      { name: 'Arm circles', prescription: '10 each direction, each arm' }
    ]
  },
  {
    exercises: [
      { name: 'Incline walking', prescription: '15-20 minutes, 2-4% grade', notes: 'Maintain easy breathing' },
      { name: 'Thoracic rotations', prescription: '10 each side' },
      { name: 'Ankle mobility circles', prescription: '10 each direction, each ankle' }
    ]
  },
  {
    exercises: [
      { name: 'Easy swimming or elliptical', prescription: '15-20 minutes low effort', notes: 'Focus on smooth movement' },
      { name: "World's greatest stretch", prescription: '5 each side' },
      { name: 'Deep squat hold', prescription: '30-60s accumulated' }
    ]
  }
];

// ============================================
// WHY-THIS-MATTERS TEXT VARIATIONS (rotated daily)
// ============================================

interface WhyTextVariation {
  injuryRiskReduction: string;
  todayBenefit: string;
}

const WHY_TEXT_VARIATIONS: Record<string, WhyTextVariation[]> = {
  monotony: [
    {
      injuryRiskReduction: 'Varying training stimulus prevents overuse injuries and mental burnout. Your body adapts better with variety.',
      todayBenefit: 'Fresh movement patterns will activate different muscle groups and reignite motivation.'
    },
    {
      injuryRiskReduction: 'Repetitive stress accumulates. Cross-training distributes load across different tissues and joints.',
      todayBenefit: "You'll work muscles you've been neglecting while giving overused areas time to recover."
    },
    {
      injuryRiskReduction: 'Training variety builds a more resilient body. Different movements strengthen connective tissue from multiple angles.',
      todayBenefit: 'Switching modalities today keeps training interesting and sustainable long-term.'
    }
  ],
  acwr: [
    {
      injuryRiskReduction: 'High acute:chronic workload ratio is strongly linked to injury. Reducing volume today protects tendons, joints, and muscles.',
      todayBenefit: "You'll maintain fitness while giving tissues time to strengthen and adapt."
    },
    {
      injuryRiskReduction: 'Your recent training spike exceeds safe progression rates. Backing off now prevents tissue breakdown.',
      todayBenefit: 'A lighter day allows your body to consolidate recent training gains.'
    },
    {
      injuryRiskReduction: 'Workload imbalances increase injury probability significantly. Today\'s reduction brings you back to safe territory.',
      todayBenefit: "You'll feel stronger in tomorrow's session because you recovered properly today."
    }
  ],
  fatigue: [
    {
      injuryRiskReduction: 'Training on accumulated fatigue leads to poor form, reduced power, and higher injury risk. Recovery restores performance capacity.',
      todayBenefit: 'Light movement promotes blood flow and recovery without adding stress.'
    },
    {
      injuryRiskReduction: 'Fatigue impairs coordination and reaction time. Easy movement today protects you from technique breakdown injuries.',
      todayBenefit: "You'll feel sharper tomorrow and perform better in your next hard session."
    },
    {
      injuryRiskReduction: 'Accumulated fatigue means your body is still adapting to recent training. Pushing through delays that adaptation.',
      todayBenefit: 'Recovery-focused movement helps your body complete the adaptation process from recent training.'
    }
  ],
  strain: [
    {
      injuryRiskReduction: 'High strain accumulates micro-damage. Reducing load allows repair and prevents it becoming macro-damage (injury).',
      todayBenefit: 'Lower intensity today means you can train harder and longer in the coming weeks.'
    },
    {
      injuryRiskReduction: 'Accumulated training stress requires extra recovery time. Backing off now protects your tendons and joints.',
      todayBenefit: 'Your body will use this lighter day to repair and strengthen tissues stressed by recent training.'
    },
    {
      injuryRiskReduction: 'Your weekly load has exceeded safe recovery capacity. Today\'s lighter session prevents long-term setback.',
      todayBenefit: 'Managing load now protects your ability to train consistently over the coming months.'
    }
  ],
  sleep: [
    {
      injuryRiskReduction: 'Poor sleep impairs coordination, reaction time, and tissue repair—all injury risk factors. Easy training is safer training.',
      todayBenefit: 'A lighter session today helps you recover faster and sleep better tonight.'
    },
    {
      injuryRiskReduction: 'Sleep deficit reduces your body\'s ability to handle training stress. Lower intensity keeps you in a safe zone.',
      todayBenefit: 'Finishing early gives your body more time to catch up on recovery tonight.'
    },
    {
      injuryRiskReduction: 'Without quality sleep, your muscles and nervous system haven\'t fully recovered. Gentle movement is all your body can productively handle.',
      todayBenefit: 'Easy movement will actually help regulate your sleep cycle for better rest tonight.'
    }
  ],
  hrv: [
    {
      injuryRiskReduction: 'Low HRV signals your nervous system is stressed. Pushing through increases injury risk and delays recovery.',
      todayBenefit: 'Gentle movement helps restore nervous system balance without adding stress.'
    },
    {
      injuryRiskReduction: 'Suppressed HRV indicates your body is still processing stress. Adding training load compounds the problem.',
      todayBenefit: 'Parasympathetic-activating activities like easy walking or breathing will help restore your HRV faster.'
    },
    {
      injuryRiskReduction: 'Your autonomic nervous system needs recovery time. Training intensity would delay the return to baseline.',
      todayBenefit: 'Restorative movement today sets you up for a strong training response once HRV normalizes.'
    }
  ],
  symptoms: [
    {
      injuryRiskReduction: 'Training through symptoms often worsens the underlying issue. Protecting the area now prevents longer time off later.',
      todayBenefit: 'Alternative movements maintain fitness while the affected area heals properly.'
    },
    {
      injuryRiskReduction: 'Your body is signaling something needs attention. Modifying training prevents a minor issue from becoming a major setback.',
      todayBenefit: 'Working around the affected area keeps you active while allowing healing.'
    },
    {
      injuryRiskReduction: 'Symptoms indicate tissue is irritated or healing. Loading it now interrupts the repair process.',
      todayBenefit: 'Cross-training today maintains cardiovascular fitness while protecting the symptomatic area.'
    }
  ]
};

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

export interface WhyThisMattersContext {
  triggerMetric: string; // e.g., "HRV dropped 18% below baseline"
  injuryRiskReduction: string; // e.g., "Reduces overtraining risk by allowing nervous system recovery"
  todayBenefit: string; // e.g., "You'll feel more energized tomorrow and protect your adaptation"
}

export interface StructuredSession {
  title: string;
  duration: string; // e.g., "25-30 minutes"
  intensity: {
    level: string; // e.g., "Low", "Moderate", "High"
    hrZone?: string; // e.g., "Zone 1-2 (50-65% max HR)"
    rpe: string; // e.g., "RPE 3-4/10"
  };
  warmup?: {
    duration: string;
    activities: string[];
  };
  mainBlock: {
    format: string; // e.g., "Continuous", "Intervals", "Circuit"
    exercises: Array<{
      name: string;
      prescription: string; // e.g., "3x10 reps", "20 minutes", "5x30s on/30s off"
      notes?: string;
    }>;
  };
  cooldown?: {
    duration: string;
    activities: string[];
  };
  safetyNotes: string[];
  sessionGoal: string;
  whyThisMatters?: WhyThisMattersContext;
}

export interface CorrectiveAction {
  strategy: string;
  instruction: string;
  intensity: 'rest' | 'light' | 'moderate' | 'normal';
  volumeAdjustment?: string; // e.g., "Reduce 20-40%"
  focusArea?: string; // e.g., "mobility", "technique", "cardio"
  recommendedActivity?: string; // Personalized activity recommendation
  avoidActivities?: string[]; // Activities to avoid based on injuries
  session?: StructuredSession; // The detailed session plan
}

export interface UserProfile {
  preferredActivities?: string[];
  interests?: string[];
  injuries?: string[];
  injuryDetails?: Record<string, unknown>;
  equipmentAccess?: string[]; // e.g., ['gym', 'home weights', 'bike', 'pool', 'resistance bands']
  trainingFrequency?: string;
  intensityPreference?: string;
}

// Equipment requirements for different activities
const EQUIPMENT_REQUIREMENTS: Record<string, string[]> = {
  'weightlifting': ['gym', 'home weights', 'barbell', 'dumbbells'],
  'swimming': ['pool'],
  'cycling': ['bike', 'spin bike', 'gym'],
  'rowing': ['rowing machine', 'gym'],
  'elliptical': ['elliptical', 'gym'],
  'resistance training': ['gym', 'home weights', 'resistance bands'],
  'yoga': [], // No equipment needed
  'pilates': ['mat'],
  'walking': [], // No equipment needed
  'running': [], // No equipment needed (basic)
  'stretching': [], // No equipment needed
  'foam rolling': ['foam roller'],
};

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
 * Formula: (Strain / 300) × 50 + (cappedMonotony / 2.5) × 50, capped at 100
 * Monotony is capped at 2.5 per architecture spec to prevent inflation
 */
export function calculateFatigueIndex(strain: number | null, monotony: number | null): number | null {
  if (strain === null && monotony === null) return null;
  
  const cappedMonotony = monotony !== null ? Math.min(monotony, 2.5) : 0;
  const strainContrib = strain !== null ? (strain / 300) * 50 : 0;
  const monotonyContrib = (cappedMonotony / 2.5) * 50;
  
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
 * Check if user has required equipment for an activity
 */
function hasRequiredEquipment(activity: string, equipmentAccess: string[]): boolean {
  if (!equipmentAccess || equipmentAccess.length === 0) {
    // If no equipment listed, assume they have basic access
    return true;
  }
  
  const activityLower = activity.toLowerCase();
  const requirements = Object.entries(EQUIPMENT_REQUIREMENTS)
    .find(([key]) => activityLower.includes(key.toLowerCase()))?.[1] || [];
  
  // If no equipment required, always accessible
  if (requirements.length === 0) return true;
  
  // Check if user has any of the required equipment
  const userEquipment = equipmentAccess.map(e => e.toLowerCase());
  return requirements.some(req => 
    userEquipment.some(ue => ue.includes(req) || req.includes(ue))
  );
}

/**
 * Filter activities by equipment availability
 */
function filterByEquipment(activities: string[], equipmentAccess?: string[]): string[] {
  if (!equipmentAccess || equipmentAccess.length === 0) return activities;
  return activities.filter(a => hasRequiredEquipment(a, equipmentAccess));
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
  const equipmentAccess = userProfile.equipmentAccess || [];
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
  
  // Helper: filter by safety AND equipment
  const filterSafeAndAccessible = (activities: string[]): string[] => {
    const safe = findSafeActivities(areasToAvoid, activities);
    return filterByEquipment(safe, equipmentAccess);
  };
  
  // Strategy-specific activity matching
  let recommendedActivity = '';
  
  switch (strategy) {
    case 'Change training modality':
      // Find alternative from user preferences that's different from usual
      const safePreferred = filterSafeAndAccessible(allPreferred);
      if (safePreferred.length > 0) {
        // Pick a low-impact option if available
        const lowImpactMatch = safePreferred.find(a => 
          ACTIVITY_CATEGORIES.lowImpact.some(li => a.toLowerCase().includes(li))
        );
        recommendedActivity = lowImpactMatch || safePreferred[0];
      } else {
        const safeLowImpact = filterSafeAndAccessible(ACTIVITY_CATEGORIES.lowImpact);
        recommendedActivity = safeLowImpact[0] || 'light walking';
      }
      break;
      
    case 'Active recovery session':
    case 'Prioritize recovery':
      // Match with preferred recovery activities
      const recoveryOptions = ACTIVITY_CATEGORIES.recovery;
      const preferredRecovery = allPreferred.find(p => 
        recoveryOptions.some(r => p.toLowerCase().includes(r))
      );
      const safeRecovery = filterSafeAndAccessible(recoveryOptions);
      recommendedActivity = preferredRecovery && hasRequiredEquipment(preferredRecovery, equipmentAccess) 
        ? preferredRecovery 
        : safeRecovery[0] || 'gentle walking';
      break;
      
    case 'Low intensity session':
      // Find low-intensity version of preferred activities
      const userLowImpact = allPreferred.filter(p =>
        ACTIVITY_CATEGORIES.lowImpact.some(li => p.toLowerCase().includes(li))
      );
      const safeLowImpact = filterSafeAndAccessible(userLowImpact);
      if (safeLowImpact.length > 0) {
        recommendedActivity = `Easy ${safeLowImpact[0].toLowerCase()}`;
      } else if (allPreferred.some(p => p.toLowerCase().includes('cycling')) && 
                 hasRequiredEquipment('cycling', equipmentAccess)) {
        recommendedActivity = 'Easy cycling session';
      } else if (allPreferred.some(p => p.toLowerCase().includes('swim')) && 
                 hasRequiredEquipment('swimming', equipmentAccess)) {
        recommendedActivity = 'Easy swimming session';
      } else {
        recommendedActivity = 'Light walking or easy movement';
      }
      break;
      
    case 'Reduce training volume':
    case 'Reduce training load':
      // Suggest scaled version of preferred activity
      if (allPreferred.length > 0) {
        const safeActivity = filterSafeAndAccessible(allPreferred)[0];
        if (safeActivity) {
          recommendedActivity = `Reduced ${safeActivity.toLowerCase()} session`;
        }
      }
      break;
      
    case 'Offload affected area':
      // Find activities that don't load affected areas
      const safeOptions = filterSafeAndAccessible(allPreferred);
      if (safeOptions.length > 0) {
        recommendedActivity = safeOptions[0];
      } else {
        // Fallback to very safe options
        const safeFallbacks = filterSafeAndAccessible(['walking', 'swimming', 'cycling', 'yoga']);
        recommendedActivity = safeFallbacks[0] || 'Upper body work only';
      }
      break;
      
    default:
      if (allPreferred.length > 0) {
        const safeDefault = filterSafeAndAccessible(allPreferred);
        recommendedActivity = safeDefault[0] || allPreferred[0];
      }
  }
  
  return { 
    recommendedActivity: recommendedActivity || 'Gentle movement of your choice',
    avoidActivities: [...new Set(avoidActivities)]
  };
}

/**
 * Session Templates: Pre-built session structures for different corrective strategies
 */
interface SessionTemplate {
  titlePrefix: string;
  durationRange: string;
  intensity: StructuredSession['intensity'];
  warmup: StructuredSession['warmup'];
  cooldown: StructuredSession['cooldown'];
  goalTemplate: string;
}

const SESSION_TEMPLATES: Record<string, SessionTemplate> = {
  recovery: {
    titlePrefix: 'Active Recovery',
    durationRange: '20-30 minutes',
    intensity: {
      level: 'Low',
      hrZone: 'Zone 1 (50-60% max HR)',
      rpe: 'RPE 2-3/10'
    },
    warmup: {
      duration: '3-5 minutes',
      activities: ['Light walking', 'Gentle joint circles']
    },
    cooldown: {
      duration: '5 minutes',
      activities: ['Deep breathing', 'Static stretching']
    },
    goalTemplate: 'Promote blood flow and recovery without adding training stress'
  },
  light: {
    titlePrefix: 'Low Intensity',
    durationRange: '25-35 minutes',
    intensity: {
      level: 'Low-Moderate',
      hrZone: 'Zone 1-2 (55-65% max HR)',
      rpe: 'RPE 3-4/10'
    },
    warmup: {
      duration: '5 minutes',
      activities: ['Easy movement', 'Dynamic mobility']
    },
    cooldown: {
      duration: '5-7 minutes',
      activities: ['Walking cool-down', 'Light stretching']
    },
    goalTemplate: 'Maintain movement habit while supporting recovery'
  },
  moderate: {
    titlePrefix: 'Modified Training',
    durationRange: '30-45 minutes',
    intensity: {
      level: 'Moderate',
      hrZone: 'Zone 2-3 (65-75% max HR)',
      rpe: 'RPE 4-6/10'
    },
    warmup: {
      duration: '5-8 minutes',
      activities: ['Progressive warm-up', 'Movement preparation']
    },
    cooldown: {
      duration: '5-8 minutes',
      activities: ['Gradual cool-down', 'Mobility work', 'Stretching']
    },
    goalTemplate: 'Quality training at reduced intensity to support adaptation'
  },
  crossTrain: {
    titlePrefix: 'Cross-Training',
    durationRange: '30-40 minutes',
    intensity: {
      level: 'Moderate',
      hrZone: 'Zone 2 (60-70% max HR)',
      rpe: 'RPE 4-5/10'
    },
    warmup: {
      duration: '5-7 minutes',
      activities: ['Activity-specific warm-up', 'Mobility drills']
    },
    cooldown: {
      duration: '5-7 minutes',
      activities: ['Easy movement', 'Stretching new muscle groups']
    },
    goalTemplate: 'Vary training stimulus while maintaining fitness'
  },
  rest: {
    titlePrefix: 'Rest Day',
    durationRange: '10-15 minutes (optional)',
    intensity: {
      level: 'Very Low',
      hrZone: 'Zone 1 (<55% max HR)',
      rpe: 'RPE 1-2/10'
    },
    warmup: undefined,
    cooldown: {
      duration: '5-10 minutes',
      activities: ['Deep breathing', 'Meditation', 'Gentle stretching']
    },
    goalTemplate: 'Complete rest to allow full recovery and adaptation'
  }
};

/**
 * Exercise libraries for different session types
 */
interface ExerciseOption {
  name: string;
  prescription: string;
  notes?: string;
  category: string;
  equipment?: string[];
  avoidFor?: string[]; // body areas - skip if injured
}

const EXERCISE_LIBRARY: ExerciseOption[] = [
  // Recovery exercises
  { name: 'Walking', prescription: '10-15 minutes easy pace', category: 'recovery', avoidFor: ['ankle', 'foot', 'knee'] },
  { name: 'Gentle yoga flow', prescription: '15-20 minutes', category: 'recovery', equipment: ['mat'] },
  { name: 'Foam rolling', prescription: '5-8 minutes, 30s per area', category: 'recovery', equipment: ['foam roller'] },
  { name: 'Breathing exercises', prescription: '5 minutes box breathing (4-4-4-4)', category: 'recovery' },
  { name: 'Cat-cow stretches', prescription: '10 reps slow and controlled', category: 'recovery' },
  { name: 'Supine spinal twist', prescription: '30s each side', category: 'recovery', avoidFor: ['lower back'] },
  
  // Low intensity cardio
  { name: 'Easy cycling', prescription: '15-20 minutes steady state', category: 'light_cardio', equipment: ['bike', 'spin bike'], avoidFor: ['knee', 'hip'] },
  { name: 'Swimming', prescription: '15-20 minutes easy laps', category: 'light_cardio', equipment: ['pool'] },
  { name: 'Elliptical', prescription: '15-20 minutes low resistance', category: 'light_cardio', equipment: ['elliptical', 'gym'], avoidFor: ['knee'] },
  { name: 'Rowing', prescription: '10-15 minutes easy pace', category: 'light_cardio', equipment: ['rowing machine', 'gym'], avoidFor: ['lower back', 'shoulder'] },
  { name: 'Incline walking', prescription: '15-20 minutes, 2-4% incline', category: 'light_cardio', equipment: ['treadmill', 'gym'], avoidFor: ['ankle', 'foot'] },
  
  // Mobility work
  { name: 'Hip circles', prescription: '10 each direction', category: 'mobility', avoidFor: ['hip'] },
  { name: 'Arm circles', prescription: '10 each direction, each arm', category: 'mobility', avoidFor: ['shoulder'] },
  { name: 'Thoracic rotations', prescription: '10 each side', category: 'mobility', avoidFor: ['back'] },
  { name: 'Ankle mobility circles', prescription: '10 each direction, each ankle', category: 'mobility', avoidFor: ['ankle'] },
  { name: 'World\'s greatest stretch', prescription: '5 each side', category: 'mobility' },
  { name: 'Deep squat hold', prescription: '30-60s accumulated', category: 'mobility', avoidFor: ['knee', 'hip', 'ankle'] },
  
  // Light strength
  { name: 'Bodyweight squats', prescription: '2x10 controlled tempo', category: 'light_strength', avoidFor: ['knee', 'hip', 'ankle'] },
  { name: 'Push-ups (or wall push-ups)', prescription: '2x8-10', category: 'light_strength', avoidFor: ['shoulder', 'wrist', 'elbow'] },
  { name: 'Glute bridges', prescription: '2x12', category: 'light_strength', avoidFor: ['lower back', 'hip'] },
  { name: 'Bird dogs', prescription: '2x8 each side', category: 'light_strength' },
  { name: 'Dead hangs', prescription: '3x15-30s', category: 'light_strength', equipment: ['pull-up bar'], avoidFor: ['shoulder', 'wrist'] },
  { name: 'Band pull-aparts', prescription: '2x15', category: 'light_strength', equipment: ['resistance bands'], avoidFor: ['shoulder'] },
  
  // Cross-training
  { name: 'Stationary bike intervals', prescription: '5x1min easy/30s moderate', category: 'cross_train', equipment: ['bike', 'spin bike'], avoidFor: ['knee'] },
  { name: 'Pool running', prescription: '15-20 minutes', category: 'cross_train', equipment: ['pool'] },
  { name: 'Battle rope waves', prescription: '3x20s', category: 'cross_train', equipment: ['battle ropes', 'gym'], avoidFor: ['shoulder', 'wrist'] },
  { name: 'Medicine ball throws', prescription: '2x10 each type', category: 'cross_train', equipment: ['medicine ball', 'gym'], avoidFor: ['shoulder', 'back'] },
];

/**
 * Generate a structured session based on corrective strategy and user profile
 */
// Why-this-matters context generators by risk driver type
const WHY_THIS_MATTERS_TEMPLATES: Record<string, { 
  triggerTemplate: (value: number | null, threshold: number) => string;
  riskReduction: string;
  benefitTemplate: (intensity: string) => string;
}> = {
  monotony: {
    triggerTemplate: (v, t) => `Training monotony is ${v ? 'high' : 'elevated'} (${v?.toFixed(1) || '>'} vs ${t} threshold)`,
    riskReduction: 'Varying training stimulus prevents overuse injuries and mental burnout. Your body adapts better with variety.',
    benefitTemplate: (i) => i === 'rest' 
      ? "Complete rest resets both body and mind for stronger training ahead."
      : "Fresh movement patterns will activate different muscle groups and reignite motivation."
  },
  acwr: {
    triggerTemplate: (v, t) => `Training load ratio spiked to ${v?.toFixed(2) || 'high'} (threshold: ${t})`,
    riskReduction: 'High acute:chronic workload ratio is strongly linked to injury. Reducing volume today protects tendons, joints, and muscles.',
    benefitTemplate: (i) => i === 'rest' 
      ? "Full rest allows tissues to catch up with recent training demands."
      : "You'll maintain fitness while giving tissues time to strengthen and adapt."
  },
  fatigue: {
    triggerTemplate: (v) => `Fatigue index is elevated${v ? ` at ${v.toFixed(0)}%` : ''}`,
    riskReduction: 'Training on accumulated fatigue leads to poor form, reduced power, and higher injury risk. Recovery restores performance capacity.',
    benefitTemplate: (i) => i === 'light' 
      ? "Light movement promotes blood flow and recovery without adding stress."
      : "You'll feel sharper tomorrow and perform better in your next hard session."
  },
  strain: {
    triggerTemplate: (v, t) => `Cumulative strain is ${v && t ? `${((v/t)*100).toFixed(0)}% above safe levels` : 'elevated'}`,
    riskReduction: 'High strain accumulates micro-damage. Reducing load allows repair and prevents it becoming macro-damage (injury).',
    benefitTemplate: () => "Lower intensity today means you can train harder and longer in the coming weeks."
  },
  sleep: {
    triggerTemplate: (v) => `Sleep score dropped to ${v || 'low'} (below optimal recovery threshold)`,
    riskReduction: 'Poor sleep impairs coordination, reaction time, and tissue repair—all injury risk factors. Easy training is safer training.',
    benefitTemplate: () => "A lighter session today helps you recover faster and sleep better tonight."
  },
  hrv: {
    triggerTemplate: (v, t) => `HRV is ${v && t ? `${Math.abs(((v - t) / t) * 100).toFixed(0)}% below` : 'significantly below'} your baseline`,
    riskReduction: 'Low HRV signals your nervous system is stressed. Pushing through increases injury risk and delays recovery.',
    benefitTemplate: (i) => i === 'rest' 
      ? "Complete rest activates your parasympathetic system, accelerating full recovery."
      : "Gentle movement helps restore nervous system balance without adding stress."
  },
  symptoms: {
    triggerTemplate: () => 'You reported symptoms that need attention',
    riskReduction: 'Training through symptoms often worsens the underlying issue. Protecting the area now prevents longer time off later.',
    benefitTemplate: () => "Alternative movements maintain fitness while the affected area heals properly."
  }
};

function generateWhyThisMatters(
  primaryDriver: RiskDriver | null,
  intensity: 'rest' | 'light' | 'moderate' | 'normal',
  rotationIndex?: number
): WhyThisMattersContext | undefined {
  if (!primaryDriver) return undefined;

  const template = WHY_THIS_MATTERS_TEMPLATES[primaryDriver.id];
  if (!template) {
    // Generic fallback
    return {
      triggerMetric: `${primaryDriver.label} is outside optimal range`,
      injuryRiskReduction: primaryDriver.explanation,
      todayBenefit: intensity === 'rest' 
        ? "Rest today sets you up for better training tomorrow."
        : "This session balances recovery with maintaining your fitness."
    };
  }

  // Get text variations for this driver
  const textVariations = WHY_TEXT_VARIATIONS[primaryDriver.id];
  const rotation = rotationIndex ?? getDateRotationIndex(3);
  
  // Use rotated text if variations exist, otherwise use template defaults
  if (textVariations && textVariations.length > 0) {
    const variationIdx = rotation % textVariations.length;
    const selectedVariation = textVariations[variationIdx];
    
    return {
      triggerMetric: template.triggerTemplate(primaryDriver.value, primaryDriver.threshold),
      injuryRiskReduction: selectedVariation.injuryRiskReduction,
      todayBenefit: selectedVariation.todayBenefit
    };
  }

  return {
    triggerMetric: template.triggerTemplate(primaryDriver.value, primaryDriver.threshold),
    injuryRiskReduction: template.riskReduction,
    todayBenefit: template.benefitTemplate(intensity)
  };
}

function generateStructuredSession(
  strategy: string,
  intensity: 'rest' | 'light' | 'moderate' | 'normal',
  userProfile: UserProfile,
  recommendedActivity: string,
  avoidActivities: string[],
  primaryDriver?: RiskDriver | null,
  rotationIndex?: number
): StructuredSession {
  // Calculate rotation index for exercise variations
  const rotation = rotationIndex ?? getDateRotationIndex(3);
  
  // Select appropriate template
  let templateKey: keyof typeof SESSION_TEMPLATES = 'moderate';
  
  if (intensity === 'rest') {
    templateKey = 'rest';
  } else if (intensity === 'light') {
    if (strategy.includes('recovery') || strategy.includes('Recovery')) {
      templateKey = 'recovery';
    } else {
      templateKey = 'light';
    }
  } else if (strategy.includes('modality') || strategy.includes('Change')) {
    templateKey = 'crossTrain';
  }
  
  const template = SESSION_TEMPLATES[templateKey];
  const injuries = userProfile.injuries?.map(i => i.toLowerCase()) || [];
  const equipment = userProfile.equipmentAccess || [];
  
  // Filter exercises by safety and equipment
  const filterExercises = (categories: string[]): ExerciseOption[] => {
    return EXERCISE_LIBRARY.filter(ex => {
      // Must be in requested category
      if (!categories.includes(ex.category)) return false;
      
      // Check injury safety
      if (ex.avoidFor && injuries.length > 0) {
        if (ex.avoidFor.some(area => injuries.some(inj => inj.includes(area) || area.includes(inj)))) {
          return false;
        }
      }
      
      // Check equipment availability
      if (ex.equipment && ex.equipment.length > 0 && equipment.length > 0) {
        const userEquipment = equipment.map(e => e.toLowerCase());
        if (!ex.equipment.some(req => userEquipment.some(ue => ue.includes(req) || req.includes(ue)))) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  // Build session based on template type
  let exercises: StructuredSession['mainBlock']['exercises'] = [];
  let format = 'Continuous';
  let safetyNotes: string[] = [];
  
  switch (templateKey) {
    case 'rest':
      format = 'Optional gentle movement only';
      // Use rotated rest day exercises
      const restVariation = REST_DAY_EXERCISE_VARIATIONS[rotation % REST_DAY_EXERCISE_VARIATIONS.length];
      exercises = [...restVariation.exercises];
      safetyNotes = [
        'Rest is productive training',
        'Avoid the temptation to "do something"',
        'Focus on sleep, nutrition, and stress management'
      ];
      break;
      
    case 'recovery':
      format = 'Circuit - move through exercises smoothly';
      // Use rotated recovery exercises first, then supplement from library if needed
      const recoveryVariation = RECOVERY_EXERCISE_VARIATIONS[rotation % RECOVERY_EXERCISE_VARIATIONS.length];
      exercises = [...recoveryVariation.exercises];
      
      // Filter any exercises that conflict with injuries
      exercises = exercises.filter(ex => {
        const name = ex.name.toLowerCase();
        return !injuries.some(injury => name.includes(injury) || injury.includes(name));
      });
      
      // Supplement from library if we filtered too many
      if (exercises.length < 3) {
        const recoveryLib = filterExercises(['recovery', 'mobility']);
        const needed = 3 - exercises.length;
        recoveryLib.slice(0, needed).forEach(ex => {
          exercises.push({ name: ex.name, prescription: ex.prescription, notes: ex.notes });
        });
      }
      
      safetyNotes = [
        'Movement should feel restorative, not taxing',
        'If anything causes discomfort, skip it',
        'Focus on breathing and relaxation'
      ];
      break;
      
    case 'light':
      format = 'Steady state or easy circuit';
      // Use rotated light cardio exercises first
      const lightVariation = LIGHT_CARDIO_EXERCISE_VARIATIONS[rotation % LIGHT_CARDIO_EXERCISE_VARIATIONS.length];
      exercises = [...lightVariation.exercises];
      
      // Filter any exercises that conflict with injuries
      exercises = exercises.filter(ex => {
        const name = ex.name.toLowerCase();
        return !injuries.some(injury => name.includes(injury) || injury.includes(name));
      });
      
      // Supplement from library if we filtered too many
      if (exercises.length < 3) {
        const lightCardio = filterExercises(['light_cardio', 'recovery']);
        const mobilityWork = filterExercises(['mobility']);
        const allOptions = [...lightCardio, ...mobilityWork];
        const needed = 3 - exercises.length;
        allOptions.slice(0, needed).forEach(ex => {
          if (!exercises.some(e => e.name === ex.name)) {
            exercises.push({ name: ex.name, prescription: ex.prescription, notes: ex.notes });
          }
        });
      }
      
      safetyNotes = [
        'Should be able to hold a conversation throughout',
        'End feeling better than you started',
        'Cut short if fatigue increases'
      ];
      break;
      
    case 'crossTrain':
      format = 'Varied movement session';
      const crossExercises = filterExercises(['cross_train', 'light_cardio', 'light_strength']);
      
      // Primary activity based on recommendation
      if (recommendedActivity && recommendedActivity !== 'Gentle movement of your choice') {
        exercises.push({
          name: recommendedActivity,
          prescription: '15-20 minutes',
          notes: 'Primary cross-training activity'
        });
      }
      
      // Add supporting exercises
      crossExercises.slice(0, 3).forEach(ex => {
        if (!exercises.some(e => e.name === ex.name)) {
          exercises.push({ name: ex.name, prescription: ex.prescription });
        }
      });
      
      safetyNotes = [
        'New movement patterns may feel awkward - take time to learn',
        'Keep intensity moderate as body adapts',
        'Focus on movement quality over performance'
      ];
      break;
      
    default: // moderate
      format = 'Structured training (reduced load)';
      const strengthExercises = filterExercises(['light_strength']);
      const cardioOptions = filterExercises(['light_cardio']);
      
      if (cardioOptions.length > 0) {
        exercises.push({
          name: cardioOptions[0].name,
          prescription: '10-15 minutes',
          notes: 'Cardio component'
        });
      }
      
      strengthExercises.slice(0, 3).forEach(ex => {
        exercises.push({ name: ex.name, prescription: ex.prescription });
      });
      
      safetyNotes = [
        'Quality over quantity today',
        'Leave 2-3 reps in reserve on all sets',
        'If form breaks down, stop the set'
      ];
  }
  
  // Add injury-specific safety notes
  if (injuries.length > 0) {
    safetyNotes.push(`Protect affected areas: ${injuries.join(', ')}`);
  }
  
  // Add avoid activities note
  if (avoidActivities.length > 0) {
    safetyNotes.push(`Today, avoid: ${avoidActivities.slice(0, 3).join(', ')}`);
  }
  
  // Build title
  const activityName = recommendedActivity && recommendedActivity !== 'Gentle movement of your choice' 
    ? ` - ${recommendedActivity}` 
    : '';
  const title = `${template.titlePrefix} Session${activityName}`;
  
  // Generate why-this-matters context with rotation for text variation
  const whyThisMatters = generateWhyThisMatters(primaryDriver || null, intensity, rotation);
  
  return {
    title,
    duration: template.durationRange,
    intensity: template.intensity,
    warmup: template.warmup,
    mainBlock: {
      format,
      exercises
    },
    cooldown: template.cooldown,
    safetyNotes,
    sessionGoal: template.goalTemplate,
    whyThisMatters
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
  // Calculate rotation index at the start for consistent daily variation
  const rotationIndex = getDateRotationIndex(3);
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
  if (userProfile && (userProfile.preferredActivities?.length || userProfile.interests?.length || userProfile.injuries?.length || userProfile.equipmentAccess?.length)) {
    const { recommendedActivity, avoidActivities } = matchActivityToPreferences(
      action.strategy,
      userProfile,
      symptoms
    );
    
    // Generate structured session with primary driver for "why this matters" and rotation
    const session = generateStructuredSession(
      action.strategy,
      action.intensity,
      userProfile,
      recommendedActivity,
      avoidActivities,
      primary,
      rotationIndex
    );
    
    action = {
      ...action,
      recommendedActivity,
      avoidActivities,
      session
    };
    
    // Enhance instruction with personalized recommendation
    if (recommendedActivity) {
      action.instruction = action.instruction + ` Based on your preferences, try: ${recommendedActivity}.`;
    }
    
    if (avoidActivities.length > 0) {
      action.instruction = action.instruction + ` Avoid: ${avoidActivities.slice(0, 3).join(', ')}.`;
    }
  } else {
    // Generate a generic session even without full user profile
    const session = generateStructuredSession(
      action.strategy,
      action.intensity,
      userProfile || {},
      '',
      [],
      primary,
      rotationIndex
    );
    action = { ...action, session };
  }

  return action;
}
