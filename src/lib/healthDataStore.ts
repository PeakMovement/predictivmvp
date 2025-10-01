// Health data store with session-based uploaded data, multi-client profiles, and demo fallback

export interface HealthDataRow {
  Date: string;
  RestingHR: string;
  MaxHR: string;
  HRV: string;
  SleepHours: string;
  SleepScore: string;
  Strain: string;
  ACWR: string;
  Monotony: string;
  TrainingLoad: string;
  EWMA: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  data: HealthDataRow[];
}

// Active profile management
const ACTIVE_PROFILE_KEY = "activeClientProfile";
const PROFILES_KEY = "clientProfiles";

export const getActiveProfileId = (): string => {
  return sessionStorage.getItem(ACTIVE_PROFILE_KEY) || "demo";
};

export const setActiveProfileId = (profileId: string): void => {
  sessionStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
};

export const getAllProfiles = (): ClientProfile[] => {
  try {
    const profiles = sessionStorage.getItem(PROFILES_KEY);
    if (profiles) {
      return JSON.parse(profiles);
    }
  } catch (error) {
    console.error("Error reading client profiles:", error);
  }
  return [];
};

export const saveProfile = (profile: ClientProfile): void => {
  const profiles = getAllProfiles();
  const existingIndex = profiles.findIndex(p => p.id === profile.id);
  
  if (existingIndex >= 0) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }
  
  sessionStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  setActiveProfileId(profile.id);
};

export const deleteProfile = (profileId: string): void => {
  const profiles = getAllProfiles().filter(p => p.id !== profileId);
  sessionStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  
  if (getActiveProfileId() === profileId) {
    setActiveProfileId("demo");
  }
};

export const resetToDemo = (): void => {
  sessionStorage.removeItem(PROFILES_KEY);
  sessionStorage.removeItem(ACTIVE_PROFILE_KEY);
};

// Demo data fallback
const demoHealthData: HealthDataRow[] = [
  {
    Date: "2025-01-01",
    RestingHR: "52",
    MaxHR: "178",
    HRV: "65",
    SleepHours: "7.5",
    SleepScore: "85",
    Strain: "120",
    ACWR: "1.1",
    Monotony: "1.8",
    TrainingLoad: "380",
    EWMA: "5.2"
  },
  {
    Date: "2025-01-02",
    RestingHR: "54",
    MaxHR: "180",
    HRV: "60",
    SleepHours: "7.0",
    SleepScore: "80",
    Strain: "135",
    ACWR: "1.2",
    Monotony: "2.0",
    TrainingLoad: "400",
    EWMA: "5.5"
  },
  {
    Date: "2025-01-03",
    RestingHR: "56",
    MaxHR: "182",
    HRV: "45",
    SleepHours: "6.5",
    SleepScore: "70",
    Strain: "156",
    ACWR: "1.3",
    Monotony: "2.4",
    TrainingLoad: "420",
    EWMA: "6.0"
  }
];

export const getHealthData = (): HealthDataRow[] => {
  const activeProfileId = getActiveProfileId();
  
  if (activeProfileId === "demo") {
    return demoHealthData;
  }
  
  const profiles = getAllProfiles();
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  if (activeProfile && activeProfile.data.length > 0) {
    return activeProfile.data;
  }
  
  return demoHealthData;
};

export const hasUploadedData = (): boolean => {
  const activeProfileId = getActiveProfileId();
  return activeProfileId !== "demo" && getAllProfiles().some(p => p.id === activeProfileId);
};

// Helper functions to get specific metrics from the latest data
export const getLatestMetrics = () => {
  const data = getHealthData();
  const latest = data[data.length - 1]; // Most recent entry
  
  return {
    acwr: parseFloat(latest.ACWR || "1.2"),
    monotony: parseFloat(latest.Monotony || "2.4"),
    strain: parseFloat(latest.Strain || "156"),
    trainingLoad: parseFloat(latest.TrainingLoad || "420"),
    ewma: parseFloat(latest.EWMA || "5.2"),
    hrv: parseFloat(latest.HRV || "45"),
    sleepHours: parseFloat(latest.SleepHours || "7.5"),
    sleepScore: parseFloat(latest.SleepScore || "85"),
    restingHR: parseFloat(latest.RestingHR || "52"),
    maxHR: parseFloat(latest.MaxHR || "178")
  };
};

// Get historical trend data for charts
export const getTrendData = (metric: keyof HealthDataRow): number[] => {
  const data = getHealthData();
  return data.map(row => parseFloat(row[metric] || "0"));
};

// Get last N days of data
export const getLastNDays = (days: number): HealthDataRow[] => {
  const data = getHealthData();
  return data.slice(-days);
};

// Calculate weekly average for a metric
export const getWeeklyAverage = (metric: keyof HealthDataRow): number => {
  const lastWeek = getLastNDays(7);
  const values = lastWeek.map(row => parseFloat(row[metric] || "0"));
  const sum = values.reduce((acc, val) => acc + val, 0);
  return values.length > 0 ? sum / values.length : 0;
};
