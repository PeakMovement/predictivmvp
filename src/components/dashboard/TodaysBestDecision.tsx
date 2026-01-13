import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Compass, CheckCircle2, Circle, Info, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTodaysDecision, DecisionOption } from "@/hooks/useTodaysDecision";
import { RiskDriverResult } from "@/lib/riskDrivers";

interface TodaysBestDecisionProps {
  className?: string;
}

export function TodaysBestDecision({ className }: TodaysBestDecisionProps) {
  const { decision, isLoading } = useTodaysDecision();
  const [isOpen, setIsOpen] = useState(true);

  if (isLoading || !decision) {
    return null;
  }

  const recommendedOption = decision.options.find(o => o.isRecommended);
  const alternativeOption = decision.options.find(o => !o.isRecommended);

  return (
    <div className={cn("space-y-2", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between text-left group">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Todays best decision</h3>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-3">
            {/* Risk Driver Insight */}
            {decision.riskDrivers && decision.riskDrivers.riskLevel !== 'low' && (
              <RiskDriverInsight riskDrivers={decision.riskDrivers} />
            )}

            {/* Context summary */}
            {decision.contextSummary && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                {decision.contextSummary}
              </p>
            )}

            {/* Decision title */}
            <p className="text-sm font-medium text-foreground">{decision.title}</p>

            {/* Options */}
            <div className="space-y-2">
              {recommendedOption && (
                <DecisionCard option={recommendedOption} isRecommended={true} />
              )}
              {alternativeOption && (
                <DecisionCard option={alternativeOption} isRecommended={false} />
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface RiskDriverInsightProps {
  riskDrivers: RiskDriverResult;
}

function RiskDriverInsight({ riskDrivers }: RiskDriverInsightProps) {
  const { primary, secondary, explanation, riskLevel } = riskDrivers;

  if (!primary) return null;

  const getRiskLevelStyles = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      case 'moderate':
        return 'bg-warning/10 border-warning/30 text-warning';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    if (level === 'high' || level === 'moderate') {
      return <AlertTriangle className="h-3.5 w-3.5" />;
    }
    return <Info className="h-3.5 w-3.5" />;
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      getRiskLevelStyles(riskLevel)
    )}>
      <div className="flex items-center gap-2">
        {getRiskLevelIcon(riskLevel)}
        <span className="text-xs font-medium uppercase tracking-wide">Why this matters</span>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Primary:</span>
          <span>{primary.label}</span>
        </div>
        
        {secondary && (
          <div className="flex items-center gap-2 text-sm opacity-80">
            <span className="font-medium">Secondary:</span>
            <span>{secondary.label}</span>
          </div>
        )}
        
        <div className="flex items-start gap-1.5 text-xs opacity-90 pt-1">
          <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{explanation}</span>
        </div>
      </div>
    </div>
  );
}

interface DecisionCardProps {
  option: DecisionOption;
  isRecommended: boolean;
}

function DecisionCard({ option, isRecommended }: DecisionCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);

  const getToneStyles = (tone: DecisionOption["tone"], recommended: boolean) => {
    if (recommended) {
      return "border-primary/30 bg-primary/5";
    }
    return "border-border bg-card/30";
  };

  const getToneIcon = (recommended: boolean) => {
    if (recommended) {
      return <CheckCircle2 className="h-4 w-4 text-primary" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className={cn(
      "p-3 transition-colors cursor-pointer",
      getToneStyles(option.tone, isRecommended),
      !isRecommended && "opacity-80"
    )} onClick={() => setShowReasoning(!showReasoning)}>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          {getToneIcon(isRecommended)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-medium",
                isRecommended ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
              {isRecommended && (
                <span className="text-[10px] uppercase tracking-wide text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {option.description}
            </p>
          </div>
        </div>

        {/* Reasoning - toggle on click */}
        {showReasoning && (
          <div className={cn(
            "text-xs leading-relaxed pl-6 pt-2 border-t",
            option.tone === "warm" && "text-muted-foreground",
            option.tone === "coach" && "text-foreground/80",
            option.tone === "strategic" && "text-muted-foreground"
          )}>
            {option.reasoning}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/70 pl-6">
          Tap to {showReasoning ? "hide" : "see"} why
        </p>
      </div>
    </Card>
  );
}
