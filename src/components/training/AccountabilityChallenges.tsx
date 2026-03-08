import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserChallenges } from "@/hooks/useUserChallenges";
import { Trophy, Target, Calendar, TrendingUp, Check, X, Sparkles, Loader2, Brain, Activity } from "lucide-react";
import { format } from "date-fns";

const METRIC_LABELS: Record<string, string> = {
  session_count: "sessions",
  total_distance: "km",
  avg_sleep_score: "avg score",
  avg_readiness: "avg score",
  avg_hrv: "avg ms",
};

export const AccountabilityChallenges = () => {
  const {
    pendingChallenges,
    activeChallenges,
    completedChallenges,
    isLoading,
    acceptChallenge,
    completeChallenge,
    abandonChallenge,
    generateChallenges,
  } = useUserChallenges();
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await generateChallenges();
      toast({
        title: "Challenges Generated! ✨",
        description: "Yves has created personalised challenges based on your data",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate challenges. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await acceptChallenge(id);
      toast({
        title: "Challenge Accepted! 💪",
        description: "Progress will be tracked automatically from your wearable data",
      });
    } catch {
      toast({ title: "Error", description: "Failed to accept challenge", variant: "destructive" });
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeChallenge(id);
      toast({ title: "Challenge Completed! 🎉" });
    } catch {
      toast({ title: "Error", description: "Failed to complete challenge", variant: "destructive" });
    }
  };

  const handleAbandon = async (id: string) => {
    try {
      await abandonChallenge(id);
      toast({ title: "Challenge Abandoned" });
    } catch {
      toast({ title: "Error", description: "Failed to abandon challenge", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "border-primary/30 text-primary bg-primary/10";
      case "completed": return "border-green-500/30 text-green-600 bg-green-500/10";
      case "pending": return "border-amber-500/30 text-amber-600 bg-amber-500/10";
      case "expired": return "border-muted-foreground/30 text-muted-foreground bg-muted/50";
      default: return "border-border text-muted-foreground bg-muted/50";
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case "workout_frequency": return <Trophy className="h-4 w-4" />;
      case "distance_goal": return <Target className="h-4 w-4" />;
      case "sleep_target": return <Calendar className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const allActive = [...pendingChallenges, ...activeChallenges];

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Weekly Challenges
          </CardTitle>
          <CardDescription>Loading challenges...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Weekly Challenges
            </CardTitle>
            <CardDescription>
              {allActive.length > 0
                ? `${activeChallenges.length} active, ${pendingChallenges.length} pending`
                : "AI-powered challenges based on your health data"}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? "Generating..." : "New Challenges"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {allActive.length === 0 && completedChallenges.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground mb-4">No challenges yet</p>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Challenges
            </Button>
          </div>
        ) : (
          <>
            {allActive.map((challenge) => {
              const progress = challenge.target_value
                ? Math.min(Math.round((challenge.current_progress / challenge.target_value) * 100), 100)
                : 0;
              const metricLabel = challenge.progress_metric
                ? METRIC_LABELS[challenge.progress_metric] || ""
                : "";
              const isAutoTracked = !!challenge.progress_metric;

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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-foreground">{challenge.challenge_title}</h4>
                          <Badge variant="outline" className={getStatusColor(challenge.status)}>
                            {challenge.status}
                          </Badge>
                          {isAutoTracked && (
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                              <Activity className="h-3 w-3 mr-1" />
                              Auto-tracked
                            </Badge>
                          )}
                        </div>
                        {challenge.challenge_description && (
                          <p className="text-sm text-muted-foreground mb-2">{challenge.challenge_description}</p>
                        )}

                        {/* AI Reasoning */}
                        {challenge.ai_reasoning && (
                          <div className="flex items-start gap-2 p-2 rounded bg-secondary/50 border border-border/30 mb-2">
                            <Brain className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">{challenge.ai_reasoning}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {challenge.expires_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires {format(new Date(challenge.expires_at), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar for active challenges */}
                  {challenge.status === "active" && challenge.target_value && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">
                          {challenge.current_progress} / {challenge.target_value} {metricLabel}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      {progress >= 100 && (
                        <p className="text-xs text-primary font-medium">🎯 Target reached!</p>
                      )}
                    </div>
                  )}

                  {/* Accept/Decline for pending */}
                  {challenge.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="default" onClick={() => handleAccept(challenge.id)} className="flex-1">
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAbandon(challenge.id)} className="flex-1">
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  )}

                  {/* Complete/Abandon for active */}
                  {challenge.status === "active" && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="default" onClick={() => handleComplete(challenge.id)} className="flex-1">
                        <Check className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAbandon(challenge.id)}>
                        <X className="h-4 w-4 mr-2" />
                        Abandon
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {completedChallenges.length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
