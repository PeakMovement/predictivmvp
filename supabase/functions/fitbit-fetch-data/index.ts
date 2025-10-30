
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { user_id, date } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokenRow, error: tokenError } = await supabase
      .from("fitbit_tokens")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (tokenError || !tokenRow) {
      console.error("[fitbit-fetch-data] Token error:", tokenError);
      return new Response(
        JSON.stringify({
          error: "Fitbit not connected",
          message: "Please connect your Fitbit account first"
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    let accessToken = tokenRow.access_token;

    const tokenAge = tokenRow.updated_at ? Date.now() - new Date(tokenRow.updated_at).getTime() : Infinity;
    const oneHour = 60 * 60 * 1000;

    if (tokenAge > oneHour || !tokenRow.expires_in || tokenRow.expires_in < 3600) {
      console.log(`[fitbit-fetch-data] Token may be expired, refreshing...`);

      const clientId = Deno.env.get("FITBIT_CLIENT_ID");
      const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: "Fitbit OAuth not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      const creds = btoa(`${clientId}:${clientSecret}`);

      const refreshResp = await fetch("https://api.fitbit.com/oauth2/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${creds}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenRow.refresh_token!,
        }),
      });

      if (refreshResp.ok) {
        const refreshData = await refreshResp.json();
        accessToken = refreshData.access_token;

        await supabase
          .from("fitbit_tokens")
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            token_type: refreshData.token_type,
            expires_in: refreshData.expires_in,
            scope: refreshData.scope,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user_id);

        console.log(`[fitbit-fetch-data] Token refreshed successfully`);
      } else {
        const errorText = await refreshResp.text();
        console.error("[fitbit-fetch-data] Token refresh failed:", errorText);
        return new Response(
          JSON.stringify({
            error: "Token refresh failed",
            message: "Please reconnect your Fitbit account"
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    const day = date || new Date().toISOString().split("T")[0];

    console.log(`[fitbit-fetch-data] Fetching data for user ${user_id} on ${day}`);

    const [actResp, sleepResp] = await Promise.all([
      fetch(`https://api.fitbit.com/1/user/-/activities/date/${day}.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${day}.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (!actResp.ok) {
      const actError = await actResp.text();
      console.error("[fitbit-fetch-data] Activity fetch failed:", actError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch activity data",
          details: actError
        }),
        {
          status: actResp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const activity = await actResp.json();
    const sleepData = sleepResp.ok ? await sleepResp.json() : null;

    const { error: insertError } = await supabase
      .from("fitbit_auto_data")
      .insert({
        user_id,
        activity: activity,
        sleep: sleepData,
        fetched_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[fitbit-fetch-data] Insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to store Fitbit data",
          details: insertError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`[fitbit-fetch-data] Data fetched and stored successfully for ${day}`);

    return new Response(
      JSON.stringify({
        success: true,
        date: day,
        steps: activity.summary?.steps || 0,
        calories: activity.summary?.caloriesOut || 0,
        distance: activity.summary?.distances?.[0]?.distance || 0,
        sleep_minutes: sleepData?.summary?.totalMinutesAsleep || 0
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("[fitbit-fetch-data] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
