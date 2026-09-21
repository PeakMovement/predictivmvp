// ═══════════════════════════════════════════════════════════════════════════════
// LAYERED REASONING ENGINE - 4 LAYERS THAT MUST PASS BEFORE SPEAKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface LayerResult {
  pass: boolean;
  confidence: number;
  reason: string;
  findings: Record<string, unknown>;
}

export interface ReasoningContext {
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
  _recoveryTrends: any[],
  userBaselines: any[],
  userDeviations: any[]
): LayerResult {
  const findings: Record<string, unknown> = {};
  let confidence = 0;

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

  const readinessTrend = latest?.readiness_score && previous?.readiness_score
    ? latest.readiness_score - previous.readiness_score : null;
  const sleepTrend = latest?.sleep_score && previous?.sleep_score
    ? latest.sleep_score - previous.sleep_score : null;
  const hrvTrend = latest?.hrv_avg && previous?.hrv_avg
    ? latest.hrv_avg - previous.hrv_avg : null;

  findings.trend_direction = {
    readiness: readinessTrend !== null ? (readinessTrend > 0 ? 'improving' : readinessTrend < 0 ? 'declining' : 'stable') : 'unknown',
    sleep: sleepTrend !== null ? (sleepTrend > 0 ? 'improving' : sleepTrend < 0 ? 'declining' : 'stable') : 'unknown',
    hrv: hrvTrend !== null ? (hrvTrend > 0 ? 'improving' : hrvTrend < 0 ? 'declining' : 'stable') : 'unknown',
  };

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

  const latestTrend = trainingTrends[0];
  if (latestTrend?.acwr !== null) {
    const acwr = latestTrend.acwr;
    findings.recovery_vs_load = {
      acwr,
      zone: acwr < 0.8 ? 'underloading' : acwr > 1.5 ? 'overloading' : acwr > 1.3 ? 'elevated' : 'optimal',
      balance: acwr >= 0.8 && acwr <= 1.3 ? 'balanced' : 'imbalanced'
    };
    confidence += 25;
  }

  const significantDeviations = userDeviations.filter(d => Math.abs(d.deviation || 0) > 15);
  findings.trajectory_changes = {
    count: significantDeviations.length,
    metrics: significantDeviations.map(d => d.metric),
    highest_deviation: significantDeviations.length > 0
      ? Math.max(...significantDeviations.map(d => Math.abs(d.deviation || 0)))
      : 0
  };

  if (significantDeviations.length > 0) confidence += 15;

  if (userBaselines.length >= 3) {
    findings.baseline_established = true;
    confidence += 20;
  } else {
    findings.baseline_established = false;
  }

  const pass = confidence >= 20;
  const reason = pass
    ? `Physiological state analyzable (confidence: ${confidence}%)`
    : `Insufficient physiological data for analysis`;

  return { pass, confidence: Math.min(confidence, 100), reason, findings };
}

// Layer 2: Risk Trajectory Evaluation
function evaluateRiskTrajectory(
  layer1: LayerResult,
  _riskTrajectories: any[],
  healthAnomalies: any[],
  userDeviations: any[],
  symptomCheckIns: any[]
): LayerResult {
  const findings: Record<string, unknown> = {};
  let confidence = 0;

  if (!layer1.pass) {
    return {
      pass: false,
      confidence: 0,
      reason: "Cannot evaluate risk trajectory without physiological state",
      findings: { blocked_by: "layer1_failed" }
    };
  }

  const significantDeviations = userDeviations.filter(d => Math.abs(d.deviation || 0) > 10);
  const criticalDeviations = userDeviations.filter(d => d.risk_zone === 'high-risk' || d.risk_zone === 'moderate-risk');
  const recentSymptoms = symptomCheckIns.filter(s => {
    const symptomDate = new Date(s.created_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return symptomDate >= threeDaysAgo;
  });

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

  const earlyWarnings: string[] = [];

  const physiologicalTrends = layer1.findings.trend_direction as Record<string, string> | undefined;
  if (physiologicalTrends) {
    const decliningMetrics = Object.entries(physiologicalTrends)
      .filter(([_, trend]) => trend === 'declining')
      .map(([metric]) => metric);
    if (decliningMetrics.length >= 2) {
      earlyWarnings.push(`Multiple metrics declining: ${decliningMetrics.join(', ')}`);
    }
  }

  if (criticalDeviations.length > 0) {
    earlyWarnings.push(`Metrics in risk zone: ${criticalDeviations.map(d => d.metric).join(', ')}`);
    confidence += 20;
  }

  if (recentSymptoms.length > 0 && significantDeviations.length > 0) {
    earlyWarnings.push("Symptoms correlating with metric deviations");
    confidence += 15;
  }

  findings.early_warning_detection = {
    warnings: earlyWarnings,
    count: earlyWarnings.length,
    severity: earlyWarnings.length >= 2 ? 'elevated' : earlyWarnings.length === 1 ? 'mild' : 'none'
  };

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
    meaningful: accumulatedRisk >= 25
  };

  const isNoise = findings.noise_filter && (findings.noise_filter as any).is_noise;
  const riskIsMeaningful = (findings.risk_accumulation as any).meaningful;

  if (isNoise && !riskIsMeaningful) {
    return {
      pass: false,
      confidence,
      reason: "Signal is noise without meaningful risk - SILENCE IS APPROPRIATE",
      findings
    };
  }

  const reason = `Risk trajectory evaluated: ${(findings.risk_accumulation as any).level} risk`;
  return { pass: true, confidence: Math.min(confidence, 100), reason, findings };
}

// Layer 3: Behavior & Psychology Evaluation
function evaluateBehaviorPsychology(
  layer2: LayerResult,
  adaptationProfile: any,
  _engagementHistory: any[],
  recentRecommendations: any[]
): LayerResult {
  const findings: Record<string, unknown> = {};
  let confidence = 50;
  let reason = "";

  if (!layer2.pass && layer2.reason.includes("SILENCE")) {
    return {
      pass: false,
      confidence: 0,
      reason: layer2.reason,
      findings: { blocked_by: "layer2_silence" }
    };
  }

  const followedCount = recentRecommendations.filter(r => r.feedback_score >= 4).length;
  const totalRecommendations = recentRecommendations.length;
  const complianceRate = totalRecommendations > 0
    ? Math.round((followedCount / totalRecommendations) * 100)
    : 50;

  findings.compliance_history = {
    followed: followedCount,
    total: totalRecommendations,
    rate: complianceRate,
    trend: complianceRate > 60 ? 'good' : complianceRate > 40 ? 'moderate' : 'low'
  };

  const acknowledgedRecs = recentRecommendations.filter(r => r.acknowledged_at);
  const avgResponseHours = adaptationProfile?.avg_response_time_hours || null;

  findings.response_patterns = {
    acknowledged_count: acknowledgedRecs.length,
    avg_response_hours: avgResponseHours,
    responsiveness: avgResponseHours !== null
      ? (avgResponseHours < 6 ? 'high' : avgResponseHours < 24 ? 'moderate' : 'low')
      : 'unknown'
  };

  const recentDismissals = recentRecommendations.filter(r => r.feedback_score <= 2).length;
  const dismissalRate = totalRecommendations > 0
    ? Math.round((recentDismissals / totalRecommendations) * 100)
    : 0;

  findings.fatigue_override = {
    dismissal_rate: dismissalRate,
    showing_fatigue: dismissalRate > 40,
    recommendation: dismissalRate > 40 ? 'reduce_frequency' : 'maintain_frequency'
  };

  if (complianceRate > 60) {
    confidence += 20;
  } else if (complianceRate < 40 && totalRecommendations >= 3) {
    confidence -= 10;
  }

  if ((findings.fatigue_override as any).showing_fatigue) {
    confidence -= 15;
    reason = "User showing recommendation fatigue - be more selective";
  } else {
    reason = `Behavior patterns analyzed: ${complianceRate}% compliance rate`;
  }

  return { pass: true, confidence: Math.max(confidence, 30), reason, findings };
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

  if (!layer3.pass && (layer3.findings as any).blocked_by) {
    return {
      pass: false,
      confidence: 0,
      reason: layer3.reason,
      findings: { blocked_by: (layer3.findings as any).blocked_by }
    };
  }

  const explicitInterests: string[] = [];
  if (userInterests?.interests?.length > 0) explicitInterests.push(...userInterests.interests);
  if (userInterests?.hobbies?.length > 0) explicitInterests.push(...userInterests.hobbies);
  if (userTraining?.preferred_activities?.length > 0) explicitInterests.push(...userTraining.preferred_activities);

  findings.explicit_interests = {
    count: explicitInterests.length,
    items: explicitInterests.slice(0, 10),
    has_interests: explicitInterests.length > 0
  };

  if (explicitInterests.length > 0) confidence += 15;

  const preferredCategories = adaptationProfile?.preferred_categories || {};
  const effectiveTone = adaptationProfile?.effective_tone || 'balanced';
  const followThroughRate = adaptationProfile?.follow_through_rate || 50;

  findings.implicit_preferences = {
    preferred_categories: preferredCategories,
    effective_tone: effectiveTone,
    follow_through_rate: followThroughRate
  };

  const categoryRankings: Record<string, number> = {};
  for (const [category, rate] of Object.entries(preferredCategories)) {
    categoryRankings[category] = rate as number;
  }

  const rankedCategories = Object.entries(categoryRankings)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, rate]) => ({ category: cat, adherence_probability: rate }));

  findings.adherence_ranking = {
    categories: rankedCategories,
    suppress_low_adherence: rankedCategories.filter(c => c.adherence_probability < 30).map(c => c.category),
    prioritize_high_adherence: rankedCategories.filter(c => c.adherence_probability > 60).map(c => c.category)
  };

  const userGoals = userProfile?.goals || [];
  findings.goals_alignment = { goals: userGoals, has_goals: userGoals.length > 0 };
  if (userGoals.length > 0) confidence += 10;

  const reason = `Interests & adherence evaluated: ${rankedCategories.length} categories ranked`;
  return { pass: true, confidence: Math.min(confidence, 100), reason, findings };
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

  const riskLevel = (layer2.findings.risk_accumulation as any)?.level;
  const earlyWarnings = (layer2.findings.early_warning_detection as any)?.warnings || [];
  if (riskLevel === 'high' || riskLevel === 'moderate') {
    why_this_issue = `Risk level is ${riskLevel} with ${earlyWarnings.length} early warning(s)`;
  } else if (layer1.pass) {
    why_this_issue = "Physiological state requires attention based on trend analysis";
  }

  const trajectoryChanges = (layer1.findings.trajectory_changes as any);
  if (trajectoryChanges?.count > 0) {
    why_now = `${trajectoryChanges.count} significant trajectory change(s) detected today`;
  } else if (earlyWarnings.length > 0) {
    why_now = "Early warning signals detected that warrant timely intervention";
  }

  const complianceHistory = (layer3.findings.compliance_history as any);
  const adherenceRanking = (layer4.findings.adherence_ranking as any);
  if (complianceHistory?.rate > 60) {
    why_this_intervention = "User has high compliance history - direct intervention appropriate";
  } else if (adherenceRanking?.prioritize_high_adherence?.length > 0) {
    why_this_intervention = `Intervention in user's high-adherence categories: ${adherenceRanking.prioritize_high_adherence.join(', ')}`;
  }

  const goals = userProfile?.goals || [];
  const interests = (layer4.findings.explicit_interests as any)?.items || [];
  if (goals.length > 0) {
    why_this_user = `Aligned with user's goals: ${goals.slice(0, 2).join(', ')}`;
  } else if (interests.length > 0) {
    why_this_user = `Tailored to user's interests: ${interests.slice(0, 2).join(', ')}`;
  }

  const all_justified = !!(why_this_issue && why_now && why_this_intervention && why_this_user);
  return { why_this_issue, why_now, why_this_intervention, why_this_user, all_justified };
}

// Main Reasoning Orchestrator
export function executeLayeredReasoning(
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

  const weights = { layer1: 0.35, layer2: 0.30, layer3: 0.20, layer4: 0.15 };
  const overall_confidence = Math.round(
    layer1.confidence * weights.layer1 +
    layer2.confidence * weights.layer2 +
    layer3.confidence * weights.layer3 +
    layer4.confidence * weights.layer4
  );

  const justification = buildJustification(layer1, layer2, layer3, layer4, userProfile);

  let should_speak = true;
  let silence_reason: string | undefined;

  const hasNonWearableContext = symptomCheckIns.length > 0
    || (userProfile?.name || userProfile?.activity_level || userProfile?.goals?.length > 0)
    || (userInterests?.hobbies || userInterests?.interests)
    || (userTraining?.preferred_activities || userTraining?.training_frequency);

  if (!layer1.pass && !hasNonWearableContext) {
    should_speak = false;
    silence_reason = layer1.reason;
  } else if (overall_confidence < 15 && !hasNonWearableContext) {
    should_speak = false;
    silence_reason = `Confidence too low (${overall_confidence}%) to provide meaningful guidance`;
  }

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
