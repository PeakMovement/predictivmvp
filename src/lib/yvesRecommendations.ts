import { supabase } from "@/integrations/supabase/client";

export interface YvesProfile {
  metric: string;
  baseline_value: number;
  current_value: number;
  deviation_pct: number;
  risk_status: string;
  reasoning?: string;
}

export interface TrainingTrend {
  acwr?: number;
  strain?: number;
  monotony?: number;
  hrv?: number;
}

export interface YvesRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionText: string;
  category: string;
  icon?: string;
}

export const generateYvesRecommendations = async (
  userId: string,
  yvesProfiles: YvesProfile[],
  latestTrend: TrainingTrend | null
): Promise<YvesRecommendation[]> => {
  try {
    // Fetch health profile
    const { data: profile } = await supabase
      .from('user_health_profiles')
      .select('profile_data, ai_synthesis')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build context for AI
    const metricsContext = yvesProfiles.map(p => 
      `- ${p.metric}: ${p.current_value.toFixed(1)} (baseline: ${p.baseline_value.toFixed(1)}, deviation: ${p.deviation_pct.toFixed(0)}%, risk: ${p.risk_status})${p.reasoning ? ` - ${p.reasoning}` : ''}`
    ).join('\n');

    const trendsContext = `
- ACWR: ${latestTrend?.acwr?.toFixed(2) || 'N/A'}
- Strain: ${latestTrend?.strain?.toFixed(0) || 'N/A'}
- Monotony: ${latestTrend?.monotony?.toFixed(1) || 'N/A'}
- HRV: ${latestTrend?.hrv?.toFixed(0) || 'N/A'}`;

    const context = `
USER HEALTH PROFILE:
${profile?.ai_synthesis || 'No comprehensive health profile available yet. User should upload their meal plan, medical notes, and training program for personalized recommendations.'}

CURRENT METRICS:
${metricsContext}

RECENT TRENDS:
${trendsContext}

Generate 3 personalized, actionable recommendations considering:
1. Training plan phase and goals (if available in profile)
2. Medical conditions and contraindications (if available in profile)
3. Nutritional needs vs current metrics (if available in profile)
4. Risk of injury or overtraining based on current deviations
5. Specific, concrete actions the user can take today

Focus on the most critical issues first. If no health profile exists, recommend uploading documents.
`;

    // Call Lovable AI for recommendations
    const response = await supabase.functions.invoke('generate-yves-recommendations', {
      body: { context, userId }
    });

    if (response.error) {
      console.error('Failed to generate recommendations:', response.error);
      return getDefaultRecommendations(yvesProfiles, latestTrend, profile);
    }

    return response.data?.recommendations || getDefaultRecommendations(yvesProfiles, latestTrend, profile);

  } catch (error) {
    console.error('Error generating Yves recommendations:', error);
    return getDefaultRecommendations(yvesProfiles, latestTrend, null);
  }
};

// Fallback recommendations if AI fails
function getDefaultRecommendations(
  yvesProfiles: YvesProfile[],
  latestTrend: TrainingTrend | null,
  profile: any
): YvesRecommendation[] {
  const recommendations: YvesRecommendation[] = [];

  // Check if profile exists
  if (!profile?.profile_data || Object.keys(profile.profile_data).length === 0) {
    recommendations.push({
      priority: 'high',
      title: 'Complete Your Health Profile',
      message: 'Upload your meal plan, medical notes, and training program to unlock personalized AI recommendations from Yves.',
      actionText: 'Upload Documents',
      category: 'setup',
      icon: 'FileText'
    });
  }

  // Check high-risk metrics
  const highRiskMetrics = yvesProfiles.filter(p => p.risk_status === 'high');
  if (highRiskMetrics.length > 0) {
    const metricNames = highRiskMetrics.map(m => m.metric).join(', ');
    recommendations.push({
      priority: 'high',
      title: 'High Risk Detected',
      message: `Your ${metricNames} show${highRiskMetrics.length === 1 ? 's' : ''} significant deviation. Consider reducing training intensity today.`,
      actionText: 'View Details',
      category: 'risk',
      icon: 'AlertTriangle'
    });
  }

  // Check ACWR
  if (latestTrend?.acwr) {
    if (latestTrend.acwr > 1.5) {
      recommendations.push({
        priority: 'high',
        title: 'ACWR Elevated',
        message: `Your acute-to-chronic workload ratio is ${latestTrend.acwr.toFixed(2)}. This indicates rapid training load increase. Consider a recovery day.`,
        actionText: 'Adjust Training',
        category: 'training',
        icon: 'Activity'
      });
    } else if (latestTrend.acwr < 0.8) {
      recommendations.push({
        priority: 'medium',
        title: 'Training Load Low',
        message: `Your ACWR is ${latestTrend.acwr.toFixed(2)}, suggesting lower recent training. You may have room to increase intensity if feeling good.`,
        actionText: 'Plan Workout',
        category: 'training',
        icon: 'TrendingUp'
      });
    }
  }

  // Check monotony
  if (latestTrend?.monotony && latestTrend.monotony > 2.0) {
    recommendations.push({
      priority: 'medium',
      title: 'Training Monotony High',
      message: `Your training monotony is ${latestTrend.monotony.toFixed(1)}. Consider varying your workout intensity and types to prevent burnout.`,
      actionText: 'Mix It Up',
      category: 'training',
      icon: 'Shuffle'
    });
  }

  // Ensure we have at least 3 recommendations
  while (recommendations.length < 3) {
    recommendations.push({
      priority: 'low',
      title: 'Stay Consistent',
      message: 'Your metrics are stable. Continue with your current training plan and monitor for any changes.',
      actionText: 'View Trends',
      category: 'general',
      icon: 'Check'
    });
  }

  return recommendations.slice(0, 3);
}
