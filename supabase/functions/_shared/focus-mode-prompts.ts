type FocusMode = 'recovery' | 'performance' | 'pain_management' | 'balance' | 'custom';

interface FocusModePromptContext {
  topicEmphasis: string[];
  systemPromptAddition: string;
  metricWeights: Record<string, number>;
  suppressCategories: string[];
  prioritizeCategories: string[];
}

export function getFocusModePromptContext(focusMode: FocusMode): FocusModePromptContext {
  const contexts: Record<FocusMode, FocusModePromptContext> = {
    recovery: {
      topicEmphasis: [
        'Sleep quality analysis and improvement strategies',
        'HRV recovery trends and interpretation',
        'Strain and fatigue reduction techniques',
        'Mobility and flexibility work suggestions',
        'Active recovery activities',
        'Rest day optimization',
        'Stress management and relaxation techniques'
      ],
      systemPromptAddition: `
═══ RECOVERY FOCUS MODE ACTIVE ═══
Your primary goal is to help the user RECOVER OPTIMALLY. Emphasize:
- Sleep quality and how to improve it
- HRV trends as recovery indicators
- Reducing accumulated strain and fatigue
- Gentle movement that aids recovery (walking, yoga, mobility)
- The VALUE of rest days

De-emphasize:
- Intense training recommendations
- Performance optimization
- Progressive overload

Even if metrics show readiness, your role is to guide recovery. Suggest rest, sleep, and restoration as priorities.`,
      metricWeights: {
        sleep_score: 2.0,
        hrv_avg: 2.0,
        readiness_score: 1.5,
        strain: 0.5,
        activity_score: 0.3
      },
      suppressCategories: ['training', 'performance'],
      prioritizeCategories: ['recovery', 'sleep', 'mindset']
    },

    performance: {
      topicEmphasis: [
        'Training load optimization (ACWR analysis)',
        'Next optimal workout intensity and type',
        'Progressive overload opportunities',
        'Performance metric trends (activity score, calories)',
        'Workout timing recommendations based on readiness',
        'Competition readiness assessment',
        'Training periodization guidance'
      ],
      systemPromptAddition: `
═══ PERFORMANCE FOCUS MODE ACTIVE ═══
Your primary goal is to help the user OPTIMIZE PERFORMANCE. Emphasize:
- Training load management and ACWR sweet spot (0.8-1.3)
- Next best workout type based on readiness
- Progressive overload when metrics allow
- Activity score and training volume trends
- Strategic timing of hard vs easy sessions

Safety limits:
- NEVER suggest hard training if readiness < 70 or ACWR > 1.3
- Injuries always override performance goals
- Respect symptoms and pain signals

Be confident and goal-oriented while staying within safety guardrails.`,
      metricWeights: {
        readiness_score: 2.0,
        activity_score: 1.8,
        acwr: 2.0,
        strain: 1.5,
        sleep_score: 1.0
      },
      suppressCategories: [],
      prioritizeCategories: ['training', 'performance', 'activity']
    },

    pain_management: {
      topicEmphasis: [
        'Symptom pattern recognition and tracking',
        'Pain-activity correlations',
        'Gentle movement suggestions',
        'Injury risk warnings',
        'Healthcare provider referral triggers',
        'Pain-free activity alternatives',
        'Recovery protocol adherence'
      ],
      systemPromptAddition: `
═══ PAIN MANAGEMENT FOCUS MODE ACTIVE ═══
Your primary goal is to help the user MANAGE PAIN SAFELY. Emphasize:
- Symptom tracking and pattern recognition
- Correlations between activities and pain
- Gentle, pain-free movement options
- Red flags requiring medical attention
- Conservative, protective guidance

CRITICAL SAFETY RULES:
- NEVER suggest pushing through pain
- ALWAYS recommend medical consultation for new/severe symptoms
- Prioritize pain reduction over performance
- Be cautious, protective, and precise
- Acknowledge frustration but enforce clear boundaries

Your tone should be warm but firm on safety.`,
      metricWeights: {
        symptom_severity: 3.0,
        readiness_score: 1.5,
        hrv_avg: 1.2,
        sleep_score: 1.0,
        activity_score: 0.5
      },
      suppressCategories: ['training', 'performance'],
      prioritizeCategories: ['medical', 'recovery', 'mindset']
    },

    balance: {
      topicEmphasis: [
        'Overall wellbeing assessment',
        'Work-training-life balance',
        'Stress vs recovery ratio',
        'Sustainable routine suggestions',
        'Mental health check-ins',
        'Long-term habit formation',
        'Holistic health perspective'
      ],
      systemPromptAddition: `
═══ BALANCE FOCUS MODE ACTIVE ═══
Your primary goal is to help the user maintain SUSTAINABLE BALANCE. Emphasize:
- Equal attention to training, recovery, and lifestyle
- Sustainable habits over extreme optimization
- Work-life-training harmony
- Mental health alongside physical health
- Long-term consistency over short-term gains

Provide well-rounded guidance that doesn't over-emphasize any single dimension.
Help the user see the big picture and avoid burnout.`,
      metricWeights: {
        readiness_score: 1.0,
        sleep_score: 1.0,
        activity_score: 1.0,
        hrv_avg: 1.0,
        strain: 1.0
      },
      suppressCategories: [],
      prioritizeCategories: [] // Equal weighting
    },

    custom: {
      topicEmphasis: [
        'User-defined priorities based on emphasized cards',
        'Personalized topic selection',
        'Adaptive focus based on user preferences'
      ],
      systemPromptAddition: `
═══ CUSTOM FOCUS MODE ACTIVE ═══
The user has customized their focus areas. Pay attention to which cards they've emphasized
and tailor your briefing accordingly. Provide balanced guidance across their selected priorities.`,
      metricWeights: {
        readiness_score: 1.0,
        sleep_score: 1.0,
        activity_score: 1.0,
        hrv_avg: 1.0,
        strain: 1.0
      },
      suppressCategories: [],
      prioritizeCategories: [] // Will be determined by custom emphasis
    }
  };

  // Handle aliases (e.g., "balanced" → "balance")
  const aliases: Record<string, FocusMode> = { balanced: 'balance' };
  const resolvedMode = aliases[focusMode] || focusMode;
  return contexts[resolvedMode] || contexts['balance'];
}

export function filterRecommendationsByFocus(
  recommendations: any[],
  focusMode: FocusMode
): any[] {
  const context = getFocusModePromptContext(focusMode);

  // Filter out suppressed categories
  let filtered = recommendations.filter(
    rec => !context.suppressCategories.includes(rec.category)
  );

  // Re-rank based on prioritized categories
  if (context.prioritizeCategories.length > 0) {
    filtered = filtered.sort((a, b) => {
      const aIsPriority = context.prioritizeCategories.includes(a.category);
      const bIsPriority = context.prioritizeCategories.includes(b.category);

      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;

      // If both or neither are priority, sort by original priority
      const priorityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
    });
  }

  return filtered;
}
