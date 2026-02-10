import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
}

interface DailyPlanViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const DailyPlanView = ({ selectedDate, onDateChange }: DailyPlanViewProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCalendarConnected, setHasCalendarConnected] = useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchCalendarEvents();
  }, [selectedDate]);

  const fetchCalendarEvents = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has connected Google Calendar
      const { data: connection } = await (supabase as any)
        .from("google_calendar_connections")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setHasCalendarConnected(!!connection);

      if (!connection) {
        setIsLoading(false);
        return;
      }

      // Fetch events for the selected date
      const startOfDay = format(selectedDate, "yyyy-MM-dd'T'00:00:00");
      const endOfDay = format(selectedDate, "yyyy-MM-dd'T'23:59:59");

      const { data, error } = await supabase
        .from("google_calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", startOfDay)
        .lte("start_time", endOfDay)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching calendar events:", error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventsForHour = (hour: number) => {
    return events.filter((event) => {
      const eventHour = new Date(event.start_time).getHours();
      return eventHour === hour;
    });
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
  };

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = addDays(selectedDate, direction === "next" ? 1 : -1);
    onDateChange(newDate);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!hasCalendarConnected) {
    return (
      <Card className="p-8 border border-border/50">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Calendar className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Daily Schedule</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Connect your Google Calendar to see your daily schedule with hour-by-hour breakdown of events and meetings.
          </p>
          <Button className="gap-2" onClick={() => window.location.href = "/settings"}>
            <Calendar className="h-4 w-4" /> Connect Google Calendar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {events.length} {events.length === 1 ? "event" : "events"} scheduled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDay("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => onDateChange(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDay("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Overview */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onDateChange(day)}
            className={cn(
              "p-3 rounded-lg text-center transition-colors",
              isSameDay(day, selectedDate)
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 hover:bg-secondary text-foreground"
            )}
          >
            <div className="text-xs font-medium mb-1">
              {format(day, "EEE")}
            </div>
            <div className="text-lg font-bold">
              {format(day, "d")}
            </div>
          </button>
        ))}
      </div>

      {/* Hour-by-Hour Schedule */}
      <div className="space-y-2">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          const isCurrentHour = new Date().getHours() === hour && isSameDay(selectedDate, new Date());

          return (
            <div
              key={hour}
              className={cn(
                "flex gap-4 p-3 rounded-lg border transition-colors",
                isCurrentHour
                  ? "border-primary bg-primary/5"
                  : "border-border/50 bg-card/50"
              )}
            >
              <div className="w-20 flex-shrink-0">
                <div className={cn(
                  "text-sm font-medium",
                  isCurrentHour ? "text-primary" : "text-muted-foreground"
                )}>
                  {format(new Date().setHours(hour, 0, 0, 0), "h:mm a")}
                </div>
              </div>

              <div className="flex-1">
                {hourEvents.length > 0 ? (
                  <div className="space-y-2">
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 bg-primary/10 border border-primary/30 rounded-lg"
                      >
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{event.summary}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatEventTime(event.start_time, event.end_time)}
                            </p>
                            {event.location && (
                              <p className="text-xs text-muted-foreground mt-1">
                                📍 {event.location}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    No events scheduled
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
