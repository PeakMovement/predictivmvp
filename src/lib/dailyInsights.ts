export type InsightLevel = "optimal" | "good" | "warning" | "critical";

export interface DailyInsight {
  message: string;
  level: InsightLevel;
  icon: string;
}

// Map insight level to toast variant
export const getToastVariant = (level: InsightLevel): "default" | "destructive" => {
  return level === "critical" ? "destructive" : "default";
};

export const getDailyInsight = (dayData: any): DailyInsight => {
  if (!dayData) {
    return {
      message: "📊 Viewing simulation data",
      level: "good",
      icon: "📊"
    };
  }

  const hrv = parseFloat(dayData.HRV || "0");
  const acwr = parseFloat(dayData.ACWR || "0");
  const sleepHours = parseFloat(dayData.SleepHours || "0");
  const strain = parseFloat(dayData.Strain || "0");
  const sleepScore = parseFloat(dayData.SleepScore || "0");

  // Critical risk indicators
  if (acwr >= 1.6 || hrv < 55 || sleepHours < 5.5) {
    return {
      message: "🔴 Overload risk detected — plan recovery work",
      level: "critical",
      icon: "⚠️"
    };
  }

  // Moderate fatigue indicators
  if (acwr >= 1.3 || hrv < 65 || sleepHours < 6.5 || sleepScore < 70) {
    return {
      message: "🟠 Fatigue rising — consider a light session today",
      level: "warning",
      icon: "🌙"
    };
  }

  // Optimal recovery indicators
  if (hrv >= 70 && acwr <= 1.2 && sleepHours >= 7 && sleepScore >= 80) {
    return {
      message: "🟢 Balanced recovery — all systems optimal",
      level: "optimal",
      icon: "⚡"
    };
  }

  // Default good state
  return {
    message: "✅ Recovery on track — maintain your routine",
    level: "good",
    icon: "✅"
  };
};
