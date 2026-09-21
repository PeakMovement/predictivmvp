import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EngagementAnalysis {
  preferred_categories: string[];
  metric_weights: Record<string, number>;
  optimal_timing: {
    preferred_hour: number;
    preferred_days: string[];
  };
  effective_tone: string;
  follow_through_rate: number;
  engagement_score: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }


    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: engagementEvents, error: eventsError } = await supabase
      .from("engagement_events")
      .select("*")
      .eq("user_id", user_id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (eventsError) throw eventsError;

    const { data: recommendationOutcomes, error: outcomesError } = await supabase
      .from("recommendation_outcomes")
      .select("*")
      .eq("user_id", user_id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (outcomesError) throw outcomesError;

    const analysis = analyzeEngagementPatterns(
      engagementEvents || [],
      recommendationOutcomes || []
    );

    const { error: updateError } = await supabase
      .from("user_adaptation_profile")
      .upsert({
        user_id,
        preferred_categories: analysis.preferred_categories,
        metric_importance_weights: analysis.metric_weights,
        optimal_timing: analysis.optimal_timing,
        effective_tone: analysis.effective_tone,
        follow_through_rate: analysis.follow_through_rate,
        engagement_score: analysis.engagement_score,
        last_analyzed: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id"
      });

    if (updateError) throw updateError;


    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        message: "Engagement patterns analyzed and stored successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error analyzing engagement:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function analyzeEngagementPatterns(
  events: any[],
  outcomes: any[]
): EngagementAnalysis {
  const categoryEngagement: Record<string, number> = {};
  const metricInteractions: Record<string, number> = {};
  const hourlyEngagement: Record<number, number> = {};
  const dailyEngagement: Record<string, number> = {};
  const toneEffectiveness: Record<string, { followed: number; total: number }> = {};

  events.forEach((event) => {
    if (event.event_type === "viewed" || event.event_type === "interacted") {
      const category = event.context?.category || "general";
      categoryEngagement[category] = (categoryEngagement[category] || 0) + 1;

      const metric = event.context?.metric;
      if (metric) {
        metricInteractions[metric] = (metricInteractions[metric] || 0) + 1;
      }

      const eventDate = new Date(event.created_at);
      const hour = eventDate.getHours();
      const day = eventDate.toLocaleDateString("en-US", { weekday: "long" });

      hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + 1;
      dailyEngagement[day] = (dailyEngagement[day] || 0) + 1;
    }
  });

  outcomes.forEach((outcome) => {
    const tone = outcome.recommendation_context?.tone || "balanced";
    if (!toneEffectiveness[tone]) {
      toneEffectiveness[tone] = { followed: 0, total: 0 };
    }
    toneEffectiveness[tone].total += 1;
    if (outcome.outcome === "followed" || outcome.outcome === "helpful") {
      toneEffectiveness[tone].followed += 1;
    }
  });

  const sortedCategories = Object.entries(categoryEngagement)
    .sort(([, a], [, b]) => b - a)
    .map(([category]) => category)
    .slice(0, 3);

  const totalMetricInteractions = Object.values(metricInteractions).reduce(
    (sum, count) => sum + count,
    0
  );
  const metricWeights: Record<string, number> = {};
  Object.entries(metricInteractions).forEach(([metric, count]) => {
    metricWeights[metric] = totalMetricInteractions > 0
      ? count / totalMetricInteractions
      : 0;
  });

  const mostActiveHour = Object.entries(hourlyEngagement)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 6;

  const preferredDays = Object.entries(dailyEngagement)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([day]) => day);

  let mostEffectiveTone = "balanced";
  let bestFollowRate = 0;
  Object.entries(toneEffectiveness).forEach(([tone, stats]) => {
    const rate = stats.total > 0 ? stats.followed / stats.total : 0;
    if (rate > bestFollowRate && stats.total >= 3) {
      bestFollowRate = rate;
      mostEffectiveTone = tone;
    }
  });

  const totalRecommendations = outcomes.length;
  const followedRecommendations = outcomes.filter(
    (o) => o.outcome === "followed" || o.outcome === "helpful"
  ).length;
  const followThroughRate = totalRecommendations > 0
    ? (followedRecommendations / totalRecommendations) * 100
    : 0;

  const totalEvents = events.length;
  const interactionEvents = events.filter(
    (e) => e.event_type === "interacted" || e.event_type === "followed"
  ).length;
  const engagementScore = totalEvents > 0
    ? (interactionEvents / totalEvents) * 100
    : 0;

  return {
    preferred_categories: sortedCategories,
    metric_weights: metricWeights,
    optimal_timing: {
      preferred_hour: parseInt(mostActiveHour.toString()),
      preferred_days: preferredDays,
    },
    effective_tone: mostEffectiveTone,
    follow_through_rate: Math.round(followThroughRate),
    engagement_score: Math.round(engagementScore),
  };
}
