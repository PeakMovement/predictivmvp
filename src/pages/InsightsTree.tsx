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
      return { bg: "bg-green-500/20", border: "border-green-500/60", text: "text-green-400", glow: "shadow-[0_0_30px_rgba(34,197,94,0.5)]" };
    case "good":
      return { bg: "bg-blue-500/20", border: "border-blue-500/60", text: "text-blue-400", glow: "shadow-[0_0_30px_rgba(59,130,246,0.5)]" };
    case "warning":
      return { bg: "bg-orange-500/20", border: "border-orange-500/60", text: "text-orange-400", glow: "shadow-[0_0_30px_rgba(251,146,60,0.5)]" };
    case "critical":
      return { bg: "bg-red-500/20", border: "border-red-500/60", text: "text-red-400", glow: "shadow-[0_0_30px_rgba(239,68,68,0.5)]" };
    default:
      return { bg: "bg-violet-500/20", border: "border-violet-400/60", text: "text-violet-400", glow: "shadow-[0_0_30px_rgba(139,92,246,0.6)]" };
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

// Calculate geometric position for neural network diamond structure
const getNodePosition = (index: number) => {
  // Layer structure: 1, 2, 3, 3, 3, 2, 1 = 15 total nodes
  const layerMap = [1, 2, 3, 3, 3, 2, 1];
  let currentLayer = 0;
  let positionInLayer = 0;
  let nodesProcessed = 0;

  for (let layer = 0; layer < layerMap.length; layer++) {
    if (index < nodesProcessed + layerMap[layer]) {
      currentLayer = layer;
      positionInLayer = index - nodesProcessed;
      break;
    }
    nodesProcessed += layerMap[layer];
  }

  const layerWidth = 400; // Max width for widest layer
  const layerHeight = 120; // Vertical spacing between layers
  const nodesInLayer = layerMap[currentLayer];

  // Center-align nodes in each layer
  const horizontalSpacing = layerWidth / (nodesInLayer + 1);
  const x = (positionInLayer + 1) * horizontalSpacing - (layerWidth / 2);
  const y = currentLayer * layerHeight;

  return { x, y, layer: currentLayer, positionInLayer, nodesInLayer };
};

const InsightNode = ({ 
  insight, 
  index, 
  total,
  allInsights
}: { 
  insight: InsightNode; 
  index: number; 
  total: number;
  allInsights: InsightNode[];
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = getLevelColor(insight.level);
  const emoji = getLevelEmoji(insight.level);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const { x, y, layer } = getNodePosition(index);

  return (
    <div
      className={cn(
        "absolute transition-all duration-700 ease-out",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-0"
      )}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `${y + 100}px`,
        transform: "translate(-50%, 0)",
      }}
    >
      {/* Node */}
      <div
        className={cn(
          "relative w-14 h-14 rounded-full border-2 backdrop-blur-xl z-10",
          "flex items-center justify-center cursor-pointer",
          "hover:scale-125 active:scale-95 transition-all duration-300",
          colors.bg,
          colors.border,
          colors.glow,
        )}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="text-xl">{emoji}</span>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-50 w-64 animate-fade-in">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-violet-500/40 rounded-xl p-4 shadow-[0_0_40px_rgba(139,92,246,0.4)]">
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
              <div className="w-3 h-3 bg-slate-900/95 border-r border-b border-violet-500/40 rotate-45" />
            </div>
          </div>
        )}
      </div>

      {/* Pulse Ring */}
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 animate-ping",
          colors.border,
          "opacity-30"
        )}
        style={{ animationDuration: "4s" }}
      />
    </div>
  );
};

// SVG Connection Lines Component
const ConnectionLines = ({ insights }: { insights: InsightNode[] }) => {
  if (insights.length === 0) return null;

  const connections: Array<{ x1: number; y1: number; x2: number; y2: number; opacity: number }> = [];

  insights.forEach((insight, index) => {
    const { x: x1, y: y1, layer: layer1 } = getNodePosition(index);

    // Connect to nodes in adjacent layers
    insights.forEach((targetInsight, targetIndex) => {
      if (index === targetIndex) return;

      const { x: x2, y: y2, layer: layer2 } = getNodePosition(targetIndex);

      // Create mesh: connect to adjacent layers and some lateral connections
      const layerDiff = Math.abs(layer2 - layer1);
      
      if (layerDiff === 1) {
        // Adjacent layer connections (primary mesh)
        connections.push({
          x1: x1,
          y1: y1 + 100,
          x2: x2,
          y2: y2 + 100,
          opacity: 0.3
        });
      } else if (layerDiff === 0 && Math.abs(index - targetIndex) === 1) {
        // Lateral connections within same layer
        connections.push({
          x1: x1,
          y1: y1 + 100,
          x2: x2,
          y2: y2 + 100,
          opacity: 0.15
        });
      }
    });
  });

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      {connections.map((conn, idx) => (
        <line
          key={idx}
          x1={`calc(50% + ${conn.x1}px)`}
          y1={conn.y1}
          x2={`calc(50% + ${conn.x2}px)`}
          y2={conn.y2}
          stroke="rgba(139, 92, 246, 0.4)"
          strokeWidth="2"
          className="animate-pulse"
          opacity={conn.opacity}
          style={{ animationDuration: "3s", animationDelay: `${idx * 0.1}s` }}
        />
      ))}
    </svg>
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
      } else {
        // Create placeholder data to show the structure
        const placeholderInsights: InsightNode[] = Array.from({ length: 15 }, (_, i) => ({
          id: `placeholder-${i}`,
          message: `Insight #${i + 1} - Coming Soon`,
          date: "Pending",
          category: "Placeholder",
          level: "optimal" as const,
        }));
        setInsights(placeholderInsights);
      }
    } catch (error) {
      console.error("Error loading insight history:", error);
      // Show placeholders on error too
      const placeholderInsights: InsightNode[] = Array.from({ length: 15 }, (_, i) => ({
        id: `placeholder-${i}`,
        message: `Insight #${i + 1} - Coming Soon`,
        date: "Pending",
        category: "Placeholder",
        level: "optimal" as const,
      }));
      setInsights(placeholderInsights);
    }
  }, []);

  const hasRealData = insights.length > 0 && !insights[0]?.id?.includes('placeholder');

  return (
    <div className="min-h-screen bg-slate-950 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32 overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-32">
        {/* Header */}
        <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-12 animate-fade-in">
          <Button
            onClick={() => onNavigate("health")}
            variant="ghost"
            size="icon"
            className="w-10 h-10 md:w-12 md:h-12 bg-glass backdrop-blur-xl border border-violet-500/40 rounded-xl hover:bg-violet-500/20 min-h-[44px]"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Neural Insight Network</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {hasRealData 
                ? "A visual map of your progress, training load, and recovery intelligence." 
                : "Placeholder structure - connect your data to populate with real insights"}
            </p>
          </div>
        </div>

        {/* Neural Network Tree */}
        <div className="relative min-h-[900px] flex justify-center">
          {/* Connection Lines (Mesh) */}
          <ConnectionLines insights={insights} />

          {/* Central Vertical Spine */}
          <div className="absolute left-1/2 top-0 w-1 bg-gradient-to-b from-violet-500/60 via-violet-400/30 to-transparent h-full -translate-x-1/2 rounded-full" />

          {/* Top Node (Origin) */}
          <div className="absolute left-1/2 top-8 -translate-x-1/2 z-10">
            <div className="w-16 h-16 rounded-full bg-slate-900/90 backdrop-blur-xl border-2 border-violet-400/60 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.6)] animate-fade-in">
              <span className="text-2xl">🧠</span>
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
                allInsights={insights}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-12 bg-slate-900/80 backdrop-blur-xl border border-violet-500/40 rounded-2xl p-6 animate-fade-in shadow-[0_0_30px_rgba(139,92,246,0.3)]">
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">Network Status Legend</h3>
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
                  <div className={cn("w-10 h-10 rounded-full border-2 flex items-center justify-center", colors.bg, colors.border, colors.glow)}>
                    <span className="text-sm">{item.emoji}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
