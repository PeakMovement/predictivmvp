import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const { data: requestData } = await req.json().catch(() => ({ data: {} }));
    const eventIds = requestData?.eventIds || [];
    const syncAll = requestData?.syncAll || false;

    let query = supabase
      .from("google_calendar_events")
      .select("*")
      .eq("user_id", user.id);

    if (!syncAll && eventIds.length > 0) {
      query = query.in("id", eventIds);
    } else if (!syncAll) {
      query = query.eq("synced_to_planner", false);
    }

    const { data: events, error: eventsError } = await query
      .order("start_time", { ascending: true });

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      throw new Error("Failed to fetch calendar events");
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No events to sync",
          eventsSynced: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const syncedEventIds = [];
    const errors = [];

    for (const event of events) {
      try {
        const { error: updateError } = await supabase
          .from("google_calendar_events")
          .update({
            synced_to_planner: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", event.id);

        if (updateError) {
          console.error("Error updating event:", updateError);
          errors.push({ eventId: event.id, error: updateError.message });
        } else {
          syncedEventIds.push(event.id);
        }
      } catch (error) {
        console.error("Error processing event:", error);
        errors.push({ eventId: event.id, error: error.message });
      }
    }


    const plannerEvents = events
      .filter(e => syncedEventIds.includes(e.id))
      .map(e => ({
        id: e.id,
        googleEventId: e.google_event_id,
        title: e.summary,
        description: e.description,
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        status: e.status,
        calendarId: e.calendar_id,
      }));

    return new Response(
      JSON.stringify({
        success: true,
        eventsSynced: syncedEventIds.length,
        totalEvents: events.length,
        events: plannerEvents,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error syncing calendar to planner:", error);
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
