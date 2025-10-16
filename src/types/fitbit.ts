// Fitbit TypeScript Type Definitions

export interface HeartRateZone {
  caloriesOut: number;
  max: number;
  min: number;
  minutes: number;
  name: 'Out of Range' | 'Fat Burn' | 'Cardio' | 'Peak';
}

export interface FitbitActivitySummary {
  activeScore: number;
  activityCalories: number;
  caloriesBMR: number;
  caloriesOut: number;
  distances: Array<{
    activity: string;
    distance: number;
  }>;
  elevation: number;
  fairlyActiveMinutes: number;
  floors: number;
  lightlyActiveMinutes: number;
  marginalCalories: number;
  restingHeartRate: number;
  sedentaryMinutes: number;
  steps: number;
  veryActiveMinutes: number;
  heartRateZones: HeartRateZone[];
}

export interface SleepStage {
  count: number;
  minutes: number;
  thirtyDayAvgMinutes?: number;
}

export interface SleepLevels {
  summary: {
    deep: SleepStage;
    light: SleepStage;
    rem: SleepStage;
    wake: SleepStage;
  };
  data: Array<{
    dateTime: string;
    level: 'deep' | 'light' | 'rem' | 'wake';
    seconds: number;
  }>;
}

export interface FitbitSleepData {
  dateOfSleep: string;
  duration: number;
  efficiency: number;
  endTime: string;
  infoCode: number;
  isMainSleep: boolean;
  levels: SleepLevels;
  logId: number;
  minutesAfterWakeup: number;
  minutesAsleep: number;
  minutesAwake: number;
  minutesToFallAsleep: number;
  startTime: string;
  timeInBed: number;
  type: string;
}

export interface FitbitAutoData {
  id: number;
  user_id: string;
  activity: {
    tokens?: any;
    data: {
      summary: FitbitActivitySummary;
    };
    synced_at: string;
  };
  sleep?: {
    data: {
      sleep: FitbitSleepData[];
      summary?: {
        totalMinutesAsleep: number;
        totalSleepRecords: number;
        totalTimeInBed: number;
      };
    };
    synced_at: string;
  };
  fetched_at: string;
}

export interface ParsedFitbitMetrics {
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

// Training Trends Types
export interface FitbitTrend {
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
