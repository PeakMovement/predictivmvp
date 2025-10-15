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
