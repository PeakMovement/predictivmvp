import { FitbitTrend } from "@/types/fitbit";

interface YvesProfile {
  metric: string;
  baseline_value: number;
  current_value: number;
  deviation_pct: number;
  risk_status: string;
}

interface DynamicPromptContext {
  yvesProfiles: YvesProfile[];
  latestTrend: FitbitTrend | null;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

export interface DynamicRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionText: string;
  icon: any;
  category: string;
}

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

export const generateDynamicTodaysPlan = (
  yvesProfiles: YvesProfile[],
  latestTrend: FitbitTrend | null
): string => {
  const timeOfDay = getTimeOfDay();
  const recommendations: string[] = [];

  // Find critical deviations in YVES profiles
  const criticalProfile = yvesProfiles.find(p => p.risk_status === 'high' && Math.abs(p.deviation_pct) > 15);
  const cautionProfile = yvesProfiles.find(p => p.risk_status === 'moderate' && Math.abs(p.deviation_pct) > 10);

  if (criticalProfile) {
    const metricName = criticalProfile.metric.toUpperCase();
    const direction = criticalProfile.deviation_pct > 0 ? 'above' : 'below';
    const deviation = Math.abs(criticalProfile.deviation_pct).toFixed(0);
    
    recommendations.push(
      `⚠️ ${metricName} Alert: Your ${criticalProfile.metric} (${criticalProfile.current_value.toFixed(1)}) is ${deviation}% ${direction} your baseline (${criticalProfile.baseline_value.toFixed(1)}). `
    );

    if (metricName === 'HRV' && criticalProfile.deviation_pct < 0) {
      recommendations.push('Priority: Recovery day. Swap training for mobility work.');
    } else if (metricName === 'STRAIN' && criticalProfile.deviation_pct > 0) {
      recommendations.push('Priority: Reduce intensity by 30% today.');
    }
  } else if (cautionProfile) {
    const deviation = Math.abs(cautionProfile.deviation_pct).toFixed(0);
    recommendations.push(
      `⚡ ${cautionProfile.metric.toUpperCase()} is ${deviation}% off baseline. Monitor closely today.`
    );
  }

  // Check latestTrend for ACWR and Monotony
  if (latestTrend) {
    if (latestTrend.acwr && latestTrend.acwr > 1.5) {
      recommendations.push(
        `🔴 ACWR is elevated (${latestTrend.acwr.toFixed(2)}). High injury risk — reduce load by 20%.`
      );
    } else if (latestTrend.acwr && latestTrend.acwr >= 0.8 && latestTrend.acwr <= 1.3) {
      const hrvProfile = yvesProfiles.find(p => p.metric === 'hrv');
      if (hrvProfile && hrvProfile.deviation_pct > 5) {
        recommendations.push(
          `✅ Perfect training window: ACWR (${latestTrend.acwr.toFixed(2)}) is optimal and HRV is ${hrvProfile.deviation_pct.toFixed(0)}% above baseline. Great day for intensity.`
        );
      }
    }

    if (latestTrend.monotony && latestTrend.monotony > 2.0) {
      recommendations.push(
        `🔄 Monotony alert (${latestTrend.monotony.toFixed(1)}): Add variety — consider cross-training or different movement patterns.`
      );
    }
  }

  // Time-based context
  let greeting = '';
  if (timeOfDay === 'morning') {
    greeting = '🌅 Good morning! ';
  } else if (timeOfDay === 'evening') {
    greeting = '🌙 Evening check-in: ';
  }

  if (recommendations.length === 0) {
    return `${greeting}All metrics are within your personal baselines. Continue with your planned training.`;
  }

  return greeting + recommendations.join(' ');
};

export const generateDynamicDailyNudge = (
  yvesProfiles: YvesProfile[],
  latestTrend: FitbitTrend | null
): string => {
  const timeOfDay = getTimeOfDay();
  
  // Find most critical deviation
  const sortedByDeviation = [...yvesProfiles].sort(
    (a, b) => Math.abs(b.deviation_pct) - Math.abs(a.deviation_pct)
  );
  const topDeviation = sortedByDeviation[0];

  if (!topDeviation) {
    return 'Keep monitoring your metrics — data sync needed for personalized insights.';
  }

  const direction = topDeviation.deviation_pct > 0 ? 'elevated' : 'suppressed';
  const deviation = Math.abs(topDeviation.deviation_pct).toFixed(0);

  if (timeOfDay === 'morning') {
    if (topDeviation.metric === 'hrv' && topDeviation.deviation_pct > 8) {
      return `Your HRV recovered to ${topDeviation.current_value.toFixed(0)}ms (baseline: ${topDeviation.baseline_value.toFixed(0)}ms) — ${deviation}% above normal. Excellent day to push intensity.`;
    } else if (topDeviation.metric === 'strain' && topDeviation.deviation_pct > 15) {
      return `Strain is ${direction} at ${topDeviation.current_value.toFixed(0)} (${deviation}% above baseline). Consider light cardio only.`;
    }
  } else if (timeOfDay === 'evening') {
    if (latestTrend?.strain) {
      const strainChange = topDeviation.metric === 'strain' ? topDeviation.deviation_pct : 0;
      if (strainChange > 15) {
        return `Today's strain (${latestTrend.strain.toFixed(0)}) was ${deviation}% higher than your baseline. Prioritize 8+ hours sleep tonight.`;
      }
    }
  }

  return `${topDeviation.metric.toUpperCase()} is ${deviation}% ${direction}. ${
    topDeviation.risk_status === 'high' ? 'Take action.' : 'Monitor tomorrow.'
  }`;
};

export const getPersonalizedReasoning = (
  metricName: string,
  deviation: number,
  baseline: number,
  current: number
): string => {
  const pctChange = ((Math.abs(current - baseline) / baseline) * 100).toFixed(0);
  const direction = current > baseline ? 'above' : 'below';

  return `Your ${metricName} is currently ${current.toFixed(1)}, which is ${pctChange}% ${direction} your personal baseline of ${baseline.toFixed(1)}. This ${deviation > 15 ? 'significant' : 'moderate'} deviation suggests ${
    direction === 'below' ? 'reduced capacity' : 'elevated stress'
  }.`;
};
