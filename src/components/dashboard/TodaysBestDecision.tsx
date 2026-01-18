import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  Compass,
  AlertTriangle,
  Shield,
  Zap,
  Sparkles,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Flame,
  Target,
  Dumbbell,
  Play,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTodaysDecision } from "@/hooks/useTodaysDecision";
import { toast } from "sonner";

interface TodaysBestDecisionProps {
  className?: string;
}

export function TodaysBestDecision({ className }: TodaysBestDecisionProps) {
  const { decision, isLoading, refresh } = useTodaysDecision();
  const [isOpen, setIsOpen] = useState(true);
  const [isSessionExpanded, setIsSessionExpanded] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());

  if (isLoading || !decision) {
    return null;
  }

  const riskDrivers = decision.riskDrivers;
  const session = riskDrivers?.correctiveAction?.session;
  const whyThisMatters = session?.whyThisMatters;

  const handleAddToPlan = () => {
    toast.success("Session added to your plan", {
      description: session?.title || "Today's session"
    });
  };

  const handleLogCompleted = () => {
    toast.success("Session logged as completed!", {
      description: "Great work staying consistent 💪"
    });
  };

  const handleRefresh = () => {
    refresh();
    toast.info("Refreshing today's decision...");
  };

  const toggleExercise = (index: number) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedExercises(newCompleted);
  };

  const completionPercent = session?.mainBlock.exercises.length 
    ? Math.round((completedExercises.size / session.mainBlock.exercises.length) * 100)
    : 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between p-4 border-b">
          <CollapsibleTrigger asChild>
            <button className="flex-1 flex items-center justify-between text-left group hover:bg-muted/30 transition-colors -m-4 p-4 rounded-t-lg">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Compass className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Today's Best Decision</h3>
                  <p className="text-xs text-muted-foreground">Your personalised guidance</p>
                </div>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="ml-2 h-8 w-8"
            title="Refresh decision"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* 1. Title (Bold) */}
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-foreground">{decision.title}</h4>
              {decision.contextSummary && (
                <p className="text-sm text-muted-foreground">{decision.contextSummary}</p>
              )}
            </div>

            {/* 2. Risk Driver */}
            {riskDrivers && riskDrivers.primary && (
              <div className={cn(
                "rounded-lg border p-3",
                riskDrivers.riskLevel === 'high' && "bg-destructive/5 border-destructive/30",
                riskDrivers.riskLevel === 'moderate' && "bg-warning/5 border-warning/30",
                riskDrivers.riskLevel === 'low' && "bg-muted border-border"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={cn(
                    "h-4 w-4",
                    riskDrivers.riskLevel === 'high' && "text-destructive",
                    riskDrivers.riskLevel === 'moderate' && "text-warning",
                    riskDrivers.riskLevel === 'low' && "text-muted-foreground"
                  )} />
                  <span className="text-sm font-semibold">Risk Driver</span>
                </div>
                <p className="text-sm font-medium text-foreground">{riskDrivers.primary.label}</p>
                {riskDrivers.secondary && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Also: {riskDrivers.secondary.label}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">{riskDrivers.explanation}</p>
              </div>
            )}

            {/* 3. Personalised Session */}
            {session && (
              <div className="rounded-lg border border-primary/20 overflow-hidden">
                <div className="bg-primary/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        {session.title}
                      </h5>
                      <p className="text-xs text-muted-foreground mt-0.5">{session.sessionGoal}</p>
                    </div>
                    {completedExercises.size > 0 && (
                      <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {completionPercent}%
                      </div>
                    )}
                  </div>
                  
                  {/* Quick stats */}
                  <div className="flex flex-wrap gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{session.duration}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Flame className="h-3 w-3" />
                      <span>{session.intensity.level}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Target className="h-3 w-3 text-primary" />
                      <span className="text-primary font-medium">{session.intensity.rpe}</span>
                    </div>
                  </div>
                </div>

                <Collapsible open={isSessionExpanded} onOpenChange={setIsSessionExpanded}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-primary/10">
                      <span>{isSessionExpanded ? "Hide details" : "View full session"}</span>
                      <ChevronDown className={cn("h-3 w-3 transition-transform", isSessionExpanded && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3 border-t border-primary/10">
                      {/* Intensity zone */}
                      {session.intensity.hrZone && (
                        <div className="p-2 rounded-md bg-muted/50 text-xs mt-3">
                          <span className="font-medium">Target zone:</span> {session.intensity.hrZone}
                        </div>
                      )}

                      {/* Warm-up */}
                      {session.warmup && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            <Play className="h-3 w-3" />
                            Warm-up ({session.warmup.duration})
                          </div>
                          <ul className="space-y-0.5">
                            {session.warmup.activities.map((activity, idx) => (
                              <li key={idx} className="text-xs text-muted-foreground pl-4">
                                • {activity}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Main block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
                            <Dumbbell className="h-3 w-3 text-primary" />
                            Main Session
                          </div>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {session.mainBlock.format}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5">
                          {session.mainBlock.exercises.map((exercise, idx) => (
                            <button
                              key={idx}
                              onClick={() => toggleExercise(idx)}
                              className={cn(
                                "w-full text-left p-2 rounded-md border transition-all",
                                completedExercises.has(idx)
                                  ? "bg-primary/10 border-primary/30"
                                  : "bg-card hover:bg-muted/50 border-border"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <div className={cn(
                                  "mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                                  completedExercises.has(idx)
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground/40"
                                )}>
                                  {completedExercises.has(idx) && (
                                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={cn(
                                    "text-sm font-medium",
                                    completedExercises.has(idx) && "line-through opacity-70"
                                  )}>
                                    {exercise.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {exercise.prescription}
                                  </div>
                                  {exercise.notes && (
                                    <div className="text-[10px] text-primary/80 mt-0.5 italic">
                                      {exercise.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cool-down */}
                      {session.cooldown && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            <span className="text-base">🌙</span>
                            Cool-down ({session.cooldown.duration})
                          </div>
                          <ul className="space-y-0.5">
                            {session.cooldown.activities.map((activity, idx) => (
                              <li key={idx} className="text-xs text-muted-foreground pl-4">
                                • {activity}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Safety notes */}
                      {session.safetyNotes.length > 0 && (
                        <div className="p-2 rounded-md bg-warning/10 border border-warning/20 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
                            <AlertTriangle className="h-3 w-3" />
                            Safety Notes
                          </div>
                          <ul className="space-y-0.5">
                            {session.safetyNotes.map((note, idx) => (
                              <li key={idx} className="text-xs text-warning/90 pl-4">
                                • {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* 4. Why It Matters */}
            {whyThisMatters && (
              <div className="rounded-lg bg-primary/5 p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
                  <Sparkles className="h-3.5 w-3.5" />
                  Why this matters
                </div>
                
                <div className="space-y-2">
                  {/* Trigger metric */}
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-3 w-3 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">What triggered this</p>
                      <p className="text-xs text-muted-foreground">{whyThisMatters.triggerMetric}</p>
                    </div>
                  </div>
                  
                  {/* Injury risk reduction */}
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Shield className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">How this protects you</p>
                      <p className="text-xs text-muted-foreground">{whyThisMatters.injuryRiskReduction}</p>
                    </div>
                  </div>
                  
                  {/* Today's benefit */}
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Zap className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">Your benefit today</p>
                      <p className="text-xs text-muted-foreground">{whyThisMatters.todayBenefit}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. CTAs */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={handleAddToPlan}
              >
                <CalendarPlus className="h-4 w-4" />
                Add to plan
              </Button>
              <Button 
                className="flex-1 gap-2"
                onClick={handleLogCompleted}
              >
                <CheckCircle2 className="h-4 w-4" />
                Log completed
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
