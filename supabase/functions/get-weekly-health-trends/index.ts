import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[get-weekly-health-trends] [ERROR] No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("[get-weekly-health-trends] [ERROR] Invalid token:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query params
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "52"), 104); // Up to 2 years
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build query - RLS enforced
    const { data, error } = await supabase
      .from("health_trends_weekly")
      .select("period_start, period_end, metric_name, value, baseline, delta, week_over_week_pct, trend_direction, updated_at")
      .eq("user_id", user.id)
      .order("period_start", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[get-weekly-health-trends] [ERROR] Query failed:", error.message);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by week for frontend consumption
    const groupedByWeek: Record<string, any> = {};
    (data || []).forEach((row) => {
      const weekKey = row.period_start;
      if (!groupedByWeek[weekKey]) {
        groupedByWeek[weekKey] = {
          period_start: row.period_start,
          period_end: row.period_end,
          metrics: {},
        };
      }
      groupedByWeek[weekKey].metrics[row.metric_name] = {
        value: row.value,
        baseline: row.baseline,
        delta: row.delta,
        week_over_week_pct: row.week_over_week_pct,
        trend_direction: row.trend_direction,
      };
    });

    const weeklyData = Object.values(groupedByWeek);

    console.log(`[get-weekly-health-trends] [SUCCESS] Returned ${weeklyData.length} weeks for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: weeklyData,
        raw: data || [],
        count: weeklyData.length,
        pagination: { limit, offset },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[get-weekly-health-trends] [ERROR] Unexpected:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});