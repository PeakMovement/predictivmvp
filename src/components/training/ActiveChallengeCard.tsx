import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, CheckCircle2, X, Brain, Activity } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { UserChallenge } from "@/hooks/useUserChallenges";

interface ActiveChallengeCardProps {
  challenge: UserChallenge;
  onComplete: (id: string) => Promise<void>;
  onAbandon: (id: string) => Promise<void>;
}

const METRIC_LABELS: Record<string, string> = {
  session_count: "sessions",
  total_distance: "km",
  avg_sleep_score: "avg score",
  avg_readiness: "avg score",
  avg_hrv: "avg ms",
};

export const ActiveChallengeCard = ({
  challenge,
  onComplete,
  onAbandon,
}: ActiveChallengeCardProps) => {
  const { toast } = useToast();

  const handleComplete = async () => {
    try {
      await onComplete(challenge.id);
      toast({
        title: "Challenge Completed! 🎉",
        description: `You completed "${challenge.challenge_title}"`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to complete challenge",
        variant: "destructive",
      });
    }
  };

  const handleAbandon = async () => {
    try {
      await onAbandon(challenge.id);
      toast({
        title: "Challenge Abandoned",
        description: "You can accept a new challenge anytime",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to abandon challenge",
        variant: "destructive",
      });
    }
  };

  const progressPercent = challenge.target_value
    ? Math.min((challenge.current_progress / challenge.target_value) * 100, 100)
    : 0;

  const metricLabel = challenge.progress_metric
    ? METRIC_LABELS[challenge.progress_metric] || ""
    : "";

  const isAutoTracked = !!challenge.progress_metric;

  return (
    <Card className="p-6 border-primary/30 bg-primary/5">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">
                  {challenge.challenge_title}
                </h3>
                {isAutoTracked && (
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    <Activity className="h-3 w-3 mr-1" />
                    Auto-tracked
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {challenge.challenge_description}
              </p>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        {challenge.ai_reasoning && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border/50">
            <Brain className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">{challenge.ai_reasoning}</p>
          </div>
        )}

        {/* Progress */}
        {challenge.target_value && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">
                {challenge.current_progress} / {challenge.target_value} {metricLabel}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {progressPercent >= 100 && (
              <p className="text-xs text-primary font-medium">🎯 Target reached!</p>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span>
            Started {challenge.accepted_at ? format(new Date(challenge.accepted_at), "MMM d, yyyy") : "—"}
          </span>
          {challenge.expires_at && (
            <span>
              Expires {format(new Date(challenge.expires_at), "MMM d")}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-2"
            onClick={handleComplete}
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Complete
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAbandon}
          >
            <X className="h-4 w-4" />
            Abandon
          </Button>
        </div>
      </div>
    </Card>
  );
};
