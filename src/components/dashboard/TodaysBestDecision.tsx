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

// Observation text — Yves voice: short, declarative, data-first. No warmth.
const OBSERVATION_VARIATIONS: Record<string, string[]> = {
  'monotony': [
    "Training pattern repetition detected. Monotony index elevated. Variation recommended to reduce cumulative tissue load.",
    "Session similarity above threshold. Adaptation response plateauing. Different stimulus required.",
    "Repeated movement pattern identified. Monotony score warrants cross-training today."
  ],
  'acwr': [
    "Acute-to-chronic workload ratio elevated. 7-day load exceeds baseline. Reduced output recommended.",
    "ACWR above safe threshold. Training ramp rate requires moderation. Consolidation day.",
    "Load spike detected. Workload ratio indicates elevated injury probability. Reduce intensity."
  ],
  'strain': [
    "Cumulative strain index elevated. 7-day accumulation above threshold. Recovery session indicated.",
    "Training stress accumulation above baseline. Deload day recommended to complete adaptation cycle.",
    "Strain accumulation detected. Tissue recovery incomplete. Reduced output today."
  ],
  'hrv': [
    "HRV below personal baseline. Autonomic nervous system recovery incomplete. Low-intensity session only.",
    "Heart rate variability depressed. Parasympathetic recovery insufficient. Reduce training stimulus.",
    "HRV deviation detected. Nervous system still processing recent load. Restorative movement only."
  ],
  'sleep': [
    "Sleep quality below threshold. Recovery capacity reduced. Intensity adjustment required.",
    "Sleep deficit detected. Neuromuscular recovery incomplete. Low-output session recommended.",
    "Sleep data indicates insufficient recovery. Training response will be suboptimal. Modify accordingly."
  ],
  'fatigue': [
    "Fatigue index elevated. Accumulated load exceeds recovery capacity. Deload session indicated.",
    "System fatigue detected. Coordination and reaction time impaired. Light movement only.",
    "Fatigue accumulation above threshold. Recovery-focused session to complete adaptation."
  ],
  'symptoms': [
    "Symptom report logged. Area requires protection. Modified session around affected region.",
    "Reported discomfort noted. Training around affected area to maintain activity without aggravation.",
    "Symptom signal detected. Tissue attention required. Load restricted to unaffected areas."
  ]
};

// Data basis text — clinical, factual. No coaching language.
const MEANING_VARIATIONS: Record<string, string[]> = {
  'monotony': [
    "Repetitive loading patterns increase overuse injury risk. Varied stimulus distributes mechanical stress across tissue groups.",
    "Monotony above 2.0 correlates with increased soft tissue complaint frequency. Cross-training reduces this metric.",
    "High monotony reduces adaptation rate. Different movement patterns activate alternate motor units and connective tissue."
  ],
  'acwr': [
    "ACWR above 1.5 associated with 2-4x injury risk increase. Moderation today returns ratio to safe zone within 48 hours.",
    "Acute load spike detected. Backing off prevents tissue overload and preserves training capacity for subsequent sessions.",
    "Workload ratio imbalance requires correction. Consolidation allows structural adaptation to catch up with training stimulus."
  ],
  'strain': [
    "7-day strain accumulation exceeds recovery capacity estimate. Reduced load allows micro-damage repair cycle to complete.",
    "High strain accumulates tissue micro-damage. Load reduction prevents minor stress from compounding into clinical presentation.",
    "Weekly load management protects training consistency over subsequent weeks. Short-term reduction, long-term gain."
  ],
  'hrv': [
    "HRV reflects autonomic nervous system recovery state. Below-baseline readings indicate incomplete parasympathetic restoration.",
    "Depressed HRV signals nervous system still processing recent load. Gentle movement restores balance without additional demand.",
    "Autonomic recovery incomplete. Restorative movement facilitates parasympathetic upregulation more effectively than rest alone."
  ],
  'sleep': [
    "Sleep quality directly modulates training adaptation. Insufficient sleep reduces protein synthesis and hormonal recovery.",
    "Sleep deficit impairs neuromuscular recovery. Training response under these conditions is suboptimal to counterproductive.",
    "Sleep data indicates recovery debt. Lower intensity allows the body to allocate resources to restoration processes."
  ],
  'fatigue': [
    "Elevated fatigue index correlates with impaired motor control and increased injury probability. Light movement preserves blood flow.",
    "Accumulated fatigue degrades form quality and reaction time. Deload session maintains activity without compounding risk.",
    "Fatigue above threshold impairs coordination. Recovery-focused movement supports adaptation without additional strain."
  ],
  'symptoms': [
    "Symptom reports indicate tissue requiring attention. Training around affected area maintains fitness while protecting recovery.",
    "Continued loading through symptomatic tissue risks chronification. Modified approach preserves long-term function.",
    "Symptom signal warrants load modification. Unaffected areas can be trained normally to maintain conditioning."
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
          <div className="h-9 w-9 bg-primary/10 flex items-center justify-center shrink-0">
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
          <div className="h-9 w-9 bg-primary/10 flex items-center justify-center shrink-0">
            <Compass className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Load Assessment</h3>
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
    toast.success("Noted!", {
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

    return riskDrivers.explanation || "Training pattern analysis complete. Adjustment identified.";
  };

  // Generate calm recommendation text
  const generateRecommendationText = () => {
    if (!session) return null;
    return `Recommended: ${session.title.toLowerCase()}. Maintains activity while reducing system load.`;
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
            <button className="flex-1 flex items-center justify-between text-left group hover:bg-muted/30 transition-colors -m-4 p-4 ">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 flex items-center justify-center">
                  <Compass className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Load Assessment</h3>
                  <p className="text-xs text-muted-foreground">{yvesRec ? "Compiled today" : "Current session assessment"}</p>
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
                  <div className=" bg-muted/40 border border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Pattern Identified</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {yvesRec.internal_reasoning}
                    </p>
                  </div>
                )}

                {/* B. Recommendation — Yves recommendation_text */}
                <div className=" bg-primary/8 border border-primary/20 p-4">
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
                            <span>Data Basis</span>
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
                          <span>{isDataExpanded ? "Hide Data" : "View Data"}</span>
                          <ChevronDown className={cn("h-3 w-3 transition-transform", isDataExpanded && "rotate-180")} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-3 ">
                          Based on: {yvesRec.data_sources.join(", ")}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>

                {/* D. Feedback Section */}
                <div className="pt-2">
                  {feedbackGiven ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground rounded-md bg-card">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Noted!</span>
                    </div>
                  ) : (
                    <div className="rounded-md border border-[#D5D6CE]/25 bg-card p-4 hover:brightness-105 transition-all duration-200">
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
                {/* A. Observation Card - "Pattern Identified" */}
                {riskDrivers && riskDrivers.primary && (
                  <div className=" bg-muted/40 border border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Pattern Identified</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {generateObservationText()}
                    </p>
                  </div>
                )}

                {/* B. Recommendation Card - "Recommendation" */}
                {session && (
                  <div className=" bg-primary/8 border border-primary/20 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Recommendation</span>
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
                          <span>{isSessionExpanded ? "Hide Session Plan" : "View Session Plan"}</span>
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
                              <div className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1">
                                {completionPercent}% complete
                              </div>
                            )}
                          </div>

                          {session.intensity.hrZone && (
                            <div className="p-3 rounded-md bg-muted/50 text-sm">
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
                                    "w-full text-left p-3 rounded-md border transition-all",
                                    completedExercises.has(idx)
                                      ? "bg-primary/10 border-primary/30"
                                      : "bg-card hover:bg-muted/50 border-border/50"
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={cn(
                                      "mt-0.5 h-5 w-5 border-2 flex items-center justify-center shrink-0 transition-colors",
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
                            <div className="p-3 rounded-md bg-muted/30 border border-border/50 space-y-2">
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
                            <span>Data Basis</span>
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
                          <span>{isDataExpanded ? "Hide Data" : "View Data"}</span>
                          <ChevronDown className={cn("h-3 w-3 transition-transform", isDataExpanded && "rotate-180")} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-3 ">
                          {generateDataText()}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

                {/* D. Feedback Section */}
                <div className="pt-2">
                  {feedbackGiven ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground rounded-md bg-card">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Noted!</span>
                    </div>
                  ) : (
                    <div className="rounded-md border border-[#D5D6CE]/25 bg-card p-4 hover:brightness-105 transition-all duration-200">
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
