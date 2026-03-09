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

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Fetch symptom check-ins
    const { data: symptoms } = await supabase
      .from("symptom_check_ins")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const entries: Array<{
      user_id: string;
      memory_key: string;
      memory_value: string;
      last_updated: string;
    }> = [];

    // Convert symptoms to memory entries
    for (const s of symptoms || []) {
      entries.push({
        user_id,
        memory_key: `symptom_${s.id}`,
        memory_value: JSON.stringify({
          type: s.symptom_type,
          severity: s.severity,
          description: s.description,
          body_location: s.body_location,
          triggers: s.triggers,
          date: s.created_at?.split("T")[0],
        }),
        last_updated: new Date().toISOString(),
      });
    }

    // Fetch profile data
    const [profileRes, trainingRes, medicalRes] = await Promise.all([
      supabase.from("user_profile").select("name, goals, activity_level").eq("user_id", user_id).maybeSingle(),
      supabase.from("user_training").select("preferred_activities, training_frequency").eq("user_id", user_id).maybeSingle(),
      supabase.from("user_medical").select("conditions, medications").eq("user_id", user_id).maybeSingle(),
    ]);

    if (profileRes.data) {
      const pd = profileRes.data;
      if (pd.name) {
        entries.push({
          user_id,
          memory_key: "preferred_name",
          memory_value: pd.name,
          last_updated: new Date().toISOString(),
        });
      }
      if (pd.goals?.length || pd.activity_level) {
        entries.push({
          user_id,
          memory_key: "user_goals",
          memory_value: JSON.stringify({ goals: pd.goals || [], activity_level: pd.activity_level }),
          last_updated: new Date().toISOString(),
        });
      }
    }
    if (trainingRes.data) {
      entries.push({
        user_id,
        memory_key: "preferred_training",
        memory_value: JSON.stringify(trainingRes.data),
        last_updated: new Date().toISOString(),
      });
    }
    if (medicalRes.data?.conditions || medicalRes.data?.medications) {
      entries.push({
        user_id,
        memory_key: "medical_context",
        memory_value: JSON.stringify(medicalRes.data),
        last_updated: new Date().toISOString(),
      });
    }

    // Upsert all entries
    let written = 0;
    for (const entry of entries) {
      const { error } = await supabase.from("yves_memory_bank").upsert(entry, { onConflict: "user_id,memory_key" });
      if (error) {
        console.error(`[backfill-memory-bank] Error writing ${entry.memory_key}:`, error);
      } else {
        written++;
      }
    }


    return new Response(
      JSON.stringify({ success: true, entries_written: written, total: entries.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[backfill-memory-bank] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
