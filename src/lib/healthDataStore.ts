// Health data store with session-based uploaded data and demo fallback

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
  try {
    const uploadedData = sessionStorage.getItem("uploadedHealthData");
    if (uploadedData) {
      const parsed = JSON.parse(uploadedData);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : demoHealthData;
    }
  } catch (error) {
    console.error("Error reading uploaded health data:", error);
  }
  return demoHealthData;
};

export const saveHealthData = (data: HealthDataRow[]): void => {
  sessionStorage.setItem("uploadedHealthData", JSON.stringify(data));
};

export const clearHealthData = (): void => {
  sessionStorage.removeItem("uploadedHealthData");
};

export const hasUploadedData = (): boolean => {
  const data = sessionStorage.getItem("uploadedHealthData");
  return data !== null && data !== undefined;
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
export const getTrendData = (metric: keyof HealthDataRow) => {
  const data = getHealthData();
  return data.map(row => parseFloat(row[metric] || "0"));
};
