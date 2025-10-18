import {
  TrendingUp,
  Target,
  AlertTriangle,
  FileText,
  Play,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  X,
  Heart,
  Activity,
  Zap,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { useLiveData } from "@/contexts/LiveDataContext";
import { evolveInsight, HealthDataRow } from "@/lib/healthDataStore";
import { TrendCarousel } from "@/components/trends/TrendCarousel";
import { generateDynamicTodaysPlan, generateDynamicDailyNudge } from "@/lib/dynamicPrompts";
import { supabase } from "@/integrations/supabase/client";
import { useFitbitTrends } from "@/hooks/useFitbitTrends";
import { FitbitSyncStatus } from "@/components/FitbitSyncStatus";

// ---- Metric Helpers ---- //
const parseMetrics = (data: HealthDataRow | null) =>
  data
    ? {
        acwr: parseFloat(data.ACWR || "0"),
        monotony: parseFloat(data.Monotony || "0"),
        strain: parseFloat(data.Strain || "0"),
        trainingLoad: parseFloat(data.TrainingLoad || "0"),
        ewma: parseFloat(data.EWMA || "0"),
        hrv: parseFloat(data.HRV || "0"),
        sleepHours: parseFloat(data.SleepHours || "0"),
        sleepScore: parseFloat(data.SleepScore || "0"),
        restingHR: parseFloat(data.RestingHR || "0"),
        maxHR: parseFloat(data.MaxHR || "0"),
      }
    : null;

const getMetrics = (data: HealthDataRow | null) => {
  const d = parseMetrics(data);
  if (!d) return [];
  return [
    { name: "ACWR", value: d.acwr.toFixed(1), status: d.acwr > 1.5 ? "red" : d.acwr > 1.3 ? "yellow" : "green" },
    { name: "Monotony", value: d.monotony.toFixed(1), status: d.monotony > 2.0 ? "yellow" : "green" },
    {
      name: "Strain",
      value: d.strain.toString(),
      status: d.strain > 150 ? "red" : d.strain > 130 ? "yellow" : "green",
    },
  ];
};

// ---- Engagement Overview ---- //
const EngagementCard = () => {
  const [engagement, setEngagement] = useState<any[]>([]);
  useEffect(() => {
    const fetchEngagement = async () => {
      const { data, error } = await supabase
        .from("insight_engagement_summary")
        .select("*")
        .order("engagement_rate", { ascending: false });
      if (!error && data) setEngagement(data);
    };
    fetchEngagement();
  }, []);
  if (engagement.length === 0) return null;
  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-[1.02] transition-all">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="text-primary" size={18} /> Engagement Overview
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {engagement.map((e, i) => (
          <div key={i} className="p-4 rounded-xl bg-black/30 border border-white/10">
            <p className="text-sm text-muted-foreground">{e.metric}</p>
            <p className="text-2xl font-semibold text-primary">{e.engagement_rate?.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Actions: {e.total_actions ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- Simple Metric Card ---- //
const MetricCard = ({ metric }: { metric: { name: string; value: string; status: string } }) => {
  const colors = { green: "bg-green-500", yellow: "bg-yellow-500", red: "bg-red-500" } as any;
  return (
    <div className="bg-glass border border-glass-border rounded-2xl p-4 shadow-glass hover:bg-glass-highlight transition-all hover:scale-105">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-muted-foreground">{metric.name}</h3>
        <div className={`w-2.5 h-2.5 rounded-full ${colors[metric.status]}`} />
      </div>
      <p className="text-xl font-bold text-foreground">{metric.value ?? "–"}</p>
    </div>
  );
};

// ---- Welcome Header ---- //
const WelcomeHeader = () => (
  <div className="text-center mb-8 space-y-3">
    <h1 className="text-xl font-light text-muted-foreground">Hello,</h1>
    <h2 className="text-3xl font-bold text-foreground">Athlete</h2>
    <p className="text-muted-foreground">Here's your training overview for today</p>
    <div className="flex justify-center">
      <FitbitSyncStatus />
    </div>
  </div>
);

// ---- Graph Carousel Placeholder ---- //
const GraphCarousel = () => (
  <div className="mb-6">
    <div className="text-center mb-6">
      <h3 className="text-lg font-semibold text-foreground">Training Trends</h3>
      <p className="text-sm text-muted-foreground">Comprehensive metrics from your Fitbit data</p>
    </div>
    <TrendCarousel />
  </div>
);

// ---- Weekly Insights Placeholder ---- //
const WeeklyInsightsCard = () => (
  <div className="bg-glass border border-glass-border rounded-2xl p-6 shadow-glass">
    <div className="flex items-center gap-3 mb-4">
      <TrendingUp size={16} className="text-primary" />
      <h3 className="text-lg font-semibold text-foreground">Weekly Insights</h3>
    </div>
    <p className="text-sm text-muted-foreground mb-4">Review your weekly trends and download your health summary.</p>
    <Button onClick={() => toast({ title: "Report Generated", description: "Your summary is ready." })}>
      <Download size={16} className="mr-2" /> Run Weekly Report
    </Button>
  </div>
);

// ---- Dashboard ---- //
export const Dashboard = () => {
  const { currentDayData } = useLiveData();
  const metrics = getMetrics(currentDayData);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-24">
        <div className="container mx-auto px-4 pt-6 space-y-8">
          <WelcomeHeader />
          <div>
            <h3 className="text-lg font-semibold mb-2">Training Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {metrics.map((metric, i) => (
                <MetricCard key={i} metric={metric} />
              ))}
            </div>
          </div>
          <GraphCarousel />
          <WeeklyInsightsCard />
          <EngagementCard />
        </div>
      </div>
    </TooltipProvider>
  );
};
