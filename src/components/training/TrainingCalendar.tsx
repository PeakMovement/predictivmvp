import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Activity, Clock, Flame, TrendingUp } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface WearableSession {
  id: string;
  date: string;
  session_type: string;
  duration_minutes: number;
  calories_burned: number;
  avg_heart_rate: number;
  training_load: number;
  perceived_exertion: number;
}

interface DayWithSessions extends Date {
  sessions?: WearableSession[];
}

type ViewMode = "month" | "week" | "day";

export const TrainingCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [sessions, setSessions] = useState<WearableSession[]>([]);
  const [selectedDaySessions, setSelectedDaySessions] = useState<WearableSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedDate) {
      fetchSessions(selectedDate);
    }
  }, [selectedDate, viewMode]);

  const fetchSessions = async (date: Date) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let startDate: Date;
      let endDate: Date;

      if (viewMode === "month") {
        startDate = startOfMonth(date);
        endDate = endOfMonth(date);
      } else if (viewMode === "week") {
        const dayOfWeek = date.getDay();
        startDate = new Date(date);
        startDate.setDate(date.getDate() - dayOfWeek);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
      } else {
        startDate = date;
        endDate = date;
      }

      const { data, error } = await supabase
        .from("wearable_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"))
        .order("date", { ascending: true });

      if (error) throw error;

      setSessions((data || []) as unknown as WearableSession[]);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load training sessions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);

    const daySessions = sessions.filter((session) =>
      isSameDay(new Date(session.date), date)
    );

    setSelectedDaySessions(daySessions);
    if (daySessions.length > 0) {
      setShowSessionDetail(true);
    }
  };

  const getIntensityColor = (trainingLoad: number): string => {
    if (trainingLoad >= 80) return "bg-red-500";
    if (trainingLoad >= 60) return "bg-orange-500";
    if (trainingLoad >= 40) return "bg-yellow-500";
    if (trainingLoad >= 20) return "bg-green-500";
    return "bg-blue-500";
  };

  const getIntensityLabel = (trainingLoad: number): string => {
    if (trainingLoad >= 80) return "Very High";
    if (trainingLoad >= 60) return "High";
    if (trainingLoad >= 40) return "Moderate";
    if (trainingLoad >= 20) return "Light";
    return "Very Light";
  };

  const modifiers = {
    hasSession: (date: Date) => {
      return sessions.some((session) => isSameDay(new Date(session.date), date));
    },
  };

  const modifiersStyles = {
    hasSession: {
      fontWeight: "bold",
    },
  };

  const DayContent = ({ date }: { date: Date }) => {
    const daySessions = sessions.filter((session) =>
      isSameDay(new Date(session.date), date)
    );

    if (daySessions.length === 0) {
      return <span>{date.getDate()}</span>;
    }

    const maxLoad = Math.max(...daySessions.map((s) => s.training_load || 0));

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <span className="relative z-10">{date.getDate()}</span>
        <div
          className={cn(
            "absolute inset-0 rounded-full opacity-30",
            getIntensityColor(maxLoad)
          )}
        />
        <div className="absolute bottom-0.5 flex gap-0.5">
          {daySessions.slice(0, 3).map((_, i) => (
            <div
              key={i}
              className={cn("w-1 h-1 rounded-full", getIntensityColor(maxLoad))}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Training Calendar
              </CardTitle>
              <CardDescription>
                View your training sessions by date
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === "month" ? "default" : "outline"}
                onClick={() => setViewMode("month")}
              >
                Month
              </Button>
              <Button
                size="sm"
                variant={viewMode === "week" ? "default" : "outline"}
                onClick={() => setViewMode("week")}
              >
                Week
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading calendar...
            </div>
          ) : (
            <div className="space-y-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                className="rounded-md border border-border/50"
                components={{
                  Day: ({ date }) => <DayContent date={date} />,
                }}
              />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Intensity Legend</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { color: "bg-blue-500", label: "Very Light", range: "0-20" },
                    { color: "bg-green-500", label: "Light", range: "20-40" },
                    { color: "bg-yellow-500", label: "Moderate", range: "40-60" },
                    { color: "bg-orange-500", label: "High", range: "60-80" },
                    { color: "bg-red-500", label: "Very High", range: "80+" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 text-xs"
                    >
                      <div className={cn("w-3 h-3 rounded-full", item.color)} />
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-muted-foreground">{item.range}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDate && (
                <div className="pt-4 border-t border-border/50">
                  <h4 className="text-sm font-semibold text-foreground mb-2">
                    {format(selectedDate, "MMMM d, yyyy")}
                  </h4>
                  {selectedDaySessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sessions on this day</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedDaySessions.length} session{selectedDaySessions.length !== 1 ? "s" : ""} - Click date for details
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSessionDetail} onOpenChange={setShowSessionDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "MMMM d, yyyy")} - Sessions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {selectedDaySessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-lg border border-border/50 bg-secondary/30"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        getIntensityColor(session.training_load || 0),
                        "bg-opacity-20"
                      )}
                    >
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {session.session_type || "Training Session"}
                      </h4>
                      <Badge variant="outline" className="mt-1">
                        {getIntensityLabel(session.training_load || 0)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">Duration</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {session.duration_minutes || 0} min
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Flame className="h-3 w-3" />
                      <span className="text-xs">Calories</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {session.calories_burned || 0} kcal
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      <span className="text-xs">Avg HR</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {session.avg_heart_rate || 0} bpm
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-xs">Load</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {session.training_load || 0}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
