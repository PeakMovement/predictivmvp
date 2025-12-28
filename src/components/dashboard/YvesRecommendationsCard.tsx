import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Lightbulb, ChevronDown } from "lucide-react";
import { YvesRecommendation } from "@/hooks/useYvesIntelligence";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface YvesRecommendationsCardProps {
  recommendations: YvesRecommendation[];
  isLoading: boolean;
}

export function YvesRecommendationsCard({ recommendations, isLoading }: YvesRecommendationsCardProps) {
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      training: "Training Tip",
      recovery: "Recovery Tip",
      nutrition: "Nutrition Tip",
      sleep: "Sleep Tip",
      mindset: "Mindset Tip",
      performance: "Performance Tip",
      // Legacy categories for backwards compatibility
      medical: "Health Tip",
      activity: "Activity Tip",
      mobility: "Mobility Tip",
      injury: "Injury Prevention Tip",
    };
    return labels[category] || "Performance Tip";
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      training: "💪",
      recovery: "🧘",
      nutrition: "🥗",
      sleep: "😴",
      mindset: "🧠",
      performance: "🎯",
      // Legacy
      medical: "🏥",
      activity: "⚡",
      mobility: "🤸",
      injury: "🩹",
    };
    return icons[category] || "🎯";
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Yves Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Loading recommendations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          🎯 Yves Recommendations
        </CardTitle>
        <CardDescription>
          AI-powered actions based on your health data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-muted-foreground">
              Yves will generate personalized recommendations once your daily briefing is ready.
            </p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "yves-insights" }))}
            >
              Chat with Yves <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {recommendations.map((rec, idx) => (
              <RecommendationItem
                key={idx}
                recommendation={rec}
                categoryLabel={getCategoryLabel(rec.category)}
                categoryIcon={getCategoryIcon(rec.category)}
                priorityBadge={getPriorityBadge(rec.priority)}
              />
            ))}

            <Button 
              variant="outline" 
              className="w-full mt-4" 
              onClick={() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "yves-insights" }))}
            >
              View All & Chat with Yves <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface RecommendationItemProps {
  recommendation: YvesRecommendation;
  categoryLabel: string;
  categoryIcon: string;
  priorityBadge: React.ReactNode;
}

function RecommendationItem({ recommendation, categoryLabel, categoryIcon, priorityBadge }: RecommendationItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Create a short preview (first sentence or first ~60 chars)
  const preview = recommendation.text.length > 60 
    ? recommendation.text.slice(0, 60).trim() + "..."
    : recommendation.text.split('.')[0] + (recommendation.text.includes('.') ? '.' : '');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border transition-colors bg-card/50",
        recommendation.priority === "high" 
          ? "border-l-4 border-l-destructive border-destructive/30" 
          : "border-border"
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-lg shrink-0">{categoryIcon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {categoryLabel}
                  </span>
                  {priorityBadge}
                </div>
                {!isOpen && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {preview}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-3">
            {/* Main suggestion */}
            <p className="text-sm leading-relaxed font-medium text-foreground">
              {recommendation.text}
            </p>

            {/* Why this matters */}
            {recommendation.reasoning && (
              <div className="p-2 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Why this matters: </span>
                  {recommendation.reasoning}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
