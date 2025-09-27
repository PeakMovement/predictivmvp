import { BarChart3, Activity, Calendar, TrendingUp, Gauge, ChevronLeft, ChevronRight, FileText, Play, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const sessionLogs = [
  { title: "Upper Body Strength", date: "2024-01-15", load: 125, type: "Strength" },
  { title: "HIIT Cardio", date: "2024-01-14", load: 89, type: "Cardio" },
  { title: "Lower Body Power", date: "2024-01-13", load: 156, type: "Power" },
  { title: "Recovery Run", date: "2024-01-12", load: 45, type: "Recovery" },
  { title: "Olympic Lifting", date: "2024-01-11", load: 178, type: "Strength" },
];

const suggestions = [
  {
    id: 1,
    text: "Schedule a deload week to reduce training intensity by 20%",
    type: "actionable",
    hasVideo: true,
    hasPdf: true
  },
  {
    id: 2,
    text: "Your acute:chronic ratio suggests optimal adaptation window",
    type: "insight",
    hasVideo: false,
    hasPdf: false
  },
  {
    id: 3,
    text: "Add 2 mobility sessions focusing on hip flexors and thoracic spine",
    type: "actionable",
    hasVideo: true,
    hasPdf: true
  },
  {
    id: 4,
    text: "Training monotony is within acceptable range (2.4/5.0)",
    type: "insight",
    hasVideo: false,
    hasPdf: true
  },
  {
    id: 5,
    text: "Consider periodizing toward strength phase next week",
    type: "actionable",
    hasVideo: true,
    hasPdf: false
  }
];

const graphData = [
  {
    title: "EWMA Trend Analysis",
    subtitle: "Exponentially weighted moving average over 28 days",
    currentValue: "+5.2%",
    riskZone: "optimal", // optimal, caution, high-risk
    dataPoints: [65, 68, 72, 70, 75, 78, 82, 80, 85, 88, 90, 87, 89, 92, 95]
  },
  {
    title: "Acute:Chronic Workload",
    subtitle: "Training load ratio over time",
    currentValue: "1.2",
    riskZone: "optimal",
    dataPoints: [1.3, 1.2, 1.1, 1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 1.2, 1.3, 1.2, 1.1, 1.2]
  },
  {
    title: "Weekly Training Load",
    subtitle: "Total training stress by week",
    currentValue: "420 TSS",
    riskZone: "caution",
    dataPoints: [380, 390, 400, 420, 440, 430, 420, 410, 430, 450, 440, 420, 410, 420, 420]
  },
  {
    title: "Training Strain Trend",
    subtitle: "Daily strain accumulation",
    currentValue: "156",
    riskZone: "high-risk",
    dataPoints: [120, 130, 140, 145, 150, 155, 160, 158, 162, 165, 160, 158, 156, 154, 156]
  }
];

const getRiskColor = (zone: string, isGlow = false) => {
  const colors = {
    optimal: isGlow ? "rgba(34, 197, 94, 0.6)" : "#22c55e",
    caution: isGlow ? "rgba(251, 146, 60, 0.6)" : "#fb923c", 
    "high-risk": isGlow ? "rgba(239, 68, 68, 0.6)" : "#ef4444"
  };
  return colors[zone as keyof typeof colors] || colors.optimal;
};

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
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
        <BarChart3 size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Weekly Training Load</h3>
    </div>
    <div className="h-64 bg-muted/20 rounded-xl flex items-center justify-center border border-glass-border hover:bg-muted/30 transition-colors duration-300">
      <div className="text-center space-y-2">
        <BarChart3 size={32} className="text-muted-foreground mx-auto animate-bounce-subtle" />
        <p className="text-sm text-muted-foreground">Stacked bar chart</p>
        <p className="text-xs text-muted-foreground">Training load by day</p>
      </div>
    </div>
  </div>
);

const SessionLogCard = ({ session }: { session: typeof sessionLogs[0] }) => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl p-4 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out transform-gpu">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-foreground">{session.title}</h4>
      <span className={cn("px-2 py-1 text-xs rounded-lg font-medium hover:scale-105 transition-transform duration-200", getTypeColor(session.type))}>
        {session.type}
      </span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar size={14} />
        <span>{session.date}</span>
      </div>
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-primary animate-bounce-subtle" />
        <span className="font-medium text-foreground">{session.load}</span>
        <span className="text-muted-foreground text-xs">load</span>
      </div>
    </div>
  </div>
);

const SessionLogList = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
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
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
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

const SuggestionsCard = () => {
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<number>>(new Set());

  const handleAccept = (suggestionId: number) => {
    setAcceptedSuggestions(prev => new Set([...prev, suggestionId]));
  };

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
          <TrendingUp size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Suggestions for the Next 7 Days</h3>
      </div>
      <div className="space-y-3">
        {suggestions.map((suggestion) => {
          const isAccepted = acceptedSuggestions.has(suggestion.id);
          const isActionable = suggestion.type === "actionable";
          
          return (
            <div key={suggestion.id} className="flex items-center justify-between gap-3 hover:bg-glass-highlight rounded-lg p-3 -m-3 transition-all duration-200">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0 animate-bounce-subtle" />
                <p className="text-sm text-muted-foreground">{suggestion.text}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Action Icons */}
                {(suggestion.hasPdf || suggestion.hasVideo) && (
                  <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity duration-200">
                    {suggestion.hasPdf && (
                      <button 
                        className="p-1 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                        onClick={() => console.log('Download PDF for suggestion:', suggestion.id)}
                      >
                        <FileText size={14} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                      </button>
                    )}
                    {suggestion.hasVideo && (
                      <button 
                        className="p-1 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                        onClick={() => console.log('Watch Video for suggestion:', suggestion.id)}
                      >
                        <Play size={14} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                      </button>
                    )}
                  </div>
                )}
                
                {/* Action Button or Insight Label */}
                {isActionable ? (
                  <button
                    onClick={() => handleAccept(suggestion.id)}
                    disabled={isAccepted}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300",
                      isAccepted
                        ? "bg-green-500/20 text-green-400 shadow-glow cursor-default"
                        : "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-105 active:scale-95"
                    )}
                  >
                    {isAccepted ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle size={12} />
                        <span>Added to Plan</span>
                      </div>
                    ) : (
                      "Accept"
                    )}
                  </button>
                ) : (
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground/60 bg-muted/10 rounded-lg">
                    Insight
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GraphCarousel = () => {
  const [currentGraph, setCurrentGraph] = useState(0);
  const [timeRange, setTimeRange] = useState(30);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const timeRanges = [
    { days: 7, label: "7 Days" },
    { days: 14, label: "14 Days" },
    { days: 30, label: "30 Days" }
  ];
  
  // Auto-rotation every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentGraph((prev) => (prev + 1) % graphData.length);
        setIsTransitioning(false);
      }, 150);
    }, 5000);

    return () => clearInterval(interval);
  }, []);
  
  const nextGraph = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentGraph((prev) => (prev + 1) % graphData.length);
      setIsTransitioning(false);
    }, 150);
  };
  
  const prevGraph = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentGraph((prev) => (prev - 1 + graphData.length) % graphData.length);
      setIsTransitioning(false);
    }, 150);
  };
  
  const selectGraph = (index: number) => {
    if (index !== currentGraph) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentGraph(index);
        setIsTransitioning(false);
      }, 150);
    }
  };
  
  const graph = graphData[currentGraph];
  const lineColor = getRiskColor(graph.riskZone);
  const glowColor = getRiskColor(graph.riskZone, true);
  
  // Generate data points based on selected time range
  const getDataForRange = (days: number) => {
    const fullData = graph.dataPoints;
    if (days >= fullData.length) return fullData;
    return fullData.slice(-days);
  };
  
  const currentData = getDataForRange(timeRange);
  const maxValue = Math.max(...currentData);
  const minValue = Math.min(...currentData);
  const range = maxValue - minValue || 1;
  
  // SVG viewBox dimensions
  const viewBoxWidth = 400;
  const viewBoxHeight = 200;
  const padding = 30;
  
  const generatePath = (data: number[]) => {
    return data.map((value, index) => {
      const x = padding + (index * (viewBoxWidth - 2 * padding)) / Math.max(data.length - 1, 1);
      const y = viewBoxHeight - padding - ((value - minValue) / range) * (viewBoxHeight - 2 * padding);
      return `${x},${y}`;
    }).join(' ');
  };
  
  const points = generatePath(currentData);
  
  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{graph.title}</h3>
            <p className="text-xs text-muted-foreground">{graph.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevGraph}
            className="p-2 rounded-lg hover:bg-glass-highlight transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
          </button>
          <div className="flex gap-1">
            {graphData.map((_, index) => (
              <button
                key={index}
                onClick={() => selectGraph(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentGraph 
                    ? "bg-primary scale-125" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
          <button 
            onClick={nextGraph}
            className="p-2 rounded-lg hover:bg-glass-highlight transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <ChevronRight size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </div>
      </div>
      
      {/* Time Range Selector */}
      <div className="flex justify-end mb-4">
        <div className="flex bg-muted/10 rounded-lg p-1 border border-glass-border">
          {timeRanges.map((range) => (
            <button
              key={range.days}
              onClick={() => setTimeRange(range.days)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                timeRange === range.days
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-glass-highlight"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className={cn(
        "h-80 bg-muted/5 rounded-xl border border-glass-border relative overflow-hidden transition-all duration-300 ease-out",
        isTransitioning ? "opacity-50 scale-95" : "opacity-100 scale-100"
      )}>
        <svg 
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className={cn(
            "w-full h-full transition-all duration-300 ease-out",
            isTransitioning ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"
          )}
          preserveAspectRatio="xMidYMid meet"
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id={`grid-training-${currentGraph}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-training-${currentGraph})`} />
          
          {/* Trend line */}
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            className="transition-all duration-500 ease-out"
            style={{
              filter: `drop-shadow(0 0 4px ${glowColor})`,
            }}
          />
          
          {/* Data points */}
          {currentData.map((value, index) => {
            const x = padding + (index * (viewBoxWidth - 2 * padding)) / Math.max(currentData.length - 1, 1);
            const y = viewBoxHeight - padding - ((value - minValue) / range) * (viewBoxHeight - 2 * padding);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={lineColor}
                className="transition-all duration-500 ease-out"
                style={{
                  filter: `drop-shadow(0 0 2px ${glowColor})`,
                }}
              />
            );
          })}
        </svg>
        
        <div className={cn(
          "absolute top-4 right-4 text-right transition-all duration-300 ease-out",
          isTransitioning ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
        )}>
          <div className="text-2xl font-bold text-foreground transition-colors duration-300">
            {graph.currentValue}
          </div>
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded-full transition-all duration-300",
            graph.riskZone === "optimal" && "bg-green-500/20 text-green-400",
            graph.riskZone === "caution" && "bg-orange-500/20 text-orange-400", 
            graph.riskZone === "high-risk" && "bg-red-500/20 text-red-400"
          )}>
            {graph.riskZone.toUpperCase().replace('-', ' ')}
          </div>
        </div>
      </div>
    </div>
  );
};

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

        {/* Trend Analysis Carousel */}
        <div className="mb-8">
          <GraphCarousel />
        </div>

        {/* Suggestions for Next 7 Days */}
        <div>
          <SuggestionsCard />
        </div>
      </div>
    </div>
  );
};