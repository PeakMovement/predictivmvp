import { BarChart3, Activity, Calendar, TrendingUp, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

const sessionLogs = [
  { title: "Upper Body Strength", date: "2024-01-15", load: 125, type: "Strength" },
  { title: "HIIT Cardio", date: "2024-01-14", load: 89, type: "Cardio" },
  { title: "Lower Body Power", date: "2024-01-13", load: 156, type: "Power" },
  { title: "Recovery Run", date: "2024-01-12", load: 45, type: "Recovery" },
  { title: "Olympic Lifting", date: "2024-01-11", load: 178, type: "Strength" },
];

const getTypeColor = (type: string) => {
  switch (type) {
    case "Strength": return "bg-blue-500/20 text-blue-400";
    case "Cardio": return "bg-red-500/20 text-red-400";
    case "Power": return "bg-purple-500/20 text-purple-400";
    case "Recovery": return "bg-green-500/20 text-green-400";
    default: return "bg-muted/20 text-muted-foreground";
  }
};

const WeeklyLoadChart = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass animate-fade-in">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
        <BarChart3 size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Weekly Training Load</h3>
    </div>
    <div className="h-64 bg-muted/20 rounded-xl flex items-center justify-center border border-glass-border">
      <div className="text-center space-y-2">
        <BarChart3 size={32} className="text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Stacked bar chart</p>
        <p className="text-xs text-muted-foreground">Training load by day</p>
      </div>
    </div>
  </div>
);

const SessionLogCard = ({ session }: { session: typeof sessionLogs[0] }) => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl p-4 shadow-glass hover:bg-glass-highlight transition-all duration-300">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-foreground">{session.title}</h4>
      <span className={cn("px-2 py-1 text-xs rounded-lg font-medium", getTypeColor(session.type))}>
        {session.type}
      </span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar size={14} />
        <span>{session.date}</span>
      </div>
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-primary" />
        <span className="font-medium text-foreground">{session.load}</span>
        <span className="text-muted-foreground text-xs">load</span>
      </div>
    </div>
  </div>
);

const SessionLogList = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass animate-fade-in">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
        <Activity size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Recent Sessions</h3>
    </div>
    <div className="space-y-3">
      {sessionLogs.map((session, index) => (
        <SessionLogCard key={index} session={session} />
      ))}
    </div>
  </div>
);

const CircularGauge = ({ title, value, maxValue, unit }: { title: string; value: number; maxValue: number; unit: string }) => {
  const percentage = (value / maxValue) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
          <Gauge size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              fill="transparent"
              className="opacity-20"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
              strokeLinecap="round"
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

const EWMATrendline = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass animate-fade-in">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
        <TrendingUp size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">EWMA Trendline Analysis</h3>
    </div>
    <div className="h-48 bg-muted/20 rounded-xl flex items-center justify-center border border-glass-border">
      <div className="text-center space-y-2">
        <TrendingUp size={32} className="text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">EWMA trend visualization</p>
        <p className="text-xs text-muted-foreground">Exponentially weighted moving average</p>
      </div>
    </div>
  </div>
);

export const Training = () => {
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container mx-auto px-6 pt-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">Training Analytics</h1>
          <p className="text-muted-foreground">Track your workouts and training progression</p>
        </div>

        {/* Weekly Load Chart */}
        <div className="mb-8">
          <WeeklyLoadChart />
        </div>

        {/* Session Log and Gauges Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Session Log - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <SessionLogList />
          </div>
          
          {/* Gauges - Stacked vertically in 1 column */}
          <div className="space-y-6">
            <CircularGauge title="Training Monotony" value={2.4} maxValue={5} unit="ratio" />
            <CircularGauge title="Training Strain" value={156} maxValue={200} unit="TSS" />
          </div>
        </div>

        {/* EWMA Trendline */}
        <div>
          <EWMATrendline />
        </div>
      </div>
    </div>
  );
};