import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExportData {
  profile: any;
  wearable_sessions: any[];
  wearable_summary: any[];
  symptom_logs: any[];
  user_documents: any[];
  daily_briefings: any[];
  yves_history: any[];
  user_context: any;
  health_profile: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const exportData: ExportData = {
      profile: null,
      wearable_sessions: [],
      wearable_summary: [],
      symptom_logs: [],
      user_documents: [],
      daily_briefings: [],
      yves_history: [],
      user_context: null,
      health_profile: null,
    };

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    exportData.profile = profile;

    const { data: wearableSessions } = await supabase
      .from("wearable_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("session_date", { ascending: false })
      .limit(1000);
    exportData.wearable_sessions = wearableSessions || [];

    const { data: wearableSummary } = await supabase
      .from("wearable_summary")
      .select("*")
      .eq("user_id", user.id)
      .order("summary_date", { ascending: false })
      .limit(365);
    exportData.wearable_summary = wearableSummary || [];

    const { data: symptomLogs } = await supabase
      .from("symptom_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(1000);
    exportData.symptom_logs = symptomLogs || [];

    const { data: documents } = await supabase
      .from("user_documents")
      .select("id, user_id, filename, uploaded_at, file_type, file_size, analysis_status")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });
    exportData.user_documents = documents || [];

    const { data: briefings } = await supabase
      .from("daily_briefing")
      .select("*")
      .eq("user_id", user.id)
      .order("briefing_date", { ascending: false })
      .limit(90);
    exportData.daily_briefings = briefings || [];

    const { data: yvesHistory } = await supabase
      .from("yves_chat_history")
      .select("message, response, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    exportData.yves_history = yvesHistory || [];

    const { data: userContext } = await supabase
      .from("user_context_enhanced")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    exportData.user_context = userContext;

    const { data: healthProfile } = await supabase
      .from("user_health_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    exportData.health_profile = healthProfile;

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";

    if (format === "csv") {
      let csvContent = "Data Export\n\n";

      csvContent += "Profile Information\n";
      if (exportData.profile) {
        csvContent += Object.entries(exportData.profile)
          .map(([key, value]) => `${key},${value}`)
          .join("\n");
        csvContent += "\n\n";
      }

      csvContent += "Wearable Sessions\n";
      if (exportData.wearable_sessions.length > 0) {
        const headers = Object.keys(exportData.wearable_sessions[0]).join(",");
        csvContent += headers + "\n";
        csvContent += exportData.wearable_sessions
          .map(session => Object.values(session).join(","))
          .join("\n");
      }

      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="predictiv-data-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="predictiv-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });

  } catch (error) {
    console.error("Error exporting data:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to export data",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
