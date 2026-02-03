import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  Compass,
  Heart,
  CheckCircle2,
  Clock,
  Target,
  Dumbbell,
  Play,
  RefreshCw,
  Info
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
  const [isDataExpanded, setIsDataExpanded] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());

  if (isLoading || !decision) {
    return null;
  }

  const riskDrivers = decision.riskDrivers;
  const session = riskDrivers?.correctiveAction?.session;
  const whyThisMatters = session?.whyThisMatters;

  const handleAddToPlan = () => {
    toast.success("Added to your plan", {
      description: session?.title || "Today's session"
    });
  };

  const handleLogCompleted = () => {
    toast.success("Well done!", {
      description: "Session logged. Keep up the great work 💪"
    });
  };

  const handleRefresh = () => {
    refresh();
    toast.info("Updating your guidance...");
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

  // Generate calm, narrative observation text based on the risk driver
  const generateObservationText = () => {
    if (!riskDrivers?.primary) return null;
    
    const driver = riskDrivers.primary.id;
    
    const observations: Record<string, string> = {
      'monotony': "Your recent training has followed a very similar pattern, and your body is showing signs of accumulated fatigue. This is common during consistent training blocks and doesn't mean anything is wrong. It simply suggests that adding some variation today would support recovery.",
      'acwr': "Your training load has increased noticeably over the past week. Your body is adapting, but today is a good opportunity to give it a little extra support. A lighter session will help you absorb recent gains without pushing too hard.",
      'strain': "You've been working hard lately, and the cumulative effort is showing in your numbers. This is actually a sign of consistent training—now is the time to let your body catch up so you can continue progressing.",
      'hrv': "Your recovery metrics suggest your body could use a gentler day. This isn't unusual after demanding periods, and responding to these signals is exactly how sustainable progress happens.",
      'sleep': "Your sleep patterns indicate you may not have fully recovered yet. On days like this, listening to your body and adjusting intensity helps maintain long-term consistency.",
      'fatigue': "Your system is showing signs of accumulated fatigue. Rather than pushing through, today is an opportunity to train smarter—keeping you on track without adding unnecessary stress.",
      'symptoms': "Your body has been sending signals that deserve attention. Today is a good day to focus on recovery and give your system a chance to restore balance."
    };

    return observations[driver] || riskDrivers.explanation || "Based on your recent patterns, we've identified an opportunity to optimize today's training for better results.";
  };

  // Generate calm recommendation text
  const generateRecommendationText = () => {
    if (!session) return null;
    return `A ${session.title.toLowerCase()} is recommended to help you stay active while supporting recovery.`;
  };

  // Generate meaning paragraph
  const generateMeaningText = () => {
    if (!riskDrivers?.primary) return null;
    
    const driver = riskDrivers.primary.id;
    
    const meanings: Record<string, string> = {
      'monotony': "When training stays too similar for too long, the body can struggle to recover and adapt. By changing the stimulus today, you reduce the risk of overuse strain, support your nervous system, and often regain motivation for harder sessions later in the week. Small adjustments like this help keep progress sustainable over time.",
      'acwr': "Gradual load increases are essential for progress, but the body needs time to adapt to new demands. By moderating today's intensity, you're giving your tissues and nervous system time to strengthen, which ultimately allows you to handle more in the coming weeks.",
      'strain': "Accumulated training stress needs to be balanced with recovery. Today's lighter approach isn't a step backward—it's an investment in your capacity to train harder later. Athletes who respect these rhythms tend to see more consistent long-term gains.",
      'hrv': "Recovery isn't just about rest—it's when your body actually gets stronger. By adjusting today's session to match your current state, you're maximizing the return on all the hard work you've already put in.",
      'sleep': "Sleep quality directly affects how your body responds to training. On lower-recovery days, gentler movement can actually improve subsequent sleep while keeping you active. It's a sustainable approach that pays dividends.",
      'fatigue': "Fatigue is your body's way of asking for a different stimulus. Responding appropriately today helps prevent the accumulated stress that leads to plateaus or setbacks. This is how experienced athletes train year after year.",
      'symptoms': "Your body communicates through subtle signals that experienced coaches learn to respect. By acknowledging these today, you're building a more sustainable training practice that supports long-term health and performance."
    };

    return meanings[driver] || whyThisMatters?.injuryRiskReduction || "Adjusting your training based on how your body is responding helps maintain consistent progress while reducing unnecessary strain.";
  };

  // Generate data transparency text
  const generateDataText = () => {
    if (!riskDrivers?.primary) return null;
    
    const value = riskDrivers.primary.value;
    const label = riskDrivers.primary.label;
    
    return `${label} has been ${riskDrivers.riskLevel === 'high' ? 'notably elevated' : 'higher than usual'} recently${value ? ` (${value} compared to your typical range)` : ''}.`;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <CollapsibleTrigger asChild>
            <button className="flex-1 flex items-center justify-between text-left group hover:bg-muted/30 transition-colors -m-4 p-4 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Compass className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Today's training focus</h3>
                  <p className="text-xs text-muted-foreground">Based on your recent training patterns</p>
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
            title="Refresh guidance"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="p-5 space-y-5">
            
            {/* A. Observation Card - "What we're noticing today" */}
            {riskDrivers && riskDrivers.primary && (
              <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">What we're noticing today</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {generateObservationText()}
                </p>
              </div>
            )}

            {/* B. Recommendation Card - "Today's best option" */}
            {session && (
              <div className="rounded-xl bg-primary/8 border border-primary/20 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Today's best option</span>
                  </div>
                  
                  <p className="text-sm text-foreground leading-relaxed mb-3">
                    {generateRecommendationText()}
                  </p>
                  
                  {/* Inline session details */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {session.duration}
                    </span>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      {session.intensity.level} ({session.intensity.rpe})
                    </span>
                  </div>
                </div>

                {/* Expandable session details */}
                <Collapsible open={isSessionExpanded} onOpenChange={setIsSessionExpanded}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center justify-center gap-2 text-sm text-primary/80 hover:text-primary hover:bg-primary/5 transition-colors border-t border-primary/10">
                      <span>{isSessionExpanded ? "Hide workout details" : "Would you like to see today's workout?"}</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isSessionExpanded && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t border-primary/10 pt-4">
                      {/* Session header */}
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-primary" />
                          {session.title}
                        </h5>
                        {completedExercises.size > 0 && (
                          <div className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                            {completionPercent}% complete
                          </div>
                        )}
                      </div>

                      {/* Intensity zone */}
                      {session.intensity.hrZone && (
                        <div className="p-3 rounded-lg bg-muted/50 text-sm">
                          <span className="font-medium">Target zone:</span> {session.intensity.hrZone}
                        </div>
                      )}

                      {/* Warm-up */}
                      {session.warmup && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Play className="h-3.5 w-3.5" />
                            Warm-up · {session.warmup.duration}
                          </div>
                          <div className="pl-5 space-y-1">
                            {session.warmup.activities.map((activity, idx) => (
                              <p key={idx} className="text-sm text-muted-foreground">
                                {activity}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Main exercises */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                            <Dumbbell className="h-3.5 w-3.5 text-primary" />
                            Main Session
                          </div>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {session.mainBlock.format}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {session.mainBlock.exercises.map((exercise, idx) => (
                            <button
                              key={idx}
                              onClick={() => toggleExercise(idx)}
                              className={cn(
                                "w-full text-left p-3 rounded-lg border transition-all",
                                completedExercises.has(idx)
                                  ? "bg-primary/10 border-primary/30"
                                  : "bg-card hover:bg-muted/50 border-border/50"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                  completedExercises.has(idx)
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground/30"
                                )}>
                                  {completedExercises.has(idx) && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={cn(
                                    "text-sm font-medium",
                                    completedExercises.has(idx) && "line-through opacity-60"
                                  )}>
                                    {exercise.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {exercise.prescription}
                                  </div>
                                  {exercise.notes && (
                                    <div className="text-xs text-primary/70 mt-1 italic">
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
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <span>🌙</span>
                            Cool-down · {session.cooldown.duration}
                          </div>
                          <div className="pl-5 space-y-1">
                            {session.cooldown.activities.map((activity, idx) => (
                              <p key={idx} className="text-sm text-muted-foreground">
                                {activity}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Safety considerations (calm language) */}
                      {session.safetyNotes.length > 0 && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Things to keep in mind</p>
                          <div className="space-y-1">
                            {session.safetyNotes.map((note, idx) => (
                              <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                                {note}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* C. Meaning Block - "Why this matters to you" */}
            {riskDrivers?.primary && (
              <div className="rounded-xl bg-muted/20 border border-border/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Why this matters to you</span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {generateMeaningText()}
                </p>

                {/* Progressive disclosure - data transparency */}
                <Collapsible open={isDataExpanded} onOpenChange={setIsDataExpanded}>
                  <CollapsibleTrigger asChild>
                    <button className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <span>{isDataExpanded ? "Hide the data" : "See the data behind this decision"}</span>
                      <ChevronDown className={cn("h-3 w-3 transition-transform", isDataExpanded && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <p className="mt-3 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {generateDataText()}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* D. Action Buttons - First-person, supportive language */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 h-11"
                onClick={handleAddToPlan}
              >
                Add this session to my plan
              </Button>
              <Button 
                className="flex-1 h-11"
                onClick={handleLogCompleted}
              >
                I've completed today's session
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
