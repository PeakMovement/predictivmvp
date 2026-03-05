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
    if (profiles) return JSON.parse(profiles);
  } catch (error) {
    console.error("Error reading client profiles:", error);
  }
  return [];
};

export const saveProfile = (profile: ClientProfile): void => {
  const profiles = getAllProfiles();
  const existingIndex = profiles.findIndex((p) => p.id === profile.id);

  if (existingIndex >= 0) profiles[existingIndex] = profile;
  else profiles.push(profile);

  sessionStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  setActiveProfileId(profile.id);
};

export const deleteProfile = (profileId: string): void => {
  const profiles = getAllProfiles().filter((p) => p.id !== profileId);
  sessionStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));

  if (getActiveProfileId() === profileId) setActiveProfileId("demo");
};

export const resetData = (): void => {
  sessionStorage.removeItem(PROFILES_KEY);
  sessionStorage.removeItem(ACTIVE_PROFILE_KEY);
};

// Demo profile types removed - using only real data now

// 🧠 Natural-Language Insight Transformer
// Converts short insight phrases into richer, more human summaries
export function evolveInsight(raw: string, context?: any): string {
  const toneStarters = [
    "Your data indicates",
    "Recent patterns suggest",
    "Based on your current recovery metrics",
    "Predictiv analysis shows",
    "According to your training trends",
  ];

  const adviceEndings = [
    "consider a short recovery phase to optimize long-term performance",
    "maintaining current load is ideal for sustained adaptation",
    "now is a good window to add controlled intensity",
    "light mobility or breathwork could enhance recovery balance",
    "keep consistency — your metrics are trending in the right direction",
  ];

  const start = toneStarters[Math.floor(Math.random() * toneStarters.length)];
  const end = adviceEndings[Math.floor(Math.random() * adviceEndings.length)];

  if (raw.toLowerCase().includes("strain")) {
    return `${start} elevated training strain this week (+${context?.strainDelta ?? "N/A"}%). ${end}.`;
  }

  if (raw.toLowerCase().includes("performance")) {
    return `${start} peak readiness across HRV and sleep quality. ${end}.`;
  }

  if (raw.toLowerCase().includes("balance")) {
    return `${start} stable equilibrium between workload and recovery. ${end}.`;
  }

  if (raw.toLowerCase().includes("recovery")) {
    return `${start} recovery metrics are strong — ${end}.`;
  }

  // Default fallback
  return `${start} good overall adaptation today — ${end}.`;
}

// 📊 Insight History Management
export interface InsightHistoryEntry {
  id: string;
  message: string;
  date: string;
  category: string;
  level: "optimal" | "good" | "warning" | "critical";
}

export const saveInsightToHistory = (
  message: string,
  category: string,
  level: "optimal" | "good" | "warning" | "critical"
): void => {
  try {
    const history = getInsightHistory();
    const newInsight: InsightHistoryEntry = {
      id: `insight-${Date.now()}`,
      message,
      date: new Date().toISOString().split('T')[0],
      category,
      level,
    };
    
    // Add to history (keep last 50 insights)
    history.push(newInsight);
    if (history.length > 50) {
      history.shift();
    }
    
    localStorage.setItem("insightHistory", JSON.stringify(history));
  } catch (error) {
    console.error("Error saving insight to history:", error);
  }
};

export const getInsightHistory = (): InsightHistoryEntry[] => {
  try {
    const stored = localStorage.getItem("insightHistory");
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading insight history:", error);
    return [];
  }
};

export const clearInsightHistory = (): void => {
  localStorage.removeItem("insightHistory");
};

// Sample insights initialization removed - using only real insights now

// All demo profile data removed - using only real uploaded data now

export const getHealthData = (): HealthDataRow[] => {
  const activeProfileId = getActiveProfileId();

  // Only return data from uploaded client profiles
  const profiles = getAllProfiles();
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  if (activeProfile && activeProfile.data.length > 0) {
    return activeProfile.data;
  }

  // Return empty array if no uploaded data exists
  return [];
};

export const hasUploadedData = (): boolean => {
  const activeProfileId = getActiveProfileId();
  return activeProfileId !== "demo" && getAllProfiles().some((p) => p.id === activeProfileId);
};

// Helper functions to get specific metrics from the latest data
export const getLatestMetrics = () => {
  const data = getHealthData();
  
  // Return empty metrics if no data exists
  if (data.length === 0) {
    return {
      acwr: 0,
      monotony: 0,
      strain: 0,
      hrv: 0,
      sleepScore: 0,
    };
  }
  
  const latest = data[data.length - 1]; // Most recent entry

  return {
    acwr: parseFloat(latest.ACWR || "0"),
    monotony: parseFloat(latest.Monotony || "0"),
    strain: parseFloat(latest.Strain || "0"),
    hrv: parseFloat(latest.HRV || "0"),
    sleepScore: parseFloat(latest.SleepScore || "0"),
  };
};