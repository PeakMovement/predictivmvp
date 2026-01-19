import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, Clock, MessageSquare, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdaptationProfile {
  preferred_categories: string[];
  metric_importance_weights: Record<string, number>;
  optimal_timing: {
    preferred_hour: number;
    preferred_days: string[];
  };
  effective_tone: string;
  follow_through_rate: number;
  engagement_score: number;
  last_analyzed: string;
}

export function PersonalizationInsights() {
  const [profile, setProfile] = useState<AdaptationProfile | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadAdaptationProfile();
    }
  }, [isOpen]);

  const loadAdaptationProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_adaptation_profile")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          preferred_categories: data.preferred_categories as string[],
          metric_importance_weights: data.metric_importance_weights as Record<string, number>,
          optimal_timing: data.optimal_timing as any,
          effective_tone: data.effective_tone as string,
          follow_through_rate: data.follow_through_rate || 0,
          engagement_score: data.engagement_score || 0,
          last_analyzed: data.last_analyzed as string,
        });
      }
    } catch (error) {
      console.error("Error loading adaptation profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const getToneLabel = (tone: string) => {
    const labels: Record<string, string> = {
      coach: "Direct & Motivating",
      warm: "Empathetic & Supportive",
      supportive: "Encouraging & Gentle",
      strategic: "Analytical & Data-Driven",
      balanced: "Balanced Approach",
    };
    return labels[tone] || tone;
  };

  const getEngagementLevel = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "text-green-600" };
    if (score >= 60) return { label: "Good", color: "text-blue-600" };
    if (score >= 40) return { label: "Fair", color: "text-yellow-600" };
    return { label: "Building", color: "text-gray-600" };
  };

  const getFollowThroughLevel = (rate: number) => {
    if (rate >= 70) return { label: "High", color: "text-green-600" };
    if (rate >= 50) return { label: "Moderate", color: "text-blue-600" };
    if (rate >= 30) return { label: "Developing", color: "text-yellow-600" };
    return { label: "Early Stage", color: "text-gray-600" };
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <button className="w-full text-left group">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                How Yves Learns About You
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200 ml-auto",
                  isOpen && "rotate-180"
                )} />
              </CardTitle>
              <CardDescription className="mt-1.5">
                See how your daily briefings are becoming more personalized
              </CardDescription>
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading personalization data...</p>
            ) : !profile ? (
              <div className="text-center py-6">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Yves is learning your preferences
                </p>
                <p className="text-xs text-muted-foreground">
                  Keep engaging with your briefings and recommendations to help Yves personalize your experience
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Engagement Level</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={profile.engagement_score} className="flex-1" />
                      <span className={cn("text-sm font-semibold", getEngagementLevel(profile.engagement_score).color)}>
                        {getEngagementLevel(profile.engagement_score).label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {profile.engagement_score}% interaction with insights
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Follow-Through Rate</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={profile.follow_through_rate} className="flex-1" />
                      <span className={cn("text-sm font-semibold", getFollowThroughLevel(profile.follow_through_rate).color)}>
                        {getFollowThroughLevel(profile.follow_through_rate).label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {profile.follow_through_rate}% of recommendations followed
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Your Communication Style</p>
                      <Badge variant="secondary" className="mb-2">
                        {getToneLabel(profile.effective_tone)}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Yves adapts language based on what resonates with you
                      </p>
                    </div>
                  </div>

                  {profile.optimal_timing && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Best Time for You</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Most active around {formatHour(profile.optimal_timing.preferred_hour)}
                        </p>
                        {profile.optimal_timing.preferred_days?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {profile.optimal_timing.preferred_days.slice(0, 3).map((day) => (
                              <Badge key={day} variant="outline" className="text-xs">
                                {day}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {profile.metric_importance_weights && Object.keys(profile.metric_importance_weights).length > 0 && (
                    <div className="flex items-start gap-2">
                      <Brain className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Metrics You Care About</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(profile.metric_importance_weights)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([metric]) => (
                              <Badge key={metric} variant="secondary" className="text-xs">
                                {metric}
                              </Badge>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Briefings prioritize these metrics in recommendations
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {profile.last_analyzed && (
                  <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                    Last updated: {new Date(profile.last_analyzed).toLocaleDateString()}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
