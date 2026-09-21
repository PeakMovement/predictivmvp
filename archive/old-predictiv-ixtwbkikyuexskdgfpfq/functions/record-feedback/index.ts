import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { user_id, metric, insight, action_taken, feedback_score } = body;

    if (!user_id || !metric) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id and metric are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Record in engagement_events (consumed by adapt-user-model)
    const { error: engagementError } = await supabase.from("engagement_events").insert({
      user_id,
      event_type: feedback_score >= 4 ? "recommendation_helpful" : feedback_score <= 2 ? "recommendation_not_helpful" : "recommendation_acknowledged",
      target_type: "insight",
      metadata: {
        metric,
        insight,
        action_taken: action_taken ?? "Acknowledged",
        feedback_score: feedback_score ?? 1,
      },
    });

    if (engagementError) {
      console.error("[record-feedback] Engagement event error:", engagementError.message);
    }

    // Also update the insight acknowledgement timestamp in yves_insights
    const { error: insightError } = await supabase
      .from("yves_insights")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .eq("metric", metric);

    if (insightError) {
      // Non-fatal — table may not have acknowledged_at column yet
      console.warn("[record-feedback] Could not update yves_insights acknowledged_at:", insightError.message);
    }

    // Store in recommendation_outcomes for adaptation model
    const { error: outcomeError } = await supabase.from("recommendation_outcomes").insert({
      user_id,
      outcome_type: action_taken === "Acknowledged" ? "followed" : "dismissed",
      user_feedback: insight ?? null,
    });

    if (outcomeError) {
      console.warn("[record-feedback] Could not insert recommendation_outcome:", outcomeError.message);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[record-feedback] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
