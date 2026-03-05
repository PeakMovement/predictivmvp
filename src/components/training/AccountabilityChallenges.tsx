import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Target, Calendar, TrendingUp, Check, X, Plus } from "lucide-react";
import { format } from "date-fns";

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export const AccountabilityChallenges = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("accountability_challenges")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setChallenges(data || []);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast({
        title: "Error",
        description: "Failed to load challenges",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptChallenge = async (challengeId: string) => {
    try {
      const { error } = await supabase
        .from("accountability_challenges")
        .update({ status: "active" })
        .eq("id", challengeId);

      if (error) throw error;

      toast({
        title: "Challenge Accepted!",
        description: "You've accepted the challenge. Time to get to work!",
      });

      fetchChallenges();
    } catch (error) {
      console.error("Error accepting challenge:", error);
      toast({
        title: "Error",
        description: "Failed to accept challenge",
        variant: "destructive",
      });
    }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    try {
      const { error } = await supabase
        .from("accountability_challenges")
        .update({ status: "declined" })
        .eq("id", challengeId);

      if (error) throw error;

      toast({
        title: "Challenge Declined",
        description: "Challenge has been declined",
      });

      fetchChallenges();
    } catch (error) {
      console.error("Error declining challenge:", error);
      toast({
        title: "Error",
        description: "Failed to decline challenge",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "declined":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case "workout_streak":
        return <Trophy className="h-4 w-4" />;
      case "distance_goal":
        return <Target className="h-4 w-4" />;
      case "frequency_goal":
        return <Calendar className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const activeChallenges = challenges.filter((c) => c.status === "active" || c.status === "pending");
  const completedChallenges = challenges.filter((c) => c.status === "completed");

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Accountability Challenges
          </CardTitle>
          <CardDescription>Loading challenges...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Accountability Challenges
        </CardTitle>
        <CardDescription>
          {activeChallenges.length > 0
            ? `${activeChallenges.length} active challenge${activeChallenges.length !== 1 ? "s" : ""}`
            : "No active challenges"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground mb-4">No challenges yet</p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </div>
        ) : (
          <>
            {/* Active & Pending Challenges */}
            {activeChallenges.map((challenge) => {
              const progress = calculateProgress(challenge.current_value, challenge.target_value);
              const daysLeft = Math.ceil(
                (new Date(challenge.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div
                  key={challenge.id}
                  className="p-4 rounded-lg border border-border/50 bg-secondary/30 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        {getChallengeIcon(challenge.challenge_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{challenge.title}</h4>
                          <Badge variant="outline" className={getStatusColor(challenge.status)}>
                            {challenge.status}
                          </Badge>
                        </div>
                        {challenge.description && (
                          <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
                          </span>
                          <span>
                            {format(new Date(challenge.start_date), "MMM d")} -{" "}
                            {format(new Date(challenge.end_date), "MMM d")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">
                        {challenge.current_value} / {challenge.target_value} {challenge.unit}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-right text-muted-foreground">{progress}% complete</p>
                  </div>

                  {challenge.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAcceptChallenge(challenge.id)}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineChallenge(challenge.id)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Completed Challenges Summary */}
            {completedChallenges.length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>
                    {completedChallenges.length} challenge{completedChallenges.length !== 1 ? "s" : ""} completed
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
