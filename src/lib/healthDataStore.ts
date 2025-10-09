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

export const resetToDemo = (): void => {
  sessionStorage.removeItem(PROFILES_KEY);
  sessionStorage.removeItem(ACTIVE_PROFILE_KEY);
};

// Demo profile types
export type DemoProfileType = "athletic" | "overtraining" | "moderate";

export interface DemoProfile {
  id: DemoProfileType;
  name: string;
  description: string;
  emoji: string;
  data: HealthDataRow[];
}

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

// 🟢 Athletic Profile - High strain, good recovery
const athleticProfileData: HealthDataRow[] = [
  { Date: "2025-01-01", RestingHR: "48", MaxHR: "185", HRV: "75", SleepHours: "8.0", SleepScore: "88", Strain: "140", ACWR: "1.1", Monotony: "1.5", TrainingLoad: "420", EWMA: "5.8" },
  { Date: "2025-01-02", RestingHR: "50", MaxHR: "186", HRV: "78", SleepHours: "7.5", SleepScore: "85", Strain: "135", ACWR: "1.2", Monotony: "1.6", TrainingLoad: "405", EWMA: "5.6" },
  { Date: "2025-01-03", RestingHR: "49", MaxHR: "184", HRV: "80", SleepHours: "8.5", SleepScore: "92", Strain: "128", ACWR: "1.0", Monotony: "1.4", TrainingLoad: "384", EWMA: "5.4" },
  { Date: "2025-01-04", RestingHR: "47", MaxHR: "187", HRV: "82", SleepHours: "8.0", SleepScore: "90", Strain: "145", ACWR: "1.3", Monotony: "1.7", TrainingLoad: "435", EWMA: "6.0" },
  { Date: "2025-01-05", RestingHR: "51", MaxHR: "185", HRV: "76", SleepHours: "7.8", SleepScore: "86", Strain: "150", ACWR: "1.4", Monotony: "1.8", TrainingLoad: "450", EWMA: "6.2" },
  { Date: "2025-01-06", RestingHR: "50", MaxHR: "183", HRV: "74", SleepHours: "7.5", SleepScore: "84", Strain: "132", ACWR: "1.2", Monotony: "1.6", TrainingLoad: "396", EWMA: "5.7" },
  { Date: "2025-01-07", RestingHR: "49", MaxHR: "184", HRV: "77", SleepHours: "8.2", SleepScore: "89", Strain: "125", ACWR: "1.1", Monotony: "1.5", TrainingLoad: "375", EWMA: "5.5" },
  { Date: "2025-01-08", RestingHR: "48", MaxHR: "186", HRV: "81", SleepHours: "8.5", SleepScore: "93", Strain: "138", ACWR: "1.2", Monotony: "1.6", TrainingLoad: "414", EWMA: "5.9" },
  { Date: "2025-01-09", RestingHR: "50", MaxHR: "185", HRV: "79", SleepHours: "8.0", SleepScore: "87", Strain: "142", ACWR: "1.3", Monotony: "1.7", TrainingLoad: "426", EWMA: "6.1" },
  { Date: "2025-01-10", RestingHR: "49", MaxHR: "184", HRV: "83", SleepHours: "8.3", SleepScore: "91", Strain: "130", ACWR: "1.1", Monotony: "1.5", TrainingLoad: "390", EWMA: "5.6" },
];

// 🟠 Injured / Overtraining Profile - High strain, poor recovery
const overtrainingProfileData: HealthDataRow[] = [
  { Date: "2025-01-01", RestingHR: "58", MaxHR: "178", HRV: "62", SleepHours: "6.5", SleepScore: "72", Strain: "165", ACWR: "1.5", Monotony: "2.2", TrainingLoad: "495", EWMA: "6.8" },
  { Date: "2025-01-02", RestingHR: "60", MaxHR: "179", HRV: "58", SleepHours: "6.0", SleepScore: "68", Strain: "172", ACWR: "1.6", Monotony: "2.4", TrainingLoad: "516", EWMA: "7.2" },
  { Date: "2025-01-03", RestingHR: "62", MaxHR: "177", HRV: "55", SleepHours: "5.5", SleepScore: "65", Strain: "178", ACWR: "1.7", Monotony: "2.5", TrainingLoad: "534", EWMA: "7.5" },
  { Date: "2025-01-04", RestingHR: "64", MaxHR: "176", HRV: "52", SleepHours: "5.8", SleepScore: "63", Strain: "182", ACWR: "1.8", Monotony: "2.6", TrainingLoad: "546", EWMA: "7.8" },
  { Date: "2025-01-05", RestingHR: "63", MaxHR: "175", HRV: "54", SleepHours: "6.2", SleepScore: "66", Strain: "175", ACWR: "1.7", Monotony: "2.5", TrainingLoad: "525", EWMA: "7.4" },
  { Date: "2025-01-06", RestingHR: "61", MaxHR: "177", HRV: "56", SleepHours: "6.5", SleepScore: "70", Strain: "168", ACWR: "1.6", Monotony: "2.3", TrainingLoad: "504", EWMA: "7.0" },
  { Date: "2025-01-07", RestingHR: "60", MaxHR: "178", HRV: "58", SleepHours: "6.8", SleepScore: "73", Strain: "160", ACWR: "1.5", Monotony: "2.2", TrainingLoad: "480", EWMA: "6.7" },
  { Date: "2025-01-08", RestingHR: "59", MaxHR: "179", HRV: "60", SleepHours: "7.0", SleepScore: "75", Strain: "155", ACWR: "1.4", Monotony: "2.1", TrainingLoad: "465", EWMA: "6.5" },
  { Date: "2025-01-09", RestingHR: "58", MaxHR: "180", HRV: "61", SleepHours: "7.2", SleepScore: "77", Strain: "150", ACWR: "1.4", Monotony: "2.0", TrainingLoad: "450", EWMA: "6.3" },
  { Date: "2025-01-10", RestingHR: "57", MaxHR: "180", HRV: "63", SleepHours: "7.5", SleepScore: "78", Strain: "145", ACWR: "1.3", Monotony: "1.9", TrainingLoad: "435", EWMA: "6.0" },
];

// 🔵 Knee Pain / Moderate Active Profile - Mid-level strain, occasional spikes
const moderateProfileData: HealthDataRow[] = [
  { Date: "2025-01-01", RestingHR: "54", MaxHR: "180", HRV: "66", SleepHours: "7.2", SleepScore: "78", Strain: "115", ACWR: "1.1", Monotony: "1.7", TrainingLoad: "345", EWMA: "5.0" },
  { Date: "2025-01-02", RestingHR: "55", MaxHR: "181", HRV: "64", SleepHours: "7.0", SleepScore: "76", Strain: "122", ACWR: "1.2", Monotony: "1.8", TrainingLoad: "366", EWMA: "5.2" },
  { Date: "2025-01-03", RestingHR: "56", MaxHR: "179", HRV: "62", SleepHours: "6.8", SleepScore: "74", Strain: "135", ACWR: "1.3", Monotony: "1.9", TrainingLoad: "405", EWMA: "5.6" },
  { Date: "2025-01-04", RestingHR: "57", MaxHR: "178", HRV: "60", SleepHours: "6.5", SleepScore: "71", Strain: "148", ACWR: "1.5", Monotony: "2.1", TrainingLoad: "444", EWMA: "6.0" },
  { Date: "2025-01-05", RestingHR: "58", MaxHR: "177", HRV: "58", SleepHours: "6.8", SleepScore: "73", Strain: "128", ACWR: "1.3", Monotony: "1.9", TrainingLoad: "384", EWMA: "5.5" },
  { Date: "2025-01-06", RestingHR: "56", MaxHR: "179", HRV: "63", SleepHours: "7.3", SleepScore: "79", Strain: "110", ACWR: "1.1", Monotony: "1.6", TrainingLoad: "330", EWMA: "4.8" },
  { Date: "2025-01-07", RestingHR: "55", MaxHR: "180", HRV: "67", SleepHours: "7.5", SleepScore: "81", Strain: "105", ACWR: "1.0", Monotony: "1.5", TrainingLoad: "315", EWMA: "4.6" },
  { Date: "2025-01-08", RestingHR: "54", MaxHR: "181", HRV: "68", SleepHours: "7.8", SleepScore: "83", Strain: "118", ACWR: "1.2", Monotony: "1.7", TrainingLoad: "354", EWMA: "5.1" },
  { Date: "2025-01-09", RestingHR: "55", MaxHR: "180", HRV: "65", SleepHours: "7.4", SleepScore: "80", Strain: "125", ACWR: "1.2", Monotony: "1.8", TrainingLoad: "375", EWMA: "5.3" },
  { Date: "2025-01-10", RestingHR: "56", MaxHR: "179", HRV: "64", SleepHours: "7.2", SleepScore: "77", Strain: "120", ACWR: "1.2", Monotony: "1.7", TrainingLoad: "360", EWMA: "5.2" },
];

// Demo profiles registry
export const demoProfiles: Record<DemoProfileType, DemoProfile> = {
  athletic: {
    id: "athletic",
    name: "Athletic Profile",
    description: "High strain, good recovery cycles",
    emoji: "🟢",
    data: athleticProfileData,
  },
  overtraining: {
    id: "overtraining",
    name: "Overtraining Profile",
    description: "High strain, poor recovery",
    emoji: "🟠",
    data: overtrainingProfileData,
  },
  moderate: {
    id: "moderate",
    name: "Moderate Active Profile",
    description: "Mid-level strain, occasional spikes",
    emoji: "🔵",
    data: moderateProfileData,
  },
};

// Active demo profile management
const ACTIVE_DEMO_PROFILE_KEY = "activeDemoProfile";

export const getActiveDemoProfile = (): DemoProfileType => {
  const stored = sessionStorage.getItem(ACTIVE_DEMO_PROFILE_KEY);
  return (stored as DemoProfileType) || "athletic";
};

export const setActiveDemoProfile = (profileType: DemoProfileType): void => {
  sessionStorage.setItem(ACTIVE_DEMO_PROFILE_KEY, profileType);
  setActiveProfileId("demo"); // Switch back to demo mode
};

// Default demo data (uses active demo profile)
const demoHealthData: HealthDataRow[] = demoProfiles.athletic.data;

export const getHealthData = (): HealthDataRow[] => {
  const activeProfileId = getActiveProfileId();

  if (activeProfileId === "demo") {
    const activeDemoProfile = getActiveDemoProfile();
    return demoProfiles[activeDemoProfile].data;
  }

  const profiles = getAllProfiles();
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  if (activeProfile && activeProfile.data.length > 0) return activeProfile.data;

  // Fallback to active demo profile
  const activeDemoProfile = getActiveDemoProfile();
  return demoProfiles[activeDemoProfile].data;
};

export const hasUploadedData = (): boolean => {
  const activeProfileId = getActiveProfileId();
  return activeProfileId !== "demo" && getAllProfiles().some((p) => p.id === activeProfileId);
};

// Helper functions to get specific metrics from the latest data
export const getLatestMetrics = () => {
  const data = getHealthData();
  const latest = data[data.length - 1]; // Most recent entry

  return {
    acwr: parseFloat(latest.ACWR || "1.2"),
    monotony: parseFloat(latest.Monotony || "2.