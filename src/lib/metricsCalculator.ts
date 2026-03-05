/**
 * Unified Metrics Calculator
 * Provides consistent calculation logic across Dashboard and Weekly Insights
 */

export interface TrendData {
  date: string;
  acwr?: number | null;
  strain?: number | null;
  sleep_score?: number | null;
  hrv?: number | null;
  training_load?: number | null;
  monotony?: number | null;
  ewma?: number | null;
  acute_load?: number | null;
  chronic_load?: number | null;
  [key: string]: any; // Allow additional properties
}

export interface MetricCalculation {
  latest: {
    acwr: number | null;
    strain: number | null;
    sleepScore: number | null;
    hrv: number | null;
    trainingLoad: number | null;
    monotony: number | null;
  };
  averages: {
    acwr: number | null;
    strain: number | null;
    sleepScore: number | null;
    hrv: number | null;
    trainingLoad: number | null;
    monotony: number | null;
  };
}

const average = (arr: (number | null | undefined)[]): number | null => {
  const validValues = arr.filter((v): v is number => v != null && !isNaN(v));
  if (validValues.length === 0) return null;
  return validValues.reduce((a, b) => a + b, 0) / validValues.length;
};

/**
 * Calculate sleep score from Fitbit sleep data
 * Formula: efficiency (0-100) * 0.7 + capped duration score * 30
 */
export const calculateSleepScore = (efficiency: number, durationMinutes: number): number => {
  const durationHours = durationMinutes / 60;
  const durationScore = Math.min(durationHours / 8, 1); // Cap at 8 hours
  return Math.round(efficiency * 0.7 + durationScore * 30);
};

/**
 * Calculate metrics from Fitbit trends data
 * Returns both latest values and 7-day averages
 */
export const calculateMetrics = (trends: TrendData[]): MetricCalculation => {
  if (!trends || trends.length === 0) {
    return {
      latest: {
        acwr: null,
        strain: null,
        sleepScore: null,
        hrv: null,
        trainingLoad: null,
        monotony: null,
      },
      averages: {
        acwr: null,
        strain: null,
        sleepScore: null,
        hrv: null,
        trainingLoad: null,
        monotony: null,
      },
    };
  }

  const latest = trends[0]; // Most recent
  const last7Days = trends.slice(0, Math.min(7, trends.length));

  return {
    latest: {
      acwr: latest.acwr ?? null,
      strain: latest.strain ?? null,
      sleepScore: latest.sleep_score ?? null,
      hrv: latest.hrv ?? null,
      trainingLoad: latest.training_load ?? null,
      monotony: latest.monotony ?? null,
    },
    averages: {
      acwr: average(last7Days.map(t => t.acwr)),
      strain: average(last7Days.map(t => t.strain)),
      sleepScore: average(last7Days.map(t => t.sleep_score)),
      hrv: average(last7Days.map(t => t.hrv)),
      trainingLoad: average(last7Days.map(t => t.training_load)),
      monotony: average(last7Days.map(t => t.monotony)),
    },
  };
};

/**
 * Estimate training load from activity data
 * Used as fallback when trends aren't calculated yet
 */
export const estimateTrainingLoad = (activity: any): number => {
  const activeMinutes = (activity?.fairlyActiveMinutes || 0) + (activity?.veryActiveMinutes || 0);
  const avgHR = activity?.averageHeartRate || activity?.restingHeartRate || 70;
  return activeMinutes > 0 ? Math.round((activeMinutes * avgHR) / 10) : 0;
};
