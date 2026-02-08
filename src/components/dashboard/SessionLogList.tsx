import React, { useMemo, useState, useEffect } from "react";
import { Activity, Calendar, ChevronRight, GitCompare } from "lucide-react";
import { useTrainingTrends } from "@/hooks/useTrainingTrends";
import { supabase } from "@/integrations/supabase/client";
import { estimateTrainingLoad } from "@/lib/metricsCalculator";
import { format, parse } from "date-fns";
import { SessionDetailSheet } from "./SessionDetailSheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Session {
  title: string;
  date: string;
  dateRaw?: string; // YYYY-MM-DD for DB queries
  time?: string;
  load: number;
  calories?: number;
  distance?: number;
  duration?: number;
}

const SessionLogCard = ({
  title, date, time, load, calories, distance, onClick, compareMode, isSelected, onSelectCompare,
}: Session & {
  onClick?: () => void;
  compareMode?: boolean;
  isSelected?: boolean;
  onSelectCompare?: (e: React.MouseEvent) => void;
}) => (
  <div
    onClick={compareMode ? undefined : onClick}
    className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl p-3 shadow-glass hover:bg-glass-highlight transition-all duration-200 cursor-pointer group"
  >
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-2 flex-1">
        {compareMode && (
          <Checkbox
            checked={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              onSelectCompare?.(e);
            }}
            className="flex-shrink-0"
          />
        )}
        <div>
          <h4 className="font-semibold text-foreground text-sm">{title}</h4>
          {time && <p className="text-xs text-muted-foreground">{time}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="px-2 py-0.5 text-xs rounded-lg font-medium bg-blue-500/20 text-blue-400">Training</span>
        {!compareMode && (
          <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Calendar size={13} />
        <span className="text-xs">{date}</span>
      </div>
      <div className="flex items-center gap-2">
        {calories && (
          <span className="text-xs text-muted-foreground">{calories} cal</span>
        )}
        <Activity size={13} className="text-primary" />
        <span className="font-medium text-foreground text-sm">{load > 0 ? load.toFixed(0) : "–"}</span>
        <span className="text-muted-foreground text-xs">load</span>
      </div>
    </div>
  </div>
);

interface SessionLogListProps {
  onCompareRequested?: (session1: Session, session2: Session) => void;
}

export const SessionLogList = ({ onCompareRequested }: SessionLogListProps = {}) => {
  const { trends, isLoading } = useTrainingTrends({ days: 7 });
  const [fallbackSessions, setFallbackSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Session[]>([]);

  // Fetch from wearable_auto_data if trends are empty
  useEffect(() => {
    const fetchFallbackActivities = async () => {
      if (trends && trends.length === 0 && !isFetchingFallback) {
        setIsFetchingFallback(true);
        
        // Get current user for explicit filtering (defense-in-depth)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsFetchingFallback(false);
          return;
        }
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data, error } = await supabase
          .from('wearable_auto_data')
          .select('fetched_at, activity')
          .eq('user_id', user.id) // CRITICAL: Filter by user_id to prevent cross-user data leakage
          .gte('fetched_at', sevenDaysAgo.toISOString())
          .order('fetched_at', { ascending: false });

        if (!error && data) {
          const activities: Session[] = [];
          data.forEach(record => {
            const activityData = record.activity as Record<string, unknown>;
            const dataObj = activityData?.data as Record<string, unknown> | undefined;
            const acts = (dataObj?.activities as unknown[]) || [];
            acts.forEach((act: unknown) => {
              const activity = act as Record<string, unknown>;
              activities.push({
                title: (activity.name as string) || 'Workout',
                date: format(new Date((activity.startDate as string) || record.fetched_at), 'MMM dd'),
                dateRaw: format(new Date((activity.startDate as string) || record.fetched_at), 'yyyy-MM-dd'),
                time: activity.startTime as string | undefined,
                load: estimateTrainingLoad(activity),
                calories: activity.calories as number | undefined,
                distance: activity.distance as number | undefined,
                duration: Math.round(((activity.activeDuration as number) || (activity.duration as number) || 0) / 1000 / 60),
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
    
    return () => {
      window.removeEventListener("wearable_trends_refresh", handleRefresh);
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
        dateRaw: trend.date,
        load: Math.round(trend.training_load || 0),
      }));
  }, [trends, fallbackSessions]);

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    setDetailOpen(true);
  };

  const handleToggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedForCompare([]);
  };

  const handleSelectForCompare = (session: Session) => {
    setSelectedForCompare((prev) => {
      const isAlreadySelected = prev.some((s) => s.date === session.date && s.time === session.time);

      if (isAlreadySelected) {
        return prev.filter((s) => !(s.date === session.date && s.time === session.time));
      }

      if (prev.length >= 2) {
        return [prev[1], session];
      }

      return [...prev, session];
    });
  };

  const handleCompare = () => {
    if (selectedForCompare.length === 2 && onCompareRequested) {
      onCompareRequested(selectedForCompare[0], selectedForCompare[1]);
      setCompareMode(false);
      setSelectedForCompare([]);
    }
  };

  if (isLoading || isFetchingFallback) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4 shadow-glass">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Activity size={16} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Recent Sessions</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-glass/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4 shadow-glass animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Recent Sessions</h3>
            <div className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
              {sessions.length} Logged
            </div>
          </div>
          {sessions.length >= 2 && onCompareRequested && (
            <Button
              size="sm"
              variant={compareMode ? "default" : "outline"}
              onClick={handleToggleCompareMode}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              {compareMode ? "Cancel" : "Compare"}
            </Button>
          )}
        </div>

        {compareMode && (
          <div className="mb-3 p-2 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-xs text-muted-foreground mb-2">
              Select 2 sessions to compare ({selectedForCompare.length}/2 selected)
            </p>
            {selectedForCompare.length === 2 && (
              <Button size="sm" onClick={handleCompare} className="w-full">
                Compare Selected Sessions
              </Button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Activity size={28} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent sessions found</p>
            </div>
          ) : (
            sessions.map((session, idx) => (
              <SessionLogCard
                key={idx}
                {...session}
                onClick={() => handleSessionClick(session)}
                compareMode={compareMode}
                isSelected={selectedForCompare.some(
                  (s) => s.date === session.date && s.time === session.time
                )}
                onSelectCompare={() => handleSelectForCompare(session)}
              />
            ))
          )}
        </div>
      </div>

      <SessionDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        sessionDate={selectedSession?.date ?? null}
        sessionDateRaw={selectedSession?.dateRaw}
      />
    </>
  );
};
