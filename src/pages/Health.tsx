import { useState, useMemo, useEffect } from "react";
import { Heart, Activity, Zap, Moon, Brain, Footprints, ArrowLeft, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useWearableSessions } from "@/hooks/useWearableSessions";
import { supabase } from "@/integrations/supabase/client";
import { ActivityMetricsCard } from "@/components/fitbit/ActivityMetricsCard";
import { HeartRateMetricsCard } from "@/components/fitbit/HeartRateMetricsCard";
import { SleepMetricsCard } from "@/components/fitbit/SleepMetricsCard";

const healthMetrics = [
  { 
    id: "hrv", 
    name: "HRV", 
    value: "42", 
    unit: "ms", 
    change: "+8.2%", 
    changeType: "positive",
    icon: Heart,
    sparklineData: [38, 41, 39, 45, 42, 44, 42],
    insights: ["Your HRV has improved significantly this week", "Good recovery pattern detected", "Consider maintaining current sleep schedule"]
  },
  { 
    id: "resting-hr", 
    name: "Resting HR", 
    value: "52", 
    unit: "bpm", 
    change: "-2.1%", 
    changeType: "positive",
    icon: Activity,
    sparklineData: [55, 54, 53, 52, 53, 51, 52],
    insights: ["Resting heart rate trending downward", "Indicates improved cardiovascular fitness", "Monitor for overtraining if drops suddenly"]
  },
  { 
    id: "vo2-max", 
    name: "VO₂ Max", 
    value: "58.3", 
    unit: "ml/kg/min", 
    change: "+1.5%", 
    changeType: "positive",
    icon: Zap,
    sparklineData: [56.8, 57.2, 57.8, 58.1, 58.0, 58.5, 58.3],
    insights: ["VO₂ Max showing steady improvement", "Aerobic capacity is above average for age", "Focus on threshold training for further gains"]
  },
  { 
    id: "sleep", 
    name: "Sleep", 
    value: "7.2", 
    unit: "hours", 
    change: "-5.3%", 
    changeType: "negative",
    icon: Moon,
    sparklineData: [7.8, 7.5, 7.1, 6.9, 7.3, 7.0, 7.2],
    insights: ["Sleep duration below optimal range", "Consider earlier bedtime routine", "Sleep quality may be impacting recovery"]
  },
  { 
    id: "stress", 
    name: "Stress", 
    value: "28", 
    unit: "score", 
    change: "+12.4%", 
    changeType: "negative",
    icon: Brain,
    sparklineData: [22, 25, 30, 32, 29, 31, 28],
    insights: ["Stress levels elevated this week", "Consider stress management techniques", "High stress may impact training adaptation"]
  },
  { 
    id: "steps", 
    name: "Steps", 
    value: "9,847", 
    unit: "steps", 
    change: "+3.7%", 
    changeType: "positive",
    icon: Footprints,
    sparklineData: [8500, 9200, 9800, 10100, 9600, 9400, 9847],
    insights: ["Daily step count improving", "Approaching 10k daily target", "Good baseline activity level maintained"]
  },
];

const Sparkline = ({ data, positive }: { data: number[]; positive: boolean }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 20 - ((value - min) / range) * 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="60" height="20" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
        strokeWidth="1.5"
        className="drop-shadow-sm"
      />
    </svg>
  );
};

const MetricTile = ({ metric, onClick }: { metric: typeof healthMetrics[0]; onClick: () => void }) => {
  const Icon = metric.icon;
  const isPositive = metric.changeType === "positive";

  return (
    <div 
      onClick={onClick}
      className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4 md:p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-2 hover-glow transition-all duration-300 ease-out cursor-pointer animate-fade-in transform-gpu will-change-transform active:scale-95 min-h-[120px]"
    >
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/20 rounded-xl flex items-center justify-center hover:scale-110 transition-transform duration-200 flex-shrink-0">
            <Icon size={16} className="md:size-[18px] text-primary animate-bounce-subtle" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-semibold text-foreground">{metric.name}</h3>
            <p className="text-xl md:text-2xl font-bold text-foreground">{metric.value ?? "–"}</p>
            <p className="text-xs text-muted-foreground">{metric.unit}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={cn(
            "px-2 py-1 rounded-lg text-xs font-medium mb-2",
            isPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {metric.change}
          </div>
          <Sparkline data={metric.sparklineData} positive={isPositive} />
        </div>
      </div>
    </div>
  );
};

const DetailView = ({ metric, onBack }: { metric: typeof healthMetrics[0]; onBack: () => void }) => {
  const Icon = metric.icon;
  const isPositive = metric.changeType === "positive";

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32">
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8">
        {/* Header */}
        <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 animate-fade-in">
          <button 
            onClick={onBack}
            className="w-10 h-10 md:w-10 md:h-10 bg-glass backdrop-blur-xl border border-glass-border rounded-xl flex items-center justify-center hover:bg-glass-highlight transition-all duration-300 flex-shrink-0 min-h-[44px]"
            aria-label="Go back"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="md:size-[20px] text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">{metric.name}</h1>
              <p className="text-sm md:text-base text-muted-foreground">Detailed analysis and trends</p>
            </div>
          </div>
        </div>

        {/* Current Value Card */}
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4 md:p-8 mb-6 md:mb-8 hover-glow animate-fade-in">
          <div className="flex items-center justify-between mb-4 md:mb-6 flex-wrap gap-3">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-foreground mb-1 md:mb-2">{metric.value ?? "–"}</p>
              <p className="text-sm md:text-base text-muted-foreground">{metric.unit}</p>
            </div>
            <div className={cn(
              "px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-medium",
              isPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              {metric.change} vs last week
            </div>
          </div>
          
          {/* Large Chart Placeholder */}
          <div className="h-48 md:h-64 bg-muted/20 rounded-xl flex items-center justify-center border border-glass-border">
            <div className="text-center space-y-2">
              <TrendingUp size={28} className="md:size-[32px] text-muted-foreground mx-auto" />
              <p className="text-xs md:text-sm text-muted-foreground">Detailed {metric.name} trend</p>
              <p className="text-xs text-muted-foreground">7-day detailed analysis</p>
            </div>
          </div>
        </div>

        {/* Insights Card */}
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4 md:p-8 hover-glow animate-fade-in">
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6">Insights & Recommendations</h3>
          <div className="space-y-3 md:space-y-4">
            {metric.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2 md:gap-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm md:text-base text-muted-foreground">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Health = () => {
  const { currentDayData, csvData, currentDayIndex } = useLiveData();
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  const { data: session, isLoading } = useWearableSessions(userId || undefined);

  // Extract values from wearable_sessions
  const heartRate = session?.resting_hr ?? "—";
  const hrv = session?.hrv_avg ?? "—";
  const spo2 = session?.spo2_avg ?? "—";

  console.log("Health wearable data:", { heartRate, hrv, spo2, session });

  // Generate health metrics from live data
  const dynamicHealthMetrics = useMemo(() => {
    if (!currentDayData || csvData.length === 0) {
      return [];
    }
    
    const dataUpToNow = csvData.slice(Math.max(0, currentDayIndex - 6), currentDayIndex + 1);
    
    const hrv = parseFloat(currentDayData.HRV || "0");
    const restingHR = parseFloat(currentDayData.RestingHR || "0");
    const sleepHours = parseFloat(currentDayData.SleepHours || "0");
    const sleepScore = parseFloat(currentDayData.SleepScore || "0");
    const strain = parseFloat(currentDayData.Strain || "0");
    
    const metrics = [];
    
    if (hrv > 0) {
      metrics.push({ 
        id: "hrv", 
        name: "HRV", 
        value: hrv.toFixed(0), 
        unit: "ms", 
        change: "+8.2%", 
        changeType: hrv >= 50 ? "positive" : "negative",
        icon: Heart,
        sparklineData: dataUpToNow.map(d => parseFloat(d.HRV || "0")).filter(v => v > 0),
        insights: [
          hrv >= 50 ? "Your HRV is in a healthy range" : "HRV below optimal - prioritize recovery",
          "Monitor daily trends for best results",
          "Sleep quality directly impacts HRV"
        ]
      });
    }
    
    if (restingHR > 0) {
      metrics.push({ 
        id: "resting-hr", 
        name: "Resting HR", 
        value: restingHR.toFixed(0), 
        unit: "bpm", 
        change: "-2.1%", 
        changeType: "positive",
        icon: Activity,
        sparklineData: dataUpToNow.map(d => parseFloat(d.RestingHR || "0")).filter(v => v > 0),
        insights: [
          "Resting heart rate indicates fitness level",
          "Lower values generally indicate better fitness",
          "Sudden increases may signal overtraining"
        ]
      });
    }
    
    if (sleepHours > 0) {
      metrics.push({ 
        id: "sleep", 
        name: "Sleep", 
        value: sleepHours.toFixed(1), 
        unit: "hours", 
        change: sleepHours >= 7 ? "+2.5%" : "-5.3%", 
        changeType: sleepHours >= 7 ? "positive" : "negative",
        icon: Moon,
        sparklineData: dataUpToNow.map(d => parseFloat(d.SleepHours || "0")).filter(v => v > 0),
        insights: [
          sleepHours >= 7 ? "Sleep duration within optimal range" : "Sleep duration below optimal - aim for 7-9 hours",
          "Consistent sleep schedule improves recovery",
          "Sleep quality matters as much as quantity"
        ]
      });
    }
    
    if (strain > 0) {
      metrics.push({ 
        id: "strain", 
        name: "Strain", 
        value: strain.toFixed(0), 
        unit: "score", 
        change: strain > 130 ? "+12.4%" : "-3.2%", 
        changeType: strain > 150 ? "negative" : "positive",
        icon: Zap,
        sparklineData: dataUpToNow.map(d => parseFloat(d.Strain || "0")).filter(v => v > 0),
        insights: [
          strain > 150 ? "Strain levels elevated - consider deload" : "Strain levels well-managed",
          "Balance high strain days with recovery",
          "Monitor cumulative fatigue"
        ]
      });
    }
    
    if (sleepScore > 0) {
      metrics.push({ 
        id: "sleep-score", 
        name: "Sleep Score", 
        value: sleepScore.toFixed(0), 
        unit: "/100", 
        change: sleepScore >= 75 ? "+5.2%" : "-8.1%", 
        changeType: sleepScore >= 75 ? "positive" : "negative",
        icon: Brain,
        sparklineData: dataUpToNow.map(d => parseFloat(d.SleepScore || "0")).filter(v => v > 0),
        insights: [
          sleepScore >= 75 ? "Sleep quality is good" : "Sleep quality needs improvement",
          "Optimize sleep environment and routine",
          "Recovery depends heavily on sleep quality"
        ]
      });
    }
    
    return metrics;
  }, [currentDayData, csvData, currentDayIndex]);

  if (selectedMetric) {
    return <DetailView metric={selectedMetric} onBack={() => setSelectedMetric(null)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32">
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Health Metrics</h1>
          <p className="text-sm md:text-base text-muted-foreground">Monitor your health and wellness indicators</p>
        </div>

        {/* Wearable Sessions Overview */}
        {session && (
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 mb-8 shadow-glass animate-fade-in">
            <h2 className="text-xl font-semibold text-foreground mb-4">Latest Wearable Data (Oura)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <p className="text-sm text-muted-foreground">Resting HR</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{heartRate}</p>
                <p className="text-xs text-muted-foreground">bpm</p>
              </div>
              <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <p className="text-sm text-muted-foreground">HRV</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{hrv}</p>
                <p className="text-xs text-muted-foreground">ms</p>
              </div>
              <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <p className="text-sm text-muted-foreground">SpO₂</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{spo2}</p>
                <p className="text-xs text-muted-foreground">%</p>
              </div>
            </div>
          </div>
        )}

        {/* Fitbit Metrics Section */}
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground">Fitbit Inspire HR Metrics</h2>
          
          {/* Activity & Movement */}
          <ActivityMetricsCard />
          
          {/* Heart Rate */}
          <HeartRateMetricsCard />
          
          {/* Sleep Stages */}
          <SleepMetricsCard />
        </div>


        {/* View Insights Button */}
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 md:p-8 shadow-glass hover:bg-glass-highlight hover-glow transition-all duration-300 ease-out animate-fade-in">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-4xl">🌿</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">View Your Insights</h3>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Explore your progress and training patterns over time in an interactive visual journey.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-insights'))}
              className="w-full md:w-auto mt-4 bg-primary/80 hover:bg-primary text-primary-foreground border border-glass-border rounded-xl px-8 py-4 text-base md:text-lg font-semibold shadow-glow hover:scale-[1.02] active:scale-95 transition-all duration-200"
            >
              🌿 Open Insight Tree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};