import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, user_id } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing access_token in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching Fitbit data for user: ${user_id || "unknown"}`);

    // Fetch heart rate data
    const heartRateResponse = await fetch(
      "https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    // Fetch steps data
    const stepsResponse = await fetch(
      "https://api.fitbit.com/1/user/-/activities/steps/date/today/1d.json",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!heartRateResponse.ok || !stepsResponse.ok) {
      console.error(
        `Fitbit API error - Heart Rate: ${heartRateResponse.status}, Steps: ${stepsResponse.status}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch data from Fitbit API",
          details: {
            heartRateStatus: heartRateResponse.status,
            stepsStatus: stepsResponse.status,
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const heartRateData = await heartRateResponse.json();
    const stepsData = await stepsResponse.json();

    console.log("Successfully fetched Fitbit data");

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          heart_rate: heartRateData,
          steps: stepsData,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error fetching Fitbit data:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unexpected error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
