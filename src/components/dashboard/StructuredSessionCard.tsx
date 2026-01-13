import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Clock, Flame, Target, AlertTriangle, Dumbbell, Play, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StructuredSession } from "@/lib/riskDrivers";

interface StructuredSessionCardProps {
  session: StructuredSession;
  className?: string;
}

export function StructuredSessionCard({ session, className }: StructuredSessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());

  const toggleExercise = (index: number) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedExercises(newCompleted);
  };

  const completionPercent = session.mainBlock.exercises.length > 0
    ? Math.round((completedExercises.size / session.mainBlock.exercises.length) * 100)
    : 0;

  return (
    <Card className={cn("overflow-hidden border-primary/20", className)}>
      {/* Header */}
      <div className="bg-primary/5 p-3 border-b border-primary/10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              {session.title}
            </h4>
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

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <span>{isExpanded ? "Hide details" : "View full session"}</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Intensity zone */}
            {session.intensity.hrZone && (
              <div className="p-2 rounded-md bg-muted/50 text-xs">
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
    </Card>
  );
}
