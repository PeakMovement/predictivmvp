import { createClient } from "npm:@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

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

    const body = await req.json().catch(() => ({}));
    const targetUserId: string | null = body.user_id || null;

    console.log(`[generate-insights] Starting${targetUserId ? ` for user ${targetUserId}` : " for all users"}`);

    // Fetch users with deviation data
    let query = supabase
      .from("yves_profiles")
      .select("user_id, metric, baseline_value, current_value, deviation_pct, risk_status")
      .not("baseline_value", "is", null);

    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: profiles, error: profileError } = await query;
    if (profileError) throw new Error(`Failed to fetch profiles: ${profileError.message}`);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, insights_generated: 0, message: "No profile data to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by user
    const byUser: Record<string, typeof profiles> = {};
    for (const p of profiles) {
      if (!byUser[p.user_id]) byUser[p.user_id] = [];
      byUser[p.user_id].push(p);
    }

    let totalInsights = 0;

    for (const [userId, userProfiles] of Object.entries(byUser)) {
      // Only generate insights for metrics with notable deviations
      const notableMetrics = userProfiles.filter(
        (p) => Math.abs(p.deviation_pct ?? 0) >= 10 || p.risk_status === "high" || p.risk_status === "moderate"
      );

      if (notableMetrics.length === 0) continue;

      const metricsText = notableMetrics
        .map(
          (p) =>
            `${p.metric}: current=${p.current_value?.toFixed(1)}, baseline=${p.baseline_value?.toFixed(1)}, deviation=${p.deviation_pct?.toFixed(1)}%, risk=${p.risk_status}`
        )
        .join("\n");

      const prompt = `You are a sports performance analyst. Generate a brief, actionable insight and suggestion for each metric below.

Metrics with deviations:
${metricsText}

For each metric return JSON: { "metric": string, "insight": string (1 sentence, factual), "suggestion": string (1 actionable step) }

Return only a JSON array, no markdown, no explanation.`;

      let insights: Array<{ metric: string; insight: string; suggestion: string }> = [];

      try {
        const aiResponse = await callAI([{ role: "user", content: prompt }], 600);
        const cleaned = aiResponse.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        insights = JSON.parse(cleaned);
      } catch (aiErr) {
        console.error(`[generate-insights] AI failed for user ${userId}:`, aiErr);
        // Generate rule-based fallback insights
        insights = notableMetrics.map((p) => ({
          metric: p.metric,
          insight: `${p.metric} is ${Math.abs(p.deviation_pct ?? 0).toFixed(0)}% ${(p.deviation_pct ?? 0) > 0 ? "above" : "below"} your personal baseline.`,
          suggestion:
            p.risk_status === "high"
              ? `Reduce training intensity today and monitor ${p.metric} over the next 48 hours.`
              : `Continue monitoring ${p.metric} and adjust training if the trend continues.`,
        }));
      }

      // Upsert insights to yves_insights table
      for (const ins of insights) {
        const matchingProfile = notableMetrics.find((p) => p.metric === ins.metric);
        if (!matchingProfile) continue;

        const { error: upsertError } = await supabase.from("yves_insights").upsert(
          {
            user_id: userId,
            metric: ins.metric,
            deviation_pct: matchingProfile.deviation_pct ?? 0,
            risk_status: matchingProfile.risk_status ?? "low",
            insight: ins.insight,
            suggestion: ins.suggestion,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,metric" }
        );

        if (!upsertError) {
          totalInsights++;
          console.log(`[generate-insights] Upserted insight for user ${userId}, metric: ${ins.metric}`);
        } else {
          console.error(`[generate-insights] Upsert error for ${ins.metric}:`, upsertError.message);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, insights_generated: totalInsights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-insights] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
