import {
  BarChart3,
  Activity,
  Calendar,
  TrendingUp,
  Gauge,
  ChevronLeft,
  ChevronRight,
  FileText,
  Play,
  CheckCircle,
  HelpCircle,
  Check,
  X,
  CalendarPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import React from "react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLiveData } from "@/contexts/LiveDataContext";
import { HealthDataRow } from "@/lib/healthDataStore";
import { UnifiedTrendCard } from "@/components/trends/UnifiedTrendCard";
import { useTrainingTrends } from "@/hooks/useTrainingTrends";
import { SessionLogList } from "@/components/dashboard/SessionLogList";


// ✅ getSessionLogs, generateSuggestions, getGraphData and helpers remain unchanged
// (Paste your original implementations here — they don’t affect the grid fix)

const getSessionLogs = (csvData: HealthDataRow[]) => {
  if (csvData.length === 0) return [];
  return csvData
    .slice(-5)
    .map((row, index) => ({
      title: `Training Session ${csvData.length - 4 + index}`,
      date: row.Date || "N/A",
      load: parseFloat(row.TrainingLoad || "0"),
      type: "Training",
    }))
    .reverse();
};

const generateSuggestions = (currentData: HealthDataRow | null) => {
  if (!currentData) return [];
  const suggestions = [];
  const hrv = parseFloat(currentData.HRV || "0");
  const acwr = parseFloat(currentData.ACWR || "0");
  const monotony = parseFloat(currentData.Monotony || "0");
  const sleepHours = parseFloat(currentData.SleepHours || "0");
  const sleepScore = parseFloat(currentData.SleepScore || "0");
  const strain = parseFloat(currentData.Strain || "0");
  if (hrv < 65)
    suggestions.push({
      id: 1,
      text: "Your HRV is below optimal. Add 2 mobility sessions focusing on recovery.",
      type: "actionable",
      category: "Recovery",
      accentColor: "yellow",
      hasVideo: true,
      hasPdf: true,
    });
  if (acwr > 1.5)
    suggestions.push({
      id: 2,
      text: "Overload risk detected. Schedule a deload week to reduce training intensity by 20%.",
      type: "actionable",
      category: "Training",
      accentColor: "red",
      hasVideo: true,
      hasPdf: true,
    });
  if (sleepHours >= 7 && sleepScore > 80)
    suggestions.push({
      id: 3,
      text: "Excellent recovery! This is a great day for a high-intensity performance session.",
      type: "actionable",
      category: "Training",
      accentColor: "green",
      hasVideo: true,
      hasPdf: false,
    });
  if (monotony > 2.0)
    suggestions.push({
      id: 4,
      text: "Training is too repetitive. Add varied training modalities this week.",
      type: "actionable",
      category: "Training",
      accentColor: "yellow",
      hasVideo: false,
      hasPdf: true,
    });
  if (strain > 150)
    suggestions.push({
      id: 5,
      text: "Strain is elevated. Consider adding an extra recovery day this week.",
      type: "actionable",
      category: "Recovery",
      accentColor: "red",
      hasVideo: true,
      hasPdf: true,
    });
  if (acwr >= 0.8 && acwr <= 1.3 && hrv >= 65)
    suggestions.push({
      id: 6,
      text: "Your acute:chronic ratio suggests optimal adaptation window. Great progress!",
      type: "insight",
      category: "Insight",
      accentColor: "green",
      hasVideo: false,
      hasPdf: false,
    });
  return suggestions;
};

// ✅ AccountabilityChallenges, SessionLogCard, SessionLogList, CircularGauge, GraphCarousel remain unchanged
// (Paste your versions — they do not affect layout alignment)

const SessionLogCard = ({ title, date, load }: { title: string; date: string; load: number }) => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl p-4 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out transform-gpu">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <span className="px-2 py-1 text-xs rounded-lg font-medium bg-blue-500/20 text-blue-400">Training</span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar size={14} />
        <span>{date}</span>
      </div>
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-primary animate-bounce-subtle" />
        <span className="font-medium text-foreground">{load > 0 ? load.toFixed(0) : "–"}</span>
        <span className="text-muted-foreground text-xs">load</span>
      </div>
    </div>
  </div>
);

const CircularGauge = ({
  title,
  value,
  maxValue,
  unit,
}: {
  title: string;
  value: number;
  maxValue: number;
  unit: string;
}) => {
  const percentage = (value / maxValue) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
          <Gauge size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              fill="transparent"
              className="opacity-20"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ Main Page Component
export const Training = () => {
  const { currentDayData } = useLiveData();
  const { trends, isLoading: trendsLoading, refresh, userId } = useTrainingTrends({ days: 7 });
  const [suggestions, setSuggestions] = useState<ReturnType<typeof generateSuggestions>>([]);

  // Find latest trend with non-null monotony/strain
  const latestAvailableTrend = trends?.find(t => t.monotony != null && t.strain != null) || null;

  useEffect(() => {
    const newSuggestions = generateSuggestions(currentDayData);
    setSuggestions(newSuggestions);
  }, [currentDayData]);
  
  // Listen for Fitbit data refresh
  useEffect(() => {
    const handleDataRefreshed = () => {
      console.log("[Training] Fitbit data refreshed, reloading trends...");
      refresh();
    };
    
    window.addEventListener("fitbit_trends_refresh", handleDataRefreshed);
    return () => window.removeEventListener("fitbit_trends_refresh", handleDataRefreshed);
  }, [refresh]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-32">
        <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Training Analytics</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {userId ? "Track your workouts and training progression" : "Please connect your Fitbit to see your data"}
            </p>
          </div>

          {!userId && (
            <div className="text-center py-12 px-4 bg-glass backdrop-blur-xl border border-glass-border rounded-2xl mb-8">
              <p className="text-muted-foreground mb-4">No user authenticated</p>
              <p className="text-sm text-muted-foreground">Please log in to view your training data</p>
            </div>
          )}

          {userId && (
            <>
              {/* Accountability Challenges */}
              <div className="mb-6 md:mb-8">{/* your AccountabilityChallenges component here */}</div>

              {/* Session Logs and Gauges */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="lg:col-span-2 w-full">
                  <SessionLogList />
                </div>
                <div className="space-y-4 md:space-y-6 w-full">
                  <CircularGauge
                    title="Training Monotony"
                    value={latestAvailableTrend?.monotony ? parseFloat(latestAvailableTrend.monotony.toFixed(1)) : 0}
                    maxValue={5}
                    unit="ratio"
                  />
                  <CircularGauge
                    title="Training Strain"
                    value={latestAvailableTrend?.strain ? Math.round(latestAvailableTrend.strain) : 0}
                    maxValue={200}
                    unit="TSS"
                  />
                </div>
              </div>

              {/* Trend Analysis Carousel */}
              <div className="mb-6 md:mb-8">
                <UnifiedTrendCard />
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
