/**
 * DailyBriefingCard Component
 *
 * Displays the AI-generated daily health briefing from Yves with personalized insights,
 * health trends, recommendations, and context-aware information based on the user's focus mode.
 *
 * @component
 * @example
 * ```tsx
 * <DailyBriefingCard
 *   briefing={briefingData}
 *   content="Your sleep quality was excellent..."
 *   createdAt="2026-02-08T06:00:00Z"
 *   isLoading={false}
 *   isGenerating={false}
 *   cached={false}
 *   onRefresh={handleRefresh}
 *   focusMode="recovery"
 * />
 * ```
 */
import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader as Loader2, RefreshCw, Sparkles, Calendar, TriangleAlert as AlertTriangle, TrendingUp, ChevronDown, Brain, Lightbulb } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { YvesDailyBriefing, YvesRecommendation } from "@/hooks/useYvesIntelligence";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PersonalContextChips } from "./PersonalContextChips";
import { ActiveGoalSection } from "./ActiveGoalSection";
import { TodaysBestDecision, TodaysBestDecisionHandle } from "./TodaysBestDecision";
import { WhyThisMatters } from "./WhyThisMatters";
import { DocumentReference } from "./DocumentReference";
import { BriefingFooter } from "./BriefingFooter";
import { usePersonalizedInsights } from "@/hooks/usePersonalizedInsights";
import { useRelevantDocuments } from "@/hooks/useRelevantDocuments";
import { BaselineBanner } from "./BaselineBanner";
import { DataMaturityTier } from "@/hooks/useDataMaturity";
import { Badge } from "@/components/ui/badge";
import { Check, ThumbsUp, ThumbsDown, HelpCircle, Download } from "lucide-react";
import { useEngagementTracking } from "@/hooks/useEngagementTracking";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

/**
 * Props for the DailyBriefingCard component
 */
interface DailyBriefingCardProps {
  /** The complete briefing data object from Yves, or null if not yet loaded */
  briefing: YvesDailyBriefing | null;
  /** The main briefing content text, or null if not available */
  content: string | null;
  /** ISO timestamp of when the briefing was created */
  createdAt: string | null;
  /** Whether the initial briefing data is being loaded */
  isLoading: boolean;
  /** Whether a new briefing is currently being generated */
  isGenerating: boolean;
  /** Whether this briefing was served from cache */
  cached: boolean;
  /** Callback function to refresh/regenerate the briefing */
  onRefresh: () => void;
  /** Current data maturity tier — used to show baseline-building banner */
  dataMaturityTier?: DataMaturityTier;
  /** Number of days with wearable data */
  dataMaturityDays?: number;
  /** AI-powered recommendations */
  recommendations?: YvesRecommendation[];
}

export function DailyBriefingCard({
  briefing,
  content,
  createdAt,
  isLoading,
  isGenerating,
  cached,
  onRefresh,
  dataMaturityTier,
  dataMaturityDays = 0,
  recommendations = [],
}: DailyBriefingCardProps) {
  const trainingFocusRef = useRef<TodaysBestDecisionHandle>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isGenerating) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          const increment = Math.random() * 10 + 5;
          return Math.min(prev + increment, 95);
        });
      }, 300);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(timeout);
    }
  }, [isGenerating]);

  if (isLoading) {
    return (
      <Card className="animate-fade-in bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Yves Daily Briefing
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in bg-glass backdrop-blur-xl border-glass-border shadow-glass">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-base sm:text-lg truncate">🧠 Yves Daily Briefing</CardTitle>
          </div>
          <div className="relative">
            {isGenerating && (
              <svg className="absolute inset-0 -m-1 w-11 h-11 pointer-events-none" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-primary transition-all duration-300"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 20}`,
                    strokeDashoffset: `${2 * Math.PI * 20 * (1 - progress / 100)}`,
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'center',
                  }}
                />
              </svg>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { onRefresh(); trainingFocusRef.current?.refresh(); }}
              disabled={isGenerating}
              title="Refresh briefing"
              className="h-9 w-9 shrink-0 touch-manipulation relative z-10"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {createdAt && (
          <CardDescription className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3" />
            {cached ? "Generated" : "Updated"} {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        {/* Personal Context Section */}
        <PersonalContextChips className="pb-2 border-b border-border/50" />
        
        {/* Active Goal Section */}
        <ActiveGoalSection className="pb-2 border-b border-border/50" />
        
        {/* Todays Best Decision Section */}
        <TodaysBestDecision ref={trainingFocusRef} className="pb-2 border-b border-border/50" />
        
        {!briefing ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-muted-foreground">
              Click refresh to generate your personalized daily briefing
            </p>
            <Button onClick={() => onRefresh()} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Briefing
                </>
              )}
            </Button>
          </div>
        ) : (
          <CollapsibleBriefingSections briefing={briefing} />
        )}
        
        {/* Subtle footer explaining data sources */}
        <BriefingFooter />

        {/* Baseline-building banner — only for none/early tiers */}
        {dataMaturityTier && (
          <BaselineBanner
            tier={dataMaturityTier}
            daysWithData={dataMaturityDays}
            className="mt-1"
          />
        )}
      </CardContent>
    </Card>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  preview: string;
  children: React.ReactNode;
  variant?: "default" | "warning";
  tooltip?: string;
}

function CollapsibleSection({ title, icon, preview, children, variant = "default" }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border transition-colors",
        variant === "warning" 
          ? "border-destructive/30 bg-destructive/5" 
          : "border-border bg-card/50"
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg touch-manipulation">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={cn(
                "shrink-0",
                variant === "warning" ? "text-destructive" : "text-muted-foreground"
              )}>
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn(
                  "text-sm font-medium",
                  variant === "warning" ? "text-destructive" : "text-foreground"
                )}>
                  {title}
                </div>
                {!isOpen && (
                  <p className="text-xs text-muted-foreground line-clamp-2 sm:truncate mt-0.5">
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
          <div className="px-3 pb-3 pt-0">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function CollapsibleBriefingSections({ briefing }: { briefing: YvesDailyBriefing }) {
  const { getExplanation, hasContext } = usePersonalizedInsights();
  const { getRelevantDocument, hasDocuments } = useRelevantDocuments();
  
  const summaryPreview = briefing.summary.split('.')[0] + '.';
  const keyChangesPreview = briefing.keyChanges.length > 0 
    ? `${briefing.keyChanges.length} change${briefing.keyChanges.length > 1 ? 's' : ''} detected`
    : "No significant changes";
  const riskPreview = briefing.riskHighlights.length > 0
    ? `${briefing.riskHighlights.length} item${briefing.riskHighlights.length > 1 ? 's' : ''} need attention`
    : "No immediate concerns";

  // Get explanation and document for the summary
  const summaryExplanation = hasContext ? getExplanation(briefing.summary) : null;
  const summaryDocument = hasDocuments ? getRelevantDocument(briefing.summary) : null;

  return (
    <div className="space-y-3">
      {/* Brief of the Day */}
      <CollapsibleSection
        title="Brief of the Day"
        icon={<Brain className="h-4 w-4" />}
        preview={summaryPreview}
      >
        <p className="text-sm leading-relaxed text-foreground">
          {briefing.summary}
        </p>
        {summaryExplanation && (
          <WhyThisMatters 
            explanation={summaryExplanation.text} 
            tone={summaryExplanation.tone} 
          />
        )}
        {summaryDocument && (
          <DocumentReference document={summaryDocument} />
        )}
      </CollapsibleSection>

      {/* Key Changes */}
      <CollapsibleSection
        title="Key Changes"
        icon={<TrendingUp className="h-4 w-4" />}
        preview={keyChangesPreview}
      >
        {briefing.keyChanges.length > 0 ? (
          <div className="space-y-3">
            {briefing.keyChanges.map((change, idx) => {
              const explanation = hasContext ? getExplanation(change) : null;
              const relevantDoc = hasDocuments ? getRelevantDocument(change) : null;
              return (
                <div key={idx}>
                  <div className="p-2 rounded-md bg-muted/50 text-sm">
                    📊 {change}
                  </div>
                  {explanation && (
                    <WhyThisMatters 
                      explanation={explanation.text} 
                      tone={explanation.tone} 
                    />
                  )}
                  {relevantDoc && (
                    <DocumentReference document={relevantDoc} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No significant changes detected today.</p>
        )}
      </CollapsibleSection>

      {/* Attention Needed */}
      <CollapsibleSection
        title="Attention Needed"
        icon={<AlertTriangle className="h-4 w-4" />}
        preview={riskPreview}
        variant={briefing.riskHighlights.length > 0 ? "warning" : "default"}
      >
        {briefing.riskHighlights.length > 0 ? (
          <div className="space-y-3">
            {briefing.riskHighlights.map((risk, idx) => {
              const explanation = hasContext ? getExplanation(risk) : null;
              const relevantDoc = hasDocuments ? getRelevantDocument(risk) : null;
              return (
                <div key={idx}>
                  <div className="p-2 rounded-md bg-destructive/10 text-sm">
                    ⚠️ {risk}
                  </div>
                  {explanation && (
                    <WhyThisMatters 
                      explanation={explanation.text} 
                      tone={explanation.tone} 
                    />
                  )}
                  {relevantDoc && (
                    <DocumentReference document={relevantDoc} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No immediate concerns. Keep up the good work!</p>
        )}
      </CollapsibleSection>

      {/* Recommendations Section */}
      {recommendations && recommendations.length > 0 && (
        <CollapsibleSection
          title="Recommendations"
          icon={<Lightbulb className="h-4 w-4" />}
          preview={`${recommendations.length} ${recommendations.length === 1 ? 'recommendation' : 'recommendations'} for you`}
          variant="default"
        >
          <div className="space-y-3">
            {recommendations.map((recommendation, idx) => (
              <RecommendationItem
                key={idx}
                recommendation={recommendation}
                index={idx}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

    </div>
  );
}

// Helper functions for recommendations
function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    training: "Training Tip",
    recovery: "Recovery Tip",
    nutrition: "Nutrition Tip",
    sleep: "Sleep Tip",
    mindset: "Mindset Tip",
    performance: "Performance Tip",
    medical: "Health Tip",
    activity: "Activity Tip",
  };
  return labels[category] || "Performance Tip";
}

function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    training: "💪",
    recovery: "🧘",
    nutrition: "🥗",
    sleep: "😴",
    mindset: "🧠",
    performance: "🎯",
    medical: "🏥",
    activity: "⚡",
  };
  return icons[category] || "🎯";
}

function getPriorityBadge(priority: string) {
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
}

// RecommendationItem component for individual recommendations
interface RecommendationItemProps {
  recommendation: YvesRecommendation;
  index: number;
}

function RecommendationItem({ recommendation, index }: RecommendationItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | 'followed' | null>(null);
  const { trackRecommendationViewed, trackRecommendationHelpful, trackRecommendationFollowed } = useEngagementTracking();
  const { toast } = useToast();

  const recommendationId = `rec-${index}-${recommendation.category}-${recommendation.priority}`;

  useEffect(() => {
    if (isOpen) {
      trackRecommendationViewed(recommendationId);
    }
  }, [isOpen, recommendationId, trackRecommendationViewed]);

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

    const categoryIcon = getCategoryIcon(recommendation.category);
    const categoryLabel = getCategoryLabel(recommendation.category);

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

  const categoryLabel = getCategoryLabel(recommendation.category);
  const categoryIcon = getCategoryIcon(recommendation.category);
  const priorityBadge = getPriorityBadge(recommendation.priority);

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
          <button className="w-full p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg touch-manipulation">
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
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {preview}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
              isOpen && "transform rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3">
            <p className="text-sm text-foreground leading-relaxed">
              {recommendation.text}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs h-8">
                      <HelpCircle className="h-3 w-3 mr-1.5" />
                      Why this matters?
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{recommendation.reasoning}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button variant="ghost" size="sm" onClick={handleDownloadPDF} className="text-xs h-8">
                <Download className="h-3 w-3 mr-1.5" />
                Download as PDF
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Was this helpful?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleHelpful(true)}
                  disabled={feedbackGiven !== null}
                  className={cn(
                    "h-7 px-2",
                    feedbackGiven === 'helpful' && "text-primary"
                  )}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Yes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleHelpful(false)}
                  disabled={feedbackGiven !== null}
                  className={cn(
                    "h-7 px-2",
                    feedbackGiven === 'not_helpful' && "text-primary"
                  )}
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  No
                </Button>
              </div>

              <Button
                variant={feedbackGiven === 'followed' ? "default" : "outline"}
                size="sm"
                onClick={handleFollowed}
                disabled={feedbackGiven === 'followed'}
                className="h-7"
              >
                <Check className="h-3 w-3 mr-1" />
                I did this
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
