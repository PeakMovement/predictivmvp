import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface InsightNode {
  id: string;
  message: string;
  date: string;
  category: string;
  level: "optimal" | "good" | "warning" | "critical";
}

const getLevelColor = (level: string) => {
  switch (level) {
    case "optimal":
      return { bg: "bg-green-500/20", border: "border-green-500/40", text: "text-green-400", glow: "shadow-[0_0_20px_rgba(34,197,94,0.3)]" };
    case "good":
      return { bg: "bg-blue-500/20", border: "border-blue-500/40", text: "text-blue-400", glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]" };
    case "warning":
      return { bg: "bg-orange-500/20", border: "border-orange-500/40", text: "text-orange-400", glow: "shadow-[0_0_20px_rgba(251,146,60,0.3)]" };
    case "critical":
      return { bg: "bg-red-500/20", border: "border-red-500/40", text: "text-red-400", glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]" };
    default:
      return { bg: "bg-primary/20", border: "border-primary/40", text: "text-primary", glow: "shadow-glow" };
  }
};

const getLevelEmoji = (level: string) => {
  switch (level) {
    case "optimal":
      return "🟢";
    case "good":
      return "✅";
    case "warning":
      return "🟠";
    case "critical":
      return "🔴";
    default:
      return "📊";
  }
};

const InsightNode = ({ 
  insight, 
  index, 
  total 
}: { 
  insight: InsightNode; 
  index: number; 
  total: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = getLevelColor(insight.level);
  const emoji = getLevelEmoji(insight.level);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 150);
    return () => clearTimeout(timer);
  }, [index]);

  // Calculate position on the tree - alternating branches
  const isLeft = index % 2 === 0;
  const branchLevel = Math.floor(index / 2);
  const horizontalOffset = isLeft ? -100 - (branchLevel * 40) : 100 + (branchLevel * 40);
  const verticalOffset = 100 + index * 100;

  return (
    <div
      className={cn(
        "absolute transition-all duration-700 ease-out",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-0"
      )}
      style={{
        left: "50%",
        top: `${verticalOffset}px`,
        transform: `translateX(calc(-50% + ${horizontalOffset}px))`,
      }}
    >
      {/* Connection Line - Branch style */}
      <div
        className="absolute w-1 bg-gradient-to-b from-primary/50 to-primary/20 rounded-full"
        style={{
          height: "60px",
          bottom: "100%",
          left: "50%",
          transform: `translateX(-50%) rotate(${isLeft ? -35 : 35}deg)`,
          transformOrigin: "bottom center",
        }}
      />

      {/* Node */}
      <div
        className={cn(
          "relative w-16 h-16 rounded-full border-2 backdrop-blur-xl",
          "flex items-center justify-center cursor-pointer",
          "hover:scale-110 active:scale-95 transition-all duration-300",
          colors.bg,
          colors.border,
          colors.glow,
          "animate-bounce-subtle"
        )}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="text-2xl">{emoji}</span>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-10 w-64 animate-fade-in">
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl p-4 shadow-glass">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-xs font-semibold uppercase tracking-wide", colors.text)}>
                  {insight.category}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{insight.date}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{insight.message}</p>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="w-3 h-3 bg-glass border-r border-b border-glass-border rotate-45" />
            </div>
          </div>
        )}
      </div>

      {/* Pulse Ring */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 animate-ping",
          colors.border,
          "opacity-20"
        )}
        style={{ animationDuration: "3s" }}
      />
    </div>
  );
};

export const InsightsTree = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const [insights, setInsights] = useState<InsightNode[]>([]);

  useEffect(() => {
    // Load insights from localStorage
    try {
      const stored = localStorage.getItem("insightHistory");
      if (stored) {
        const parsed = JSON.parse(stored);
        setInsights(parsed);
      }
    } catch (error) {
      console.error("Error loading insight history:", error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32 overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-32">
        {/* Header */}
        <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12 animate-fade-in">
          <Button
            onClick={() => onNavigate("health")}
            variant="ghost"
            size="icon"
            className="w-10 h-10 md:w-12 md:h-12 bg-glass backdrop-blur-xl border border-glass-border rounded-xl hover:bg-glass-highlight min-h-[44px]"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Your Insight Journey</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              A visual map of your progress, training load, and recovery intelligence.
            </p>
          </div>
        </div>

        {insights.length === 0 ? (
          // Empty State
          <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 animate-fade-in">
              <div className="text-6xl mb-4">🌱</div>
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">No insights yet</h2>
              <p className="text-muted-foreground max-w-md">
                Connect your Fitbit and calculate trends in Settings to begin tracking your health insights.
              </p>
              <Button
                onClick={() => onNavigate("settings")}
                className="mt-6 bg-primary/80 hover:bg-primary text-primary-foreground border border-glass-border rounded-xl px-6 py-3 font-semibold shadow-glow hover:scale-105 transition-all duration-200 min-h-[44px]"
              >
                Go to Settings
              </Button>
            </div>
          </div>
        ) : (
          // Insight Tree
          <div className="relative min-h-[80vh] flex justify-center">
            {/* Tree Trunk */}
            <div className="absolute left-1/2 top-0 w-1 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent h-full -translate-x-1/2 rounded-full" />

            {/* Tree Base */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2">
              <div className="w-20 h-20 rounded-full bg-glass backdrop-blur-xl border-2 border-primary/40 flex items-center justify-center shadow-glow animate-fade-in">
                <span className="text-3xl">🌿</span>
              </div>
            </div>

            {/* Insight Nodes */}
            <div className="relative w-full pt-32">
              {insights.map((insight, index) => (
                <InsightNode 
                  key={insight.id} 
                  insight={insight} 
                  index={index} 
                  total={insights.length}
                />
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        {insights.length > 0 && (
          <div className="mt-12 bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 animate-fade-in">
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">Legend</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { level: "optimal", label: "Optimal", emoji: "🟢" },
                { level: "good", label: "Good", emoji: "✅" },
                { level: "warning", label: "Caution", emoji: "🟠" },
                { level: "critical", label: "Alert", emoji: "🔴" },
              ].map((item) => {
                const colors = getLevelColor(item.level);
                return (
                  <div key={item.level} className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center", colors.bg, colors.border)}>
                      <span className="text-sm">{item.emoji}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
