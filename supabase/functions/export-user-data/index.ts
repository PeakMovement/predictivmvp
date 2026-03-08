import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uid = user.id;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Fetch all data in parallel
    const [
      profileRes,
      sessionsRes,
      memoryRes,
      briefingsRes,
      recommendationsRes,
      injuryRes,
      practitionerRes,
    ] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("wearable_sessions").select("*").eq("user_id", uid).gte("date", ninetyDaysAgo).order("date", { ascending: false }),
      supabase.from("yves_memory_bank").select("*").eq("user_id", uid).order("last_updated", { ascending: false }),
      supabase.from("daily_briefings").select("*").eq("user_id", uid).order("date", { ascending: false }),
      supabase.from("yves_recommendations").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("user_injury_profiles").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabase.from("practitioner_access").select("*").eq("patient_id", uid),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: uid,
      email: user.email,
      profile: profileRes.data ?? null,
      wearable_sessions: sessionsRes.data ?? [],
      yves_memory_bank: memoryRes.data ?? [],
      daily_briefings: briefingsRes.data ?? [],
      yves_recommendations: recommendationsRes.data ?? [],
      injury_profiles: injuryRes.data ?? [],
      practitioner_access: practitionerRes.data ?? [],
    };

    const filename = `predictiv-data-export-${new Date().toISOString().split("T")[0]}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("export-user-data error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Export failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
