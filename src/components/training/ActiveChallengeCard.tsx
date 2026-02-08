import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, CheckCircle2, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { UserChallenge } from "@/hooks/useUserChallenges";

interface ActiveChallengeCardProps {
  challenge: UserChallenge;
  onComplete: (id: string) => Promise<void>;
  onAbandon: (id: string) => Promise<void>;
}

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
        title: "Challenge Completed!",
        description: `You completed "${challenge.challenge_title}"`,
      });
    } catch (error) {
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to abandon challenge",
        variant: "destructive",
      });
    }
  };

  const progressPercent = challenge.target_value
    ? (challenge.current_progress / challenge.target_value) * 100
    : 0;

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
              <h3 className="font-semibold text-foreground mb-1">
                {challenge.challenge_title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {challenge.challenge_description}
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        {challenge.target_value && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">
                {challenge.current_progress} / {challenge.target_value}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span>
            Started {format(new Date(challenge.accepted_at), "MMM d, yyyy")}
          </span>
          <span className="capitalize">{challenge.challenge_type}</span>
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
