import { forwardRef, useImperativeHandle, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ChevronDown, Compass, Heart, CircleCheck as CheckCircle2, Dumbbell, Play, RefreshCw, Info, CircleHelp as HelpCircle, Download, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTodaysDecision } from "@/hooks/useTodaysDecision";
import { useTrainingFocusRecommendation } from "@/hooks/useTrainingFocusRecommendation";
import { toast } from "sonner";
import jsPDF from "jspdf";

export interface TodaysBestDecisionHandle {
  refresh: () => void;
}

interface TodaysBestDecisionProps {
  className?: string;
}

// Observation text variations - rotated daily for freshness
const OBSERVATION_VARIATIONS: Record<string, string[]> = {
  'monotony': [
    "Your recent training has followed a very similar pattern, with limited time for recovery. This is common during consistent training blocks and doesn't mean anything is wrong—it simply suggests adding some variation today would support recovery.",
    "You've been training in a similar way for several days now. While consistency is valuable, your body responds best to varied stimuli. Today is a good opportunity to mix things up.",
    "Your workout patterns have been quite repetitive recently. This isn't a problem, but introducing some variety today will help your body continue adapting effectively."
  ],
  'acwr': [
    "Your training load has increased noticeably over the past week. Your body is adapting, but today is a good opportunity to give it a little extra support.",
    "You've ramped up your training recently, which is great for progress. Your system could use a lighter day to consolidate those gains.",
    "The intensity of your recent sessions has been higher than your usual baseline. A gentler approach today helps your body catch up."
  ],
  'strain': [
    "You've been working hard lately, and the cumulative effort is showing in your numbers. This is actually a sign of consistent training—now is the time to let your body catch up.",
    "Your recent training has accumulated more stress than usual. Taking it easier today isn't a step back—it's part of smart training.",
    "The past few sessions have added up. Your body is ready to absorb those gains with a lighter day today."
  ],
  'hrv': [
    "Your recovery metrics suggest your body could use a gentler day. This isn't unusual after demanding periods, and responding to these signals is exactly how sustainable progress happens.",
    "Your heart rate variability indicates your nervous system is still processing recent stress. A lighter session today supports your body's natural recovery.",
    "Your autonomic nervous system is showing signs of needing extra recovery. Easy movement today will help restore balance faster."
  ],
  'sleep': [
    "Your sleep patterns indicate you may not have fully recovered yet. On days like this, listening to your body and adjusting intensity helps maintain long-term consistency.",
    "Recent sleep data suggests your body hasn't had all the rest it needs. Gentler movement today can actually improve tonight's sleep while keeping you active.",
    "Sleep quality directly affects how your body responds to training. Today is a good opportunity to let your system catch up."
  ],
  'fatigue': [
    "Your system is showing signs of accumulated fatigue. Rather than pushing through, today is an opportunity to train smarter—keeping you on track without adding unnecessary stress.",
    "Fatigue is your body's way of asking for a different stimulus. Responding appropriately today helps prevent the accumulated stress that leads to plateaus.",
    "Your recent training has accumulated more fatigue than usual. A recovery-focused day helps your body complete the adaptation process."
  ],
  'symptoms': [
    "Your body has been sending signals that deserve attention. Today is a good day to focus on recovery and give your system a chance to restore balance.",
    "You've reported some discomfort recently. Your body communicates through these signals, and acknowledging them builds a more sustainable training practice.",
    "Recent symptoms suggest your body needs a modified approach today. Working around the affected area keeps you active while allowing proper healing."
  ]
};

// Meaning text variations - rotated daily for variety
const MEANING_VARIATIONS: Record<string, string[]> = {
  'monotony': [
    "When training stays too similar for too long, the body can struggle to recover and adapt. Adding some variety helps reduce strain, supports long-term progress, and often keeps motivation high.",
    "Repetitive stress accumulates over time. Cross-training distributes load across different tissues and joints, helping you stay healthy and progressing.",
    "Training variety builds a more resilient body. Different movements strengthen connective tissue from multiple angles, keeping training sustainable."
  ],
  'acwr': [
    "Gradual load increases are essential, but the body needs time to adapt. By moderating today's intensity, you're giving your system time to strengthen—allowing you to handle more in the coming weeks.",
    "Your recent training spike has been productive, but backing off now prevents tissue overload. You'll feel stronger in tomorrow's session because you recovered properly today.",
    "Workload balance is key to long-term progress. Today's reduction helps your body consolidate recent gains safely."
  ],
  'strain': [
    "Accumulated effort needs to be balanced with recovery. Today's lighter approach isn't a step backward—it's an investment in your capacity to train harder later.",
    "High strain accumulates micro-damage in tissues. Reducing load allows repair and prevents minor stress from becoming a setback.",
    "Your weekly load has been high. Managing it now protects your ability to train consistently over the coming months."
  ],
  'hrv': [
    "Recovery isn't just about rest—it's when your body actually gets stronger. By adjusting today's session to match your current state, you're maximizing the return on all the hard work you've already put in.",
    "Low HRV signals your nervous system is still processing stress. Gentle movement helps restore nervous system balance without adding more load.",
    "Your autonomic nervous system needs recovery time. Restorative movement today sets you up for a strong training response once HRV normalizes."
  ],
  'sleep': [
    "Sleep quality directly affects how your body responds to training. Gentler movement on lower-recovery days can actually improve subsequent sleep while keeping you active.",
    "Without quality sleep, muscles and nervous system haven't fully recovered. Easy movement is all your body can productively handle right now.",
    "Sleep deficit reduces your body's ability to handle training stress. A lighter session today helps you recover faster and sleep better tonight."
  ],
  'fatigue': [
    "Fatigue is your body's way of asking for a different stimulus. Responding appropriately today helps prevent the accumulated stress that leads to plateaus or setbacks.",
    "Training on accumulated fatigue leads to poor form and higher injury risk. Light movement promotes blood flow and recovery without adding stress.",
    "Fatigue impairs coordination and reaction time. Easy movement today protects you and sets you up for better performance tomorrow."
  ],
  'symptoms': [
    "Your body communicates through subtle signals that experienced coaches learn to respect. By acknowledging these today, you're building a more sustainable training practice.",
    "Training through symptoms often worsens the underlying issue. Protecting the area now prevents longer time off later.",
    "Symptoms indicate tissue needs attention. Working around the affected area keeps you active while allowing proper healing."
  ]
};

export const TodaysBestDecision = forwardRef<TodaysBestDecisionHandle, TodaysBestDecisionProps>(
function TodaysBestDecision({ className }, ref) {
  const { rec: yvesRec, isLoading: yvesLoading, refresh: refreshYves } = useTrainingFocusRecommendation();
  const { decision, isLoading: ruleLoading, refresh: refreshRule } = useTodaysDecision();

  useImperativeHandle(ref, () => ({
    refresh: () => {
      refreshYves();
      if (!yvesRec) refreshRule();
    },
  }));
  const [isOpen, setIsOpen] = useState(true);
  const [isSessionExpanded, setIsSessionExpanded] = useState(false);
  const [isDataExpanded, setIsDataExpanded] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'helpful' | 'not-helpful' | null>(null);

  const isLoading = yvesLoading || (!yvesRec && ruleLoading);

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div className="flex items-center gap-3 p-4">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Compass className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-4 bg-muted/40 rounded w-1/3 animate-pulse" />
            <div className="h-3 bg-muted/30 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  if (!yvesRec && !decision) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Compass className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Today's training focus</h3>
            <p className="text-xs text-muted-foreground">Powered by Yves</p>
          </div>
        </div>
        <div className="p-5 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Sync at least a week of data from your wearable to unlock personalised daily training guidance.
          </p>
          <p className="text-xs text-muted-foreground">
            Yves uses heart rate, sleep, and load trends to recommend the right session for you each day.
          </p>
        </div>
      </Card>
    );
  }

  const riskDrivers = decision?.riskDrivers;
  const session = riskDrivers?.correctiveAction?.session;
  const whyThisMatters = session?.whyThisMatters;

  const handleFeedback = (type: 'helpful' | 'not-helpful') => {
    setFeedbackGiven(true);
    setFeedbackType(type);
    toast.success("Thanks for your feedback!", {
      description: "This helps us improve your recommendations"
    });
  };

  const handleRefresh = () => {
    refreshYves();
    if (!yvesRec) refreshRule();
    setFeedbackGiven(false);
    setFeedbackType(null);
    toast.info("Updating your guidance...");
  };

  const handleDownloadPDF = () => {
    if (!session) return;
    const doc = new jsPDF();
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(session.title, 20, y);
    y += 10;

    // Goal
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(session.sessionGoal, 20, y);
    y += 10;

    // Duration & Intensity
    doc.setFont("helvetica", "bold");
    doc.text("Duration & Intensity", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Duration: ${session.duration}`, 24, y); y += 6;
    doc.text(`Intensity: ${session.intensity.level} (${session.intensity.rpe})`, 24, y); y += 6;
    if (session.intensity.hrZone) {
      doc.text(`Target zone: ${session.intensity.hrZone}`, 24, y); y += 6;
    }
    y += 6;

    // Warm-up
    if (session.warmup) {
      doc.setFont("helvetica", "bold");
      doc.text(`Warm-up (${session.warmup.duration})`, 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      session.warmup.activities.forEach((activity) => {
        doc.text(`• ${activity}`, 24, y); y += 6;
      });
      y += 4;
    }

    // Main exercises
    doc.setFont("helvetica", "bold");
    doc.text(`Main Session — ${session.mainBlock.format}`, 20, y);
    y += 8;
    session.mainBlock.exercises.forEach((exercise) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(exercise.name, 24, y); y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(exercise.prescription, 28, y); y += 5;
      if (exercise.notes) {
        doc.setFont("helvetica", "italic");
        const noteLines = doc.splitTextToSize(`Note: ${exercise.notes}`, 155);
        doc.text(noteLines, 28, y); y += noteLines.length * 5;
      }
      doc.setFontSize(11);
      y += 4;
    });
    y += 4;

    // Cool-down
    if (session.cooldown) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text(`Cool-down (${session.cooldown.duration})`, 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      session.cooldown.activities.forEach((activity) => {
        doc.text(`• ${activity}`, 24, y); y += 6;
      });
      y += 4;
    }

    // Safety notes
    if (session.safetyNotes.length > 0) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text("Safety Notes", 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      session.safetyNotes.forEach((note) => {
        const noteLines = doc.splitTextToSize(`• ${note}`, 165);
        doc.text(noteLines, 24, y); y += noteLines.length * 6;
      });
    }

    doc.save(`${session.title.replace(/\s+/g, '-').toLowerCase()}-workout.pdf`);
    toast.success("Workout guide downloaded!");
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

  // Generate calm, narrative observation text based on the risk driver - rotated daily
  const generateObservationText = () => {
    if (!riskDrivers?.primary) return null;
    
    const driver = riskDrivers.primary.id;
    const variations = OBSERVATION_VARIATIONS[driver];
    
    if (variations && variations.length > 0) {
      const index = (decision.rotationSeed ?? 0) % variations.length;
      return variations[index];
    }

    return riskDrivers.explanation || "Based on your recent patterns, we've identified an opportunity to optimize today's training for better results.";
  };

  // Generate calm recommendation text
  const generateRecommendationText = () => {
    if (!session) return null;
    return `A ${session.title.toLowerCase()} is a good option today, allowing you to stay active while giving your body space to recover.`;
  };

  // Generate meaning paragraph - rotated daily
  const generateMeaningText = () => {
    if (!riskDrivers?.primary) return null;
    
    const driver = riskDrivers.primary.id;
    const variations = MEANING_VARIATIONS[driver];
    
    if (variations && variations.length > 0) {
      const index = (decision.rotationSeed ?? 0) % variations.length;
      return variations[index];
    }

    return whyThisMatters?.injuryRiskReduction || "Adjusting your training based on how your body is responding helps maintain consistent progress while reducing unnecessary strain.";
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
                  <p className="text-xs text-muted-foreground">{yvesRec ? "Powered by Yves · Updated today" : "Based on your recent training patterns"}</p>
                </div>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="p-5 space-y-5">

            {yvesRec ? (
              <>
                {/* A. Observation — Yves internal reasoning */}
                {yvesRec.internal_reasoning && (
                  <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">What we're noticing today</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {yvesRec.internal_reasoning}
                    </p>
                  </div>
                )}

                {/* B. Recommendation — Yves recommendation_text */}
                <div className="rounded-xl bg-primary/8 border border-primary/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Today's recommendation</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {yvesRec.recommendation_text}
                  </p>
                </div>

                {/* C. Why this matters + data sources */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  {yvesRec.internal_reasoning && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <HelpCircle className="h-3.5 w-3.5" />
                            <span>Why this matters?</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px] p-3">
                          <p className="text-xs leading-relaxed">{yvesRec.internal_reasoning}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {yvesRec.data_sources && yvesRec.data_sources.length > 0 && (
                    <Collapsible open={isDataExpanded} onOpenChange={setIsDataExpanded}>
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <span>{isDataExpanded ? "Hide data details" : "See the data"}</span>
                          <ChevronDown className={cn("h-3 w-3 transition-transform", isDataExpanded && "rotate-180")} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          Based on: {yvesRec.data_sources.join(", ")}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>

                {/* D. Feedback Section */}
                <div className="pt-2 border-t border-border/50">
                  {feedbackGiven ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Thanks for your feedback!</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-center text-muted-foreground">Was this recommendation helpful?</p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback('helpful')}
                          className="gap-2"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Helpful
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback('not-helpful')}
                          className="gap-2"
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Not helpful
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
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
                      <p className="text-sm text-muted-foreground">
                        Around {session.duration} at {session.intensity.level.toLowerCase()} ({session.intensity.rpe}).
                      </p>
                    </div>

                    <Collapsible open={isSessionExpanded} onOpenChange={setIsSessionExpanded}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-3 flex items-center justify-center gap-2 text-sm text-primary/80 hover:text-primary hover:bg-primary/5 transition-colors border-t border-primary/10">
                          <span>{isSessionExpanded ? "Hide workout details" : "Would you like to see today's workout?"}</span>
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isSessionExpanded && "rotate-180")} />
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-4 border-t border-primary/10 pt-4">
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

                          {session.intensity.hrZone && (
                            <div className="p-3 rounded-lg bg-muted/50 text-sm">
                              <span className="font-medium">Target zone:</span> {session.intensity.hrZone}
                            </div>
                          )}

                          {session.warmup && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <Play className="h-3.5 w-3.5" />
                                Warm-up · {session.warmup.duration}
                              </div>
                              <div className="pl-5 space-y-1">
                                {session.warmup.activities.map((activity, idx) => (
                                  <p key={idx} className="text-sm text-muted-foreground">{activity}</p>
                                ))}
                              </div>
                            </div>
                          )}

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
                                      <div className={cn("text-sm font-medium", completedExercises.has(idx) && "line-through opacity-60")}>
                                        {exercise.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-0.5">{exercise.prescription}</div>
                                      {exercise.notes && (
                                        <div className="text-xs text-primary/70 mt-1 italic">{exercise.notes}</div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {session.cooldown && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                <span>🌙</span>
                                Cool-down · {session.cooldown.duration}
                              </div>
                              <div className="pl-5 space-y-1">
                                {session.cooldown.activities.map((activity, idx) => (
                                  <p key={idx} className="text-sm text-muted-foreground">{activity}</p>
                                ))}
                              </div>
                            </div>
                          )}

                          {session.safetyNotes.length > 0 && (
                            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Things to keep in mind</p>
                              <div className="space-y-1">
                                {session.safetyNotes.map((note, idx) => (
                                  <p key={idx} className="text-sm text-muted-foreground leading-relaxed">{note}</p>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="w-full sm:w-auto">
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Download workout guide
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

                {/* C. Why this matters tooltip + data transparency */}
                {riskDrivers?.primary && (
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <HelpCircle className="h-3.5 w-3.5" />
                            <span>Why this matters?</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px] p-3">
                          <p className="text-xs leading-relaxed">{generateMeaningText()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Collapsible open={isDataExpanded} onOpenChange={setIsDataExpanded}>
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <span>{isDataExpanded ? "Hide data details" : "See the data"}</span>
                          <ChevronDown className={cn("h-3 w-3 transition-transform", isDataExpanded && "rotate-180")} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {generateDataText()}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

                {/* D. Feedback Section */}
                <div className="pt-2 border-t border-border/50">
                  {feedbackGiven ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Thanks for your feedback!</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-center text-muted-foreground">Was this recommendation helpful?</p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback('helpful')}
                          className="gap-2"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Helpful
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback('not-helpful')}
                          className="gap-2"
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Not helpful
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});
