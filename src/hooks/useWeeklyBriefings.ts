import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isPast } from "date-fns";

export interface DayBriefing {
  date: string;
  dayName: string;
  summary: string | null;
  keyChanges: string[];
  riskHighlights: string[];
  todaysFocus: string | null;
  category: 'training' | 'recovery' | 'wellbeing' | 'planning' | 'mixed';
  hasData: boolean;
}

export interface WeeklyTheme {
  label: string;
  description: string;
  tone: 'coach' | 'warm' | 'strategic';
  days: number;
}

export interface WeeklyOverview {
  weekStart: Date;
  weekEnd: Date;
  days: DayBriefing[];
  themes: WeeklyTheme[];
  overallFocus: string;
  overallTone: 'coach' | 'warm' | 'strategic';
}

function categorizeContent(summary: string, keyChanges: string[], riskHighlights: string[]): 'training' | 'recovery' | 'wellbeing' | 'planning' | 'mixed' {
  const allText = [summary, ...keyChanges, ...riskHighlights].join(' ').toLowerCase();
  
  const trainingKeywords = ['training', 'workout', 'exercise', 'performance', 'activity', 'steps', 'calories', 'push', 'intensity'];
  const recoveryKeywords = ['recovery', 'rest', 'sleep', 'hrv', 'readiness', 'fatigue', 'restore'];
  const wellbeingKeywords = ['pain', 'stress', 'wellbeing', 'comfort', 'gentle', 'listen', 'body'];
  const planningKeywords = ['goal', 'plan', 'week', 'progress', 'schedule', 'balance', 'strategic'];

  const trainingScore = trainingKeywords.filter(k => allText.includes(k)).length;
  const recoveryScore = recoveryKeywords.filter(k => allText.includes(k)).length;
  const wellbeingScore = wellbeingKeywords.filter(k => allText.includes(k)).length;
  const planningScore = planningKeywords.filter(k => allText.includes(k)).length;

  const maxScore = Math.max(trainingScore, recoveryScore, wellbeingScore, planningScore);
  
  if (maxScore === 0) return 'mixed';
  if (trainingScore === maxScore) return 'training';
  if (recoveryScore === maxScore) return 'recovery';
  if (wellbeingScore === maxScore) return 'wellbeing';
  if (planningScore === maxScore) return 'planning';
  
  return 'mixed';
}

function getToneForCategory(category: 'training' | 'recovery' | 'wellbeing' | 'planning' | 'mixed'): 'coach' | 'warm' | 'strategic' {
  switch (category) {
    case 'training': return 'coach';
    case 'recovery': return 'warm';
    case 'wellbeing': return 'warm';
    case 'planning': return 'strategic';
    default: return 'strategic';
  }
}

function synthesizeThemes(days: DayBriefing[]): WeeklyTheme[] {
  const themes: WeeklyTheme[] = [];
  const daysWithData = days.filter(d => d.hasData);
  
  if (daysWithData.length === 0) return themes;

  // Count category occurrences
  const categoryCounts: Record<string, number> = {};
  daysWithData.forEach(day => {
    categoryCounts[day.category] = (categoryCounts[day.category] || 0) + 1;
  });

  // Generate themes based on dominant patterns
  if (categoryCounts['training'] && categoryCounts['training'] >= 2) {
    themes.push({
      label: 'Active Training Focus',
      description: 'Several days this week emphasized performance and movement. Your body responded to the workload.',
      tone: 'coach',
      days: categoryCounts['training'],
    });
  }

  if (categoryCounts['recovery'] && categoryCounts['recovery'] >= 2) {
    themes.push({
      label: 'Recovery Priority',
      description: 'Rest and restoration were central themes. You gave your body the space it needed.',
      tone: 'warm',
      days: categoryCounts['recovery'],
    });
  }

  if (categoryCounts['wellbeing'] && categoryCounts['wellbeing'] >= 1) {
    themes.push({
      label: 'Body Awareness',
      description: 'You paid attention to how you felt. That awareness is valuable.',
      tone: 'warm',
      days: categoryCounts['wellbeing'],
    });
  }

  if (categoryCounts['planning'] && categoryCounts['planning'] >= 1) {
    themes.push({
      label: 'Strategic Planning',
      description: 'Goal setting and forward thinking shaped some of your days.',
      tone: 'strategic',
      days: categoryCounts['planning'],
    });
  }

  // If no strong themes, add a balanced one
  if (themes.length === 0) {
    themes.push({
      label: 'Balanced Week',
      description: 'A variety of focuses across the week. No single area dominated.',
      tone: 'strategic',
      days: daysWithData.length,
    });
  }

  return themes;
}

function determineOverallFocus(days: DayBriefing[]): { focus: string; tone: 'coach' | 'warm' | 'strategic' } {
  const daysWithFocus = days.filter(d => d.todaysFocus);
  
  if (daysWithFocus.length === 0) {
    return {
      focus: 'Your week had a natural rhythm. Continue listening to what your body and goals need.',
      tone: 'strategic',
    };
  }

  // Find the most recent focus with data
  const recentFocus = daysWithFocus[daysWithFocus.length - 1];
  const category = recentFocus.category;
  const tone = getToneForCategory(category);

  const focusMessages: Record<string, string> = {
    training: 'Your week leaned toward active engagement. Keep building on that momentum.',
    recovery: 'Rest was a recurring theme. Honor what your body has been asking for.',
    wellbeing: 'You prioritized how you feel. That self awareness will serve you well.',
    planning: 'Strategic thinking guided your week. Stay focused on the bigger picture.',
    mixed: 'Your week balanced multiple priorities. Flexibility is a strength.',
  };

  return {
    focus: focusMessages[category] || focusMessages.mixed,
    tone,
  };
}

export function useWeeklyBriefings() {
  const [overview, setOverview] = useState<WeeklyOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklyBriefings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get current week bounds
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
      
      // Get all days in the week
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

      // Fetch briefings for the week
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');

      const { data: briefings, error: fetchError } = await supabase
        .from('daily_briefings')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'unified')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;

      // Map briefings to days
      const briefingMap = new Map(
        (briefings || []).map(b => [b.date, b])
      );

      const days: DayBriefing[] = weekDays.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const briefing = briefingMap.get(dateStr);
        const isFuture = !isToday(date) && !isPast(date);

        if (!briefing || isFuture) {
          return {
            date: dateStr,
            dayName: format(date, 'EEEE'),
            summary: null,
            keyChanges: [],
            riskHighlights: [],
            todaysFocus: null,
            category: 'mixed' as const,
            hasData: false,
          };
        }

        const contextData = briefing.context_used as any;
        const dailyBriefing = contextData?.dailyBriefing;

        const summary = dailyBriefing?.summary || briefing.content || null;
        const keyChanges = dailyBriefing?.keyChanges || [];
        const riskHighlights = dailyBriefing?.riskHighlights || [];
        const todaysFocus = dailyBriefing?.todaysFocus || null;
        const category = categorizeContent(summary || '', keyChanges, riskHighlights);

        return {
          date: dateStr,
          dayName: format(date, 'EEEE'),
          summary,
          keyChanges,
          riskHighlights,
          todaysFocus,
          category,
          hasData: true,
        };
      });

      const themes = synthesizeThemes(days);
      const { focus: overallFocus, tone: overallTone } = determineOverallFocus(days);

      setOverview({
        weekStart,
        weekEnd,
        days,
        themes,
        overallFocus,
        overallTone,
      });
    } catch (err) {
      console.error('Error fetching weekly briefings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load weekly overview');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyBriefings();
  }, [fetchWeeklyBriefings]);

  return {
    overview,
    isLoading,
    error,
    refresh: fetchWeeklyBriefings,
  };
}
