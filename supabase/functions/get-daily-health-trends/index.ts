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
      console.error("[get-daily-health-trends] [ERROR] No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("[get-daily-health-trends] [ERROR] Invalid token:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query params
    const url = new URL(req.url);
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "90"), 365);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build query - RLS enforced, only user's data returned
    let query = supabase
      .from("health_trends_daily")
      .select("period_date, metric_name, value, baseline, delta, trend_direction, updated_at")
      .eq("user_id", user.id)
      .order("period_date", { ascending: true })
      .range(offset, offset + limit - 1);

    if (startDate) {
      query = query.gte("period_date", startDate);
    }
    if (endDate) {
      query = query.lte("period_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[get-daily-health-trends] [ERROR] Query failed:", error.message);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[get-daily-health-trends] [SUCCESS] Returned ${data?.length || 0} records for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        count: data?.length || 0,
        pagination: { limit, offset },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[get-daily-health-trends] [ERROR] Unexpected:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});