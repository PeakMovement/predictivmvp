import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, FileText, Dumbbell, Apple, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanAlignment, PlanAlignmentItem } from "@/hooks/usePlanAlignment";

interface PlanAlignmentSectionProps {
  className?: string;
}

export function PlanAlignmentSection({ className }: PlanAlignmentSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { alignment, isLoading } = usePlanAlignment();

  // Only show if user has uploaded plans
  if (isLoading || !alignment.hasPlans || alignment.items.length === 0) {
    return null;
  }

  const getStatusIcon = (status: PlanAlignmentItem["alignmentStatus"]) => {
    switch (status) {
      case "aligned":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "modified":
        return <RefreshCw className="h-4 w-4 text-amber-500" />;
      case "adjusted":
        return <Sparkles className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusLabel = (status: PlanAlignmentItem["alignmentStatus"]) => {
    switch (status) {
      case "aligned":
        return "Aligned with plan";
      case "modified":
        return "Slight modification";
      case "adjusted":
        return "Temporary adjustment";
    }
  };

  const getPlanIcon = (planType: PlanAlignmentItem["planType"]) => {
    return planType === "training" 
      ? <Dumbbell className="h-4 w-4" /> 
      : <Apple className="h-4 w-4" />;
  };

  return (
    <div className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-lg border border-border bg-card/50">
          <CollapsibleTrigger asChild>
            <button className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">
                    Plan alignment
                  </div>
                  {!isOpen && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      How today fits with your uploaded plans
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
              {alignment.items.map((item, index) => (
                <div 
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border",
                    item.tone === "coach" 
                      ? "bg-primary/5 border-primary/20" 
                      : "bg-emerald-500/5 border-emerald-500/20"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      item.tone === "coach" ? "text-primary" : "text-emerald-600"
                    )}>
                      {getPlanIcon(item.planType)}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {item.planType === "training" ? "Training Plan" : "Nutrition Plan"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({item.planName})
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mb-2">
                    {getStatusIcon(item.alignmentStatus)}
                    <span className="text-xs font-medium text-muted-foreground">
                      {getStatusLabel(item.alignmentStatus)}
                    </span>
                  </div>
                  
                  <p className={cn(
                    "text-sm leading-relaxed",
                    item.tone === "coach" ? "text-foreground" : "text-foreground"
                  )}>
                    {item.explanation}
                  </p>
                </div>
              ))}
              
              <p className="text-xs text-muted-foreground italic px-1">
                Your plans guide the structure. These suggestions work within that framework to support your best outcomes today.
              </p>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
