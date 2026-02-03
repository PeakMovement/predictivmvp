import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Sparkles, Calendar, AlertTriangle, TrendingUp, ChevronDown, Brain, Heart, Zap, ShieldAlert, Scale, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { YvesDailyBriefing } from "@/hooks/useYvesIntelligence";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PersonalContextChips } from "./PersonalContextChips";
import { ActiveGoalSection } from "./ActiveGoalSection";
import { TodaysBestDecision } from "./TodaysBestDecision";
import { WhyThisMatters } from "./WhyThisMatters";
import { DocumentReference } from "./DocumentReference";
import { BriefingFooter } from "./BriefingFooter";
import { OneThingThatMatters } from "./OneThingThatMatters";
import { usePersonalizedInsights } from "@/hooks/usePersonalizedInsights";
import { useRelevantDocuments } from "@/hooks/useRelevantDocuments";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { FocusMode } from "@/hooks/useDashboardFocusMode";

interface DailyBriefingCardProps {
  briefing: YvesDailyBriefing | null;
  content: string | null;
  createdAt: string | null;
  isLoading: boolean;
  isGenerating: boolean;
  cached: boolean;
  onRefresh: () => void;
  focusMode?: FocusMode;
}

const focusModeConfig = {
  recovery: {
    label: "Recovery-Focused",
    icon: Heart,
    description: "Emphasizing sleep, HRV, and strain reduction",
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  },
  performance: {
    label: "Performance-Optimized",
    icon: Zap,
    description: "Emphasizing training optimization and next best workouts",
    color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  pain_management: {
    label: "Pain Management",
    icon: ShieldAlert,
    description: "Emphasizing symptom tracking and gentle movement",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  },
  balance: {
    label: "Balanced View",
    icon: Scale,
    description: "Holistic wellbeing across all areas",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  custom: {
    label: "Custom Focus",
    icon: Settings,
    description: "Based on your emphasized priorities",
    color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  },
};

export function DailyBriefingCard({
  briefing,
  content,
  createdAt,
  isLoading,
  isGenerating,
  cached,
  onRefresh,
  focusMode,
}: DailyBriefingCardProps) {
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

  const focusConfig = focusMode ? focusModeConfig[focusMode] : null;
  const FocusIcon = focusConfig?.icon;

  return (
    <Card className="animate-fade-in bg-glass backdrop-blur-xl border-glass-border shadow-glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>🧠 Yves Daily Briefing</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isGenerating}
            title="Refresh briefing"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {createdAt && (
            <CardDescription className="flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3" />
              {cached ? "Generated" : "Updated"} {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </CardDescription>
          )}
          {focusConfig && FocusIcon && (
            <Badge
              variant="outline"
              className={cn("text-xs font-normal", focusConfig.color)}
              title={focusConfig.description}
            >
              <FocusIcon className="h-3 w-3 mr-1" />
              {focusConfig.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Personal Context Section */}
        <PersonalContextChips className="pb-2 border-b border-border/50" />
        
        {/* Active Goal Section */}
        <ActiveGoalSection className="pb-2 border-b border-border/50" />
        
        {/* Todays Best Decision Section */}
        <TodaysBestDecision className="pb-2 border-b border-border/50" />
        
        {!briefing ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-muted-foreground">
              Click refresh to generate your personalized daily briefing
            </p>
            <Button onClick={onRefresh} disabled={isGenerating}>
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
          <button className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg">
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

      {/* One Thing That Matters Today */}
      <OneThingThatMatters focus={briefing.todaysFocus || null} />
    </div>
  );
}
