import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!googleClientId || !googleClientSecret) {
    console.error("Google OAuth credentials not configured");
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Token refresh failed:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({
          error: "Google Calendar not connected",
          message: "Please connect your Google Calendar first",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);

    if (expiresAt <= new Date()) {
      if (!tokenData.refresh_token) {
        throw new Error("No refresh token available");
      }

      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      if (!refreshed) {
        throw new Error("Failed to refresh access token");
      }

      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

      await supabase
        .from("google_calendar_tokens")
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    const { data: requestData } = await req.json().catch(() => ({ data: {} }));
    const daysAhead = requestData?.daysAhead || 7;
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    const { error: logError } = await supabase
      .from("google_calendar_sync_logs")
      .insert({
        user_id: user.id,
        sync_type: "full",
        status: "pending",
        started_at: new Date().toISOString(),
      });

    if (logError) {
      console.error("Failed to create sync log:", logError);
    }

    const calendarResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error("Google Calendar API error:", errorText);
      throw new Error("Failed to fetch calendar events");
    }

    const calendarData = await calendarResponse.json();
    const events = calendarData.items || [];

    let syncedCount = 0;
    const errors = [];

    for (const event of events) {
      try {
        const startTime = event.start?.dateTime || event.start?.date;
        const endTime = event.end?.dateTime || event.end?.date;

        if (!startTime || !endTime) {
          continue;
        }

        const { error: upsertError } = await supabase
          .from("google_calendar_events")
          .upsert({
            user_id: user.id,
            google_event_id: event.id,
            calendar_id: event.organizer?.email || "primary",
            summary: event.summary || "Untitled Event",
            description: event.description || null,
            start_time: new Date(startTime).toISOString(),
            end_time: new Date(endTime).toISOString(),
            location: event.location || null,
            status: event.status || "confirmed",
            attendees: event.attendees || [],
            raw_data: event,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,google_event_id",
          });

        if (upsertError) {
          console.error("Error upserting event:", upsertError);
          errors.push(upsertError.message);
        } else {
          syncedCount++;
        }
      } catch (error) {
        console.error("Error processing event:", error);
        errors.push(error.message);
      }
    }

    await supabase
      .from("google_calendar_sync_logs")
      .update({
        status: errors.length === 0 ? "success" : "partial",
        events_synced: syncedCount,
        error_message: errors.length > 0 ? errors.join(", ") : null,
        completed_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);


    return new Response(
      JSON.stringify({
        success: true,
        eventsSynced: syncedCount,
        totalEvents: events.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
