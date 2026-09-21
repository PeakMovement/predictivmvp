import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdaptationProfile {
  preferred_categories: Record<string, number>;
  optimal_timing: Record<string, number>;
  effective_tone: 'supportive' | 'coach' | 'clinical' | 'balanced';
  follow_through_rate: number;
  avg_response_time_hours: number | null;
  threshold_adjustments: Record<string, number>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body.user_id || null;
    } catch {
      // No body - process all users
    }


    // Get users to process
    let userIds: string[] = [];
    if (userId) {
      userIds = [userId];
    } else {
      // Get all users with recent engagement
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activeUsers } = await supabase
        .from("engagement_events")
        .select("user_id")
        .gte("created_at", thirtyDaysAgo.toISOString());
      
      userIds = [...new Set(activeUsers?.map(u => u.user_id) || [])];
    }

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users to process", users_processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, AdaptationProfile> = {};

    for (const uid of userIds) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch engagement data
      const [
        engagementResult,
        outcomesResult,
        recommendationsResult,
      ] = await Promise.all([
        supabase.from("engagement_events")
          .select("event_type, target_type, metadata, created_at")
          .eq("user_id", uid)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("recommendation_outcomes")
          .select("outcome_type, user_feedback, created_at")
          .eq("user_id", uid)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("yves_recommendations")
          .select("category, priority, feedback_score, created_at, acknowledged_at")
          .eq("user_id", uid)
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      const engagements = engagementResult.data || [];
      const outcomes = outcomesResult.data || [];
      const recommendations = recommendationsResult.data || [];

      // Calculate preferred categories based on follow-through
      const categoryFollowThrough: Record<string, { followed: number; total: number }> = {};
      for (const rec of recommendations) {
        const cat = rec.category || 'general';
        if (!categoryFollowThrough[cat]) {
          categoryFollowThrough[cat] = { followed: 0, total: 0 };
        }
        categoryFollowThrough[cat].total++;
        if (rec.feedback_score && rec.feedback_score >= 4) {
          categoryFollowThrough[cat].followed++;
        }
      }

      const preferredCategories: Record<string, number> = {};
      for (const [cat, stats] of Object.entries(categoryFollowThrough)) {
        preferredCategories[cat] = stats.total > 0 ? Math.round((stats.followed / stats.total) * 100) : 50;
      }

      // Calculate optimal timing (hour of day when most engaged)
      const hourCounts: Record<number, number> = {};
      for (const event of engagements) {
        const hour = new Date(event.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }

      const optimalTiming: Record<string, number> = {
        morning: (hourCounts[6] || 0) + (hourCounts[7] || 0) + (hourCounts[8] || 0) + (hourCounts[9] || 0),
        midday: (hourCounts[10] || 0) + (hourCounts[11] || 0) + (hourCounts[12] || 0) + (hourCounts[13] || 0),
        afternoon: (hourCounts[14] || 0) + (hourCounts[15] || 0) + (hourCounts[16] || 0) + (hourCounts[17] || 0),
        evening: (hourCounts[18] || 0) + (hourCounts[19] || 0) + (hourCounts[20] || 0) + (hourCounts[21] || 0),
      };

      // Calculate follow-through rate
      const followedCount = outcomes.filter(o => o.outcome_type === 'followed').length;
      const totalOutcomes = outcomes.length;
      const followThroughRate = totalOutcomes > 0 ? Math.round((followedCount / totalOutcomes) * 100) : 50;

      // Calculate average response time
      const responseTimes: number[] = [];
      for (const rec of recommendations) {
        if (rec.acknowledged_at && rec.created_at) {
          const created = new Date(rec.created_at).getTime();
          const acknowledged = new Date(rec.acknowledged_at).getTime();
          const hoursToRespond = (acknowledged - created) / (1000 * 60 * 60);
          if (hoursToRespond > 0 && hoursToRespond < 168) { // Within a week
            responseTimes.push(hoursToRespond);
          }
        }
      }
      const avgResponseTime = responseTimes.length > 0
        ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
        : null;

      // Determine effective tone based on feedback
      const helpfulEvents = engagements.filter(e => e.event_type === 'recommendation_helpful').length;
      const notHelpfulEvents = engagements.filter(e => e.event_type === 'recommendation_not_helpful').length;
      
      let effectiveTone: 'supportive' | 'coach' | 'clinical' | 'balanced' = 'balanced';
      if (helpfulEvents > notHelpfulEvents * 2) {
        // User is responding well - can be more direct
        effectiveTone = followThroughRate > 70 ? 'coach' : 'supportive';
      } else if (notHelpfulEvents > helpfulEvents) {
        // User finding recommendations unhelpful - try clinical/factual
        effectiveTone = 'clinical';
      }

      const profile: AdaptationProfile = {
        preferred_categories: preferredCategories,
        optimal_timing: optimalTiming,
        effective_tone: effectiveTone,
        follow_through_rate: followThroughRate,
        avg_response_time_hours: avgResponseTime,
        threshold_adjustments: {}, // Can be expanded based on tolerance patterns
      };

      // Upsert to database
      await supabase.from("user_adaptation_profile").upsert({
        user_id: uid,
        preferred_categories: profile.preferred_categories,
        optimal_timing: profile.optimal_timing,
        effective_tone: profile.effective_tone,
        follow_through_rate: profile.follow_through_rate,
        avg_response_time_hours: profile.avg_response_time_hours,
        threshold_adjustments: profile.threshold_adjustments,
        last_adapted: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      results[uid] = profile;
    }

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: userIds.length,
        profiles: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[adapt-user-model] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
