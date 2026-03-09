import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );


    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeUsers, error: usersError } = await supabase
      .from("wearable_sessions")
      .select("user_id")
      .gte("date", sevenDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (usersError) throw usersError;

    const uniqueUserIds = [...new Set(activeUsers?.map(u => u.user_id) || [])];

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const userId of uniqueUserIds) {
      try {
        const { data, error } = await supabase.functions.invoke("analyze-user-engagement", {
          body: { user_id: userId },
        });

        if (error) {
          console.error(`[analyze-all-user-engagement] Error for user ${userId}:`, error);
          errorCount++;
          results.push({ user_id: userId, success: false, error: error.message });
        } else if (data?.success) {
          successCount++;
          results.push({ user_id: userId, success: true });
        } else {
          errorCount++;
          results.push({ user_id: userId, success: false, error: data?.error || "Unknown error" });
        }
      } catch (userError) {
        console.error(`[analyze-all-user-engagement] Exception for user ${userId}:`, userError);
        errorCount++;
        results.push({
          user_id: userId,
          success: false,
          error: userError instanceof Error ? userError.message : "Unknown error"
        });
      }
    }


    return new Response(
      JSON.stringify({
        success: true,
        message: `Analyzed ${uniqueUserIds.length} users: ${successCount} successful, ${errorCount} errors`,
        total_users: uniqueUserIds.length,
        successful: successCount,
        errors: errorCount,
        results: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[analyze-all-user-engagement] Error:", error);
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
