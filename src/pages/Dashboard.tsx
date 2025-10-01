import { TrendingUp, Target, AlertTriangle, FileText, Play, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

const metrics = [
  { name: "Acute:Chronic Workload Ratio", value: "1.2", status: "green" },
  { name: "Training Monotony", value: "2.4", status: "yellow" },
  { name: "Training Strain", value: "156", status: "red" },
  { name: "Weekly Training Load", value: "420", status: "green" },
  { name: "EWMA Trend", value: "+5.2%", status: "green" },
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

const recommendations = [
  "Consider reducing training intensity by 15% this week",
  "Add 2 recovery sessions to prevent overreaching",
  "Focus on sleep quality to improve adaptation"
];

const generateDailyNudge = () => {
  const acwr = parseFloat(metrics.find(m => m.name === "Acute:Chronic Workload Ratio")?.value || "0");
  const monotony = parseFloat(metrics.find(m => m.name === "Training Monotony")?.value || "0");
  const strainStatus = metrics.find(m => m.name === "Training Strain")?.status;

  // Priority-based logic
  if (acwr > 1.5) {
    return "Load is high. Add a recovery day.";
  }
  if (monotony > 2.0) {
    return "Your training is repetitive. Add variety this week.";
  }
  if (strainStatus === "red") {
    return "Strain is elevated. Consider reducing intensity tomorrow.";
  }
  return "Great balance this week. Keep it up.";
};

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
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu will-change-transform active:scale-95">
    <div className="flex items-start justify-between mb-4">
      <h3 className="text-sm font-medium text-muted-foreground leading-tight">{metric.name}</h3>
      <div className={cn("w-3 h-3 rounded-full shadow-glow animate-bounce-subtle", getStatusColor(metric.status))} />
    </div>
    <p className="text-2xl font-bold text-foreground">{metric.value}</p>
  </div>
);

const WelcomeHeader = () => (
  <div className="text-center mb-12 space-y-4">
    <div className="animate-fade-in-slow">
      <h1 className="text-2xl font-light text-muted-foreground mb-2">Hello,</h1>
      <h2 className="text-4xl font-bold text-foreground tracking-tight">Alex Johnson</h2>
    </div>
    <div className="animate-slide-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
      <p className="text-muted-foreground text-lg">Here's your training overview for today</p>
    </div>
  </div>
);

const RecommendationCard = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
        <AlertTriangle size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Recommendations</h3>
    </div>
    <div className="space-y-3">
      {recommendations.map((rec, index) => (
        <div key={index} className="flex items-center justify-between gap-3 hover:bg-glass-highlight rounded-lg p-2 -m-2 transition-all duration-200">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0 animate-bounce-subtle" />
            <p className="text-sm text-muted-foreground">{rec}</p>
          </div>
          <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity duration-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-1 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => console.log('Download PDF for:', rec)}
                >
                  <FileText size={16} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download PDF</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-1 rounded-md hover:bg-primary/10 hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => console.log('Watch Video for:', rec)}
                >
                  <Play size={16} className="text-muted-foreground hover:text-primary transition-colors duration-200" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Watch Video</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DailyNudgeCard = () => {
  const [nudgeMessage, setNudgeMessage] = useState(generateDailyNudge());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshNudge = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setNudgeMessage(generateDailyNudge());
      setIsRefreshing(false);
    }, 300);
  };

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Daily Nudge</h3>
        <button
          onClick={refreshNudge}
          className={cn(
            "p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-glow",
            isRefreshing && "animate-spin"
          )}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className="text-primary" />
        </button>
      </div>
      <p 
        className={cn(
          "text-muted-foreground transition-all duration-300",
          isRefreshing ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        )}
      >
        {nudgeMessage}
      </p>
    </div>
  );
};

const FocusAreasCard = () => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
        <Target size={16} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Focus Areas</h3>
    </div>
    <div className="space-y-4">
      {focusAreas.map((area, index) => (
        <div key={index} className="flex items-center justify-between hover:bg-glass-highlight rounded-lg p-2 -m-2 transition-all duration-200">
          <div className="flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full animate-bounce-subtle", getStatusColor(area.status))} />
            <span className="text-sm font-medium text-foreground">{area.area}</span>
          </div>
          <span className="text-sm text-muted-foreground">{area.score}</span>
        </div>
      ))}
    </div>
  </div>
);

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
            <pattern id={`grid-${currentGraph}`} width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${currentGraph})`} />
          
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

export const Dashboard = () => {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-32">
        <div className="container mx-auto px-6 pt-8">
          {/* Welcome Header */}
          <WelcomeHeader />
          
          {/* Section Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h3 className="text-xl font-semibold text-foreground mb-2">Training Metrics</h3>
            <p className="text-muted-foreground">Your key performance indicators</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            {metrics.map((metric, index) => (
              <MetricCard key={index} metric={metric} />
            ))}
          </div>

          {/* Daily Nudge Section */}
          <div className="mb-8">
            <DailyNudgeCard />
          </div>

          {/* Trend Analysis Carousel */}
          <div className="mb-8">
            <GraphCarousel />
          </div>

          {/* Recommendations and Focus Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecommendationCard />
            <FocusAreasCard />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};