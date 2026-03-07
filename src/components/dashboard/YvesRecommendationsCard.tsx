import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import jsPDF from "jspdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Lightbulb, ChevronDown, ThumbsUp, ThumbsDown, Check, HelpCircle, Download } from "lucide-react";
import { YvesRecommendation } from "@/hooks/useYvesIntelligence";
import { useEngagementTracking } from "@/hooks/useEngagementTracking";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { BaselineBanner } from "./BaselineBanner";
import { DataMaturityTier } from "@/hooks/useDataMaturity";

interface YvesRecommendationsCardProps {
  recommendations: YvesRecommendation[];
  isLoading: boolean;
  dataMaturityTier?: DataMaturityTier;
  dataMaturityDays?: number;
}

export function YvesRecommendationsCard({ recommendations, isLoading, dataMaturityTier, dataMaturityDays = 0 }: YvesRecommendationsCardProps) {
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
            <Lightbulb className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              No recommendations yet
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Generate your daily briefing above, or connect a wearable so Yves has enough data to personalise your plan.
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
                index={idx}
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

        {/* Baseline-building banner — only for none/early tiers */}
        {dataMaturityTier && (
          <BaselineBanner
            tier={dataMaturityTier}
            daysWithData={dataMaturityDays}
            className="mt-3"
          />
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
  index: number;
}

function RecommendationItem({ recommendation, categoryLabel, categoryIcon, priorityBadge, index }: RecommendationItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | 'followed' | null>(null);
  const { trackRecommendationViewed, trackRecommendationHelpful, trackRecommendationFollowed } = useEngagementTracking();
  const { toast } = useToast();
  
  // Generate a stable ID for tracking (in real app, this would come from the database)
  const recommendationId = `rec-${index}-${recommendation.category}-${recommendation.priority}`;
  
  // Track view when expanded
  useEffect(() => {
    if (isOpen) {
      trackRecommendationViewed(recommendationId);
    }
  }, [isOpen, recommendationId, trackRecommendationViewed]);
  
  // Create a short preview (first sentence or first ~60 chars)
  const preview = recommendation.text.length > 60 
    ? recommendation.text.slice(0, 60).trim() + "..."
    : recommendation.text.split('.')[0] + (recommendation.text.includes('.') ? '.' : '');

  const handleHelpful = async (helpful: boolean) => {
    const success = await trackRecommendationHelpful(recommendationId, helpful);
    if (success) {
      setFeedbackGiven(helpful ? 'helpful' : 'not_helpful');
      toast({
        title: helpful ? "Thanks for the feedback!" : "Got it",
        description: helpful 
          ? "I'll provide more insights like this" 
          : "I'll adjust my recommendations",
      });
    }
  };

  const handleFollowed = async () => {
    const success = await trackRecommendationFollowed(recommendationId);
    if (success) {
      setFeedbackGiven('followed');
      toast({
        title: "Great job! 🎉",
        description: "Keep up the momentum!",
      });
    }
  };

  const handleDownloadPDF = (e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${categoryIcon} ${categoryLabel}`, 20, y); y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Priority: ${recommendation.priority}`, 20, y); y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Recommendation", 20, y); y += 7;
    doc.setFont("helvetica", "normal");
    const textLines = doc.splitTextToSize(recommendation.text, 170);
    doc.text(textLines, 20, y); y += textLines.length * 6 + 6;

    if (recommendation.reasoning) {
      doc.setFont("helvetica", "bold");
      doc.text("Why This Matters", 20, y); y += 7;
      doc.setFont("helvetica", "normal");
      const reasonLines = doc.splitTextToSize(recommendation.reasoning, 170);
      doc.text(reasonLines, 20, y); y += reasonLines.length * 6 + 6;
    }

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);

    doc.save(`yves-${recommendation.category}-recommendation.pdf`);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border transition-colors bg-card/50",
        recommendation.priority === "high" 
          ? "border-l-4 border-l-destructive border-destructive/30" 
          : "border-border",
        feedbackGiven === 'followed' && "border-l-4 border-l-emerald-500 border-emerald-500/30 bg-emerald-500/5"
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
                  {feedbackGiven === 'followed' && (
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      <Check className="h-3 w-3 mr-1" /> Done
                    </Badge>
                  )}
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

            {/* Why this matters tooltip + PDF download */}
            {recommendation.reasoning && (
              <div className="flex items-center gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>Why this matters?</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px] p-3">
                      <p className="text-xs leading-relaxed">{recommendation.reasoning}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleDownloadPDF}>
                  <Download className="h-3 w-3 mr-1" /> Download as PDF
                </Button>
              </div>
            )}

            {/* Feedback buttons */}
            {!feedbackGiven && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground mr-2">Was this helpful?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs hover:bg-emerald-500/10 hover:text-emerald-600"
                  onClick={(e) => { e.stopPropagation(); handleHelpful(true); }}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" /> Yes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleHelpful(false); }}
                >
                  <ThumbsDown className="h-3 w-3 mr-1" /> No
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={(e) => { e.stopPropagation(); handleFollowed(); }}
                >
                  <Check className="h-3 w-3 mr-1" /> I did this
                </Button>
              </div>
            )}

            {feedbackGiven && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                {feedbackGiven === 'helpful' && <><ThumbsUp className="h-3 w-3 text-emerald-500" /> Thanks for the feedback!</>}
                {feedbackGiven === 'not_helpful' && <><ThumbsDown className="h-3 w-3 text-destructive" /> Noted. I'll improve!</>}
                {feedbackGiven === 'followed' && <><Check className="h-3 w-3 text-emerald-500" /> Awesome! Keep it up!</>}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
