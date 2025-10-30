import React, { useMemo, useState, useEffect } from "react";
import { Activity, Calendar } from "lucide-react";
import { useTrainingTrends } from "@/hooks/useTrainingTrends";
import { supabase } from "@/integrations/supabase/client";
import { estimateTrainingLoad } from "@/lib/metricsCalculator";
import { format } from "date-fns";

interface Session {
  title: string;
  date: string;
  time?: string;
  load: number;
  calories?: number;
  distance?: number;
  duration?: number;
}

const SessionLogCard = ({ title, date, time, load, calories, distance, duration }: Session) => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl p-4 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out transform-gpu">
    <div className="flex items-center justify-between mb-2">
      <div>
        <h4 className="font-semibold text-foreground">{title}</h4>
        {time && <p className="text-xs text-muted-foreground">{time}</p>}
      </div>
      <span className="px-2 py-1 text-xs rounded-lg font-medium bg-blue-500/20 text-blue-400">Training</span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Calendar size={14} />
        <span className="text-xs">{date}</span>
      </div>
      <div className="flex items-center gap-2">
        {calories && (
          <span className="text-xs text-muted-foreground">{calories} cal</span>
        )}
        {distance && (
          <span className="text-xs text-muted-foreground">{distance.toFixed(2)} km</span>
        )}
        <Activity size={14} className="text-primary animate-bounce-subtle" />
        <span className="font-medium text-foreground">{load > 0 ? load.toFixed(0) : "–"}</span>
        <span className="text-muted-foreground text-xs">load</span>
      </div>
    </div>
  </div>
);

export const SessionLogList = () => {
  const { trends, isLoading } = useTrainingTrends({ days: 7 });
  const [fallbackSessions, setFallbackSessions] = useState<Session[]>([]);
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);

  // Fetch from wearable_auto_data if trends are empty
  useEffect(() => {
    const fetchFallbackActivities = async () => {
      if (trends && trends.length === 0 && !isFetchingFallback) {
        setIsFetchingFallback(true);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data, error } = await supabase
          .from('wearable_auto_data')
          .select('fetched_at, activity')
          .gte('fetched_at', sevenDaysAgo.toISOString())
          .order('fetched_at', { ascending: false });

        if (!error && data) {
          const activities: Session[] = [];
          data.forEach(record => {
            const activityData = record.activity as any; // Cast to any for JSON access
            const acts = activityData?.data?.activities || [];
            acts.forEach((act: any) => {
              activities.push({
                title: act.name || 'Workout',
                date: format(new Date(act.startDate || record.fetched_at), 'MMM dd'),
                time: act.startTime,
                load: estimateTrainingLoad(act),
                calories: act.calories,
                distance: act.distance,
                duration: Math.round((act.activeDuration || act.duration) / 1000 / 60), // Convert to minutes
              });
            });
          });
          setFallbackSessions(activities.slice(0, 5));
        }
        setIsFetchingFallback(false);
      }
    };

    fetchFallbackActivities();
    
    // Listen for refresh events to refetch sessions
    const handleRefresh = () => {
      setIsFetchingFallback(false);
      setFallbackSessions([]);
    };
    window.addEventListener("wearable_trends_refresh", handleRefresh);
    window.addEventListener("fitbit_trends_refresh", handleRefresh); // Backwards compat
    
    return () => {
      window.removeEventListener("wearable_trends_refresh", handleRefresh);
      window.removeEventListener("fitbit_trends_refresh", handleRefresh);
    };
  }, [trends, isFetchingFallback]);

  const sessions = useMemo(() => {
    // If we have fallback sessions and no trends, use fallback
    if (fallbackSessions.length > 0 && (!trends || trends.length === 0)) {
      return fallbackSessions;
    }

    // Otherwise use trends data
    if (!trends || trends.length === 0) return [];
    
    return trends
      .filter(t => t.training_load != null && t.training_load > 0)
      .slice(0, 5)
      .map(trend => ({
        title: `Training Session`,
        date: format(new Date(trend.date), 'MMM dd'),
        load: Math.round(trend.training_load || 0),
      }));
  }, [trends, fallbackSessions]);

  if (isLoading || isFetchingFallback) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Activity size={16} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Recent Sessions</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-glass/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
          <Activity size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Recent Sessions</h3>
        <div className="px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full">
          {sessions.length} Logged
        </div>
      </div>
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity size={32} className="mx-auto mb-2 opacity-50" />
            <p>No recent sessions found</p>
          </div>
        ) : (
          sessions.map((session, idx) => (
            <SessionLogCard key={idx} {...session} />
          ))
        )}
      </div>
    </div>
  );
};
