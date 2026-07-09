import { supabase } from "@/integrations/supabase/client";

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  /** ISO datetime (2026-07-10T09:00:00+02:00) or date (2026-07-10) for all-day */
  start: string;
  end: string;
  timeZone?: string;
  calendarId?: string;
}

/** True if the current user has a Google Calendar token stored. */
export async function isGoogleCalendarConnected(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("google_calendar_tokens")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data;
}

/** Read upcoming events from the user's Google Calendar. */
export async function fetchGoogleCalendarEvents(daysAhead = 7) {
  const { data, error } = await supabase.functions.invoke("fetch-google-calendar-events", {
    body: { daysAhead },
  });
  if (error) throw error;
  return data;
}

/** Create an event on the user's Google Calendar. */
export async function addEventToGoogleCalendar(event: GoogleCalendarEvent) {
  const { data, error } = await supabase.functions.invoke("google-calendar-create-event", {
    body: event,
  });
  if (error) throw error;
  return data as { success: boolean; event: { id: string; htmlLink: string } };
}
