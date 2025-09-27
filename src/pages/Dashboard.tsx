import { TrendingUp, Target, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const metrics = [
  { name: "Acute:Chronic Workload Ratio", value: "1.2", status: "green" },
  { name: "Training Monotony", value: "2.4", status: "yellow" },
  { name: "Training Strain", value: "156", status: "red" },
  { name: "Weekly Training Load", value: "420", status: "green" },
  { name: "EWMA Trend", value: "+5.2%", status: "green" },
];

const recommendations = [
  "Consider reducing training intensity by 15% this week",
  "Add 2 recovery sessions to prevent overreaching",
  "Focus on sleep quality to improve adaptation"
];

const focusAreas = [
  { area: "Recovery Quality", score: "6.8/10", status: "yellow" },
  { area: "Training Consistency", score: "8.2/10", status: "green" },
  { area: "Load Progression", score: "4.5/10", status: "red" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "green": return "bg-green-500";
    case "yellow": return "bg-yellow-500";
    case "red": return "bg-red-500";
    default: return "bg-muted";
  }
};

const MetricCard = ({ metric }: { metric: typeof metrics[0] }) => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300 animate-fade-in">
    <div className="flex items-start justify-between mb-4">
      <h3 className="text-sm font-medium text-muted-foreground leading-tight">{metric.name}</h3>
      <div className={cn("w-3 h-3 rounded-full shadow-glow", getStatusColor(metric.status))} />
    </div>
    <p className="text-2xl font-bold text-foreground">{metric.value}</p>
  </div>
);

const RecommendationCard = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass animate-fade-in">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
        <AlertTriangle size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Recommendations</h3>
    </div>
    <div className="space-y-3">
      {recommendations.map((rec, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{rec}</p>
        </div>
      ))}
    </div>
  </div>
);

const FocusAreasCard = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass animate-fade-in">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
        <Target size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Focus Areas</h3>
    </div>
    <div className="space-y-4">
      {focusAreas.map((area, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full", getStatusColor(area.status))} />
            <span className="text-sm font-medium text-foreground">{area.area}</span>
          </div>
          <span className="text-sm text-muted-foreground">{area.score}</span>
        </div>
      ))}
    </div>
  </div>
);

const GraphPlaceholder = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass animate-fade-in">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
        <TrendingUp size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">EWMA Trend Analysis</h3>
    </div>
    <div className="h-64 bg-muted/20 rounded-xl flex items-center justify-center border border-glass-border">
      <div className="text-center space-y-2">
        <TrendingUp size={32} className="text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Line graph visualization</p>
        <p className="text-xs text-muted-foreground">EWMA trend over time</p>
      </div>
    </div>
  </div>
);

export const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-6 pt-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">Training Dashboard</h1>
          <p className="text-muted-foreground">Monitor your training metrics and performance</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </div>

        {/* EWMA Trend Graph */}
        <div className="mb-8">
          <GraphPlaceholder />
        </div>

        {/* Recommendations and Focus Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecommendationCard />
          <FocusAreasCard />
        </div>
      </div>
    </div>
  );
};