import { useState } from "react";
import { Heart, Activity, Zap, Moon, Brain, Footprints, ArrowLeft, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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
      className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300 cursor-pointer animate-fade-in hover-scale"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Icon size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{metric.name}</h3>
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
            <p className="text-xs text-muted-foreground">{metric.unit}</p>
          </div>
        </div>
        <div className="text-right">
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
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-6 pt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-glass backdrop-blur-xl border border-glass-border rounded-xl flex items-center justify-center hover:bg-glass-highlight transition-all duration-300"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Icon size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{metric.name}</h1>
              <p className="text-muted-foreground">Detailed analysis and trends</p>
            </div>
          </div>
        </div>

        {/* Current Value Card */}
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-8 mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-4xl font-bold text-foreground mb-2">{metric.value}</p>
              <p className="text-muted-foreground">{metric.unit}</p>
            </div>
            <div className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium",
              isPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              {metric.change} vs last week
            </div>
          </div>
          
          {/* Large Chart Placeholder */}
          <div className="h-64 bg-muted/20 rounded-xl flex items-center justify-center border border-glass-border">
            <div className="text-center space-y-2">
              <TrendingUp size={32} className="text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Detailed {metric.name} trend</p>
              <p className="text-xs text-muted-foreground">7-day detailed analysis</p>
            </div>
          </div>
        </div>

        {/* Insights Card */}
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-8 animate-fade-in">
          <h3 className="text-lg font-semibold text-foreground mb-6">Insights & Recommendations</h3>
          <div className="space-y-4">
            {metric.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p className="text-muted-foreground">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Health = () => {
  const [selectedMetric, setSelectedMetric] = useState<typeof healthMetrics[0] | null>(null);

  if (selectedMetric) {
    return <DetailView metric={selectedMetric} onBack={() => setSelectedMetric(null)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-6 pt-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">Health Metrics</h1>
          <p className="text-muted-foreground">Monitor your health and wellness indicators</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {healthMetrics.map((metric) => (
            <MetricTile 
              key={metric.id} 
              metric={metric} 
              onClick={() => setSelectedMetric(metric)} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};