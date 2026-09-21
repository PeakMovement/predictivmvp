import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: "refresh_token",
    }),
  });
  if (!res.ok) { console.error("Token refresh failed:", await res.text()); return null; }
  return await res.json();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) throw new Error("Unauthorized");

    // Event payload
    const body = await req.json().catch(() => ({}));
    const { summary, description, start, end, location, timeZone, calendarId } = body as {
      summary?: string; description?: string; start?: string; end?: string;
      location?: string; timeZone?: string; calendarId?: string;
    };
    if (!summary || !start || !end) {
      return new Response(JSON.stringify({ error: "summary, start and end are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load + refresh token
    const { data: tokenData, error: tokenError } = await supabase
      .from("google_calendar_tokens").select("*").eq("user_id", user.id).maybeSingle();
    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected", message: "Please connect your Google Calendar first" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let accessToken = tokenData.access_token;
    if (new Date(tokenData.expires_at) <= new Date()) {
      if (!tokenData.refresh_token) throw new Error("No refresh token available");
      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      if (!refreshed) throw new Error("Failed to refresh access token");
      accessToken = refreshed.access_token;
      await supabase.from("google_calendar_tokens").update({
        access_token: accessToken,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }

    const tz = timeZone || "Africa/Johannesburg";
    const isAllDay = start.length === 10; // YYYY-MM-DD
    const event = {
      summary,
      description: description ?? undefined,
      location: location ?? undefined,
      start: isAllDay ? { date: start } : { dateTime: start, timeZone: tz },
      end: isAllDay ? { date: end } : { dateTime: end, timeZone: tz },
    };

    const cal = encodeURIComponent(calendarId || "primary");
    const gRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${cal}/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!gRes.ok) {
      const errText = await gRes.text();
      console.error("Google Calendar insert failed:", errText);
      return new Response(JSON.stringify({ error: "Failed to create event", details: errText }),
        { status: gRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const created = await gRes.json();

    // Best-effort log
    await supabase.from("google_calendar_sync_logs").insert({
      user_id: user.id, status: "success", events_synced: 1, sync_type: "create_event",
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ success: true, event: { id: created.id, htmlLink: created.htmlLink } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
