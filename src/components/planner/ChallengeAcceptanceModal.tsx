import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Target, Trophy } from "lucide-react";
import { startOfWeek, format } from "date-fns";

interface Challenge {
  title: string;
  description: string;
  type: string;
  tone: 'coach' | 'warm' | 'strategic';
}

interface ChallengeAcceptanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
  onChallengeAccepted: () => void;
}

export const ChallengeAcceptanceModal = ({
  open,
  onOpenChange,
  challenge,
  onChallengeAccepted,
}: ChallengeAcceptanceModalProps) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    if (!challenge) return;

    try {
      setIsAccepting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

      const { error } = await supabase.from("user_challenges").insert({
        user_id: user.id,
        challenge_title: challenge.title,
        challenge_description: challenge.description,
        challenge_type: challenge.type,
        week_start_date: format(weekStart, "yyyy-MM-dd"),
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Challenge Accepted!",
        description: "Track your progress in the Training page",
      });

      onChallengeAccepted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error accepting challenge:", error);
      toast({
        title: "Error",
        description: "Failed to accept challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  if (!challenge) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Accept This Challenge?</DialogTitle>
          <DialogDescription className="text-center">
            Committing to this weekly challenge will help you stay focused and track your progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">{challenge.title}</h3>
                <p className="text-sm text-muted-foreground">{challenge.description}</p>
              </div>
            </div>
          </div>

          <div className="bg-secondary/30 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">What happens next?</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Your challenge will be tracked in the Training page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>You'll receive progress updates throughout the week</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Complete it by end of week for a sense of accomplishment</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="sm:justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAccepting}
          >
            Maybe Later
          </Button>
          <Button onClick={handleAccept} disabled={isAccepting}>
            {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept Challenge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
