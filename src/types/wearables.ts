// Wearable & training metrics TypeScript types

export interface HeartRateZone {
  caloriesOut: number;
  max: number;
  min: number;
  minutes: number;
  name: 'Out of Range' | 'Fat Burn' | 'Cardio' | 'Peak';
}

export interface WearableMetrics {
  // Activity metrics
  steps: number;
  distance: number;
  floors: number;
  elevation: number;
  caloriesOut: number;
  activityCalories: number;
  sedentaryMinutes: number;
  lightlyActiveMinutes: number;
  fairlyActiveMinutes: number;
  veryActiveMinutes: number;

  // Heart rate metrics
  restingHeartRate: number;
  heartRateZones: HeartRateZone[];
  averageHeartRate: number;

  // Sleep metrics
  sleepDuration: number; // in minutes
  sleepEfficiency: number;
  sleepStartTime: string;
  sleepEndTime: string;
  deepSleepMinutes: number;
  lightSleepMinutes: number;
  remSleepMinutes: number;
  awakeSleepMinutes: number;

  // Metadata
  lastSync: string;
  hasSleepData: boolean;
}

export interface TrainingTrend {
  id: string;
  user_id: string;
  date: string;
  acwr: number;
  ewma: number;
  strain: number;
  monotony: number;
  hrv: number;
  training_load: number;
  acute_load: number;
  chronic_load: number;
  created_at: string;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  formattedDate: string;
}

export interface TrendMetric {
  id: 'acwr' | 'ewma' | 'strain' | 'monotony' | 'hrv';
  name: string;
  description: string;
  currentValue: number;
  unit: string;
  thresholds: {
    optimal: { min: number; max: number; color: string };
    caution: { min: number; max: number; color: string };
    risk: { min: number; max: number; color: string };
  };
  data7d: TrendDataPoint[];
  data14d: TrendDataPoint[];
  data30d: TrendDataPoint[];
}
