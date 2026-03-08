import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isPast } from "date-fns";

export interface DayBriefing {
  date: string;
  dayName: string;
  summary: string | null;
  keyChanges: string[];
  riskHighlights: string[];
  category: 'training' | 'recovery' | 'wellbeing' | 'planning' | 'mixed';
  hasData: boolean;
}

export interface WeeklyTheme {
  label: string;
  description: string;
  tone: 'coach' | 'warm' | 'strategic';
  days: number;
}

export interface WeekIntent {
  statement: string;
  prioritize: string;
  beCarefulWith: string;
  tone: 'coach' | 'warm' | 'strategic';
}

export interface WeeklyOverview {
  weekStart: Date;
  weekEnd: Date;
  days: DayBriefing[];
  themes: WeeklyTheme[];
  intent: WeekIntent;
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
  return {
    focus: 'Your week had a natural rhythm. Continue listening to what your body and goals need.',
    tone: 'strategic',
  };
}

function generateWeekIntent(days: DayBriefing[], themes: WeeklyTheme[]): WeekIntent {
  const daysWithData = days.filter(d => d.hasData);
  
  // Count categories to determine dominant focus
  const categoryCounts: Record<string, number> = {};
  daysWithData.forEach(day => {
    categoryCounts[day.category] = (categoryCounts[day.category] || 0) + 1;
  });

  // Determine dominant category
  let dominantCategory: 'training' | 'recovery' | 'wellbeing' | 'planning' | 'mixed' = 'mixed';
  let maxCount = 0;
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantCategory = cat as typeof dominantCategory;
    }
  });

  const tone = getToneForCategory(dominantCategory);

  // Generate intent statement based on dominant category
  const intentStatements: Record<string, string> = {
    training: 'This week is for building strength and consistency in your training.',
    recovery: 'This week is for letting your body rest and restore.',
    wellbeing: 'This week is for honoring how you feel and nurturing your wellbeing.',
    planning: 'This week is for stepping back and seeing the bigger picture.',
    mixed: 'This week is for staying flexible and responding to what each day brings.',
  };

  // Generate prioritize guidance
  const prioritizeGuidance: Record<string, string> = {
    training: 'Prioritize showing up for your workouts even when motivation wavers.',
    recovery: 'Prioritize quality sleep and moments of stillness.',
    wellbeing: 'Prioritize checking in with yourself before pushing through discomfort.',
    planning: 'Prioritize clarity over urgency when making decisions.',
    mixed: 'Prioritize being present with whatever the day asks of you.',
  };

  // Generate caution guidance based on risks observed
  const allRisks = daysWithData.flatMap(d => d.riskHighlights);
  let cautionGuidance: string;

  if (allRisks.length > 0) {
    // Derive caution from actual risk data
    const riskText = allRisks.join(' ').toLowerCase();
    if (riskText.includes('fatigue') || riskText.includes('tired') || riskText.includes('sleep')) {
      cautionGuidance = 'Be careful with pushing too hard when your body signals fatigue.';
    } else if (riskText.includes('stress') || riskText.includes('hrv')) {
      cautionGuidance = 'Be careful with taking on too much when stress levels are elevated.';
    } else if (riskText.includes('pain') || riskText.includes('discomfort')) {
      cautionGuidance = 'Be careful with ignoring signals from your body that ask for gentleness.';
    } else {
      cautionGuidance = getCautionByCategory(dominantCategory);
    }
  } else {
    cautionGuidance = getCautionByCategory(dominantCategory);
  }

  return {
    statement: intentStatements[dominantCategory] || intentStatements.mixed,
    prioritize: prioritizeGuidance[dominantCategory] || prioritizeGuidance.mixed,
    beCarefulWith: cautionGuidance,
    tone,
  };
}

function getCautionByCategory(category: string): string {
  const cautionDefaults: Record<string, string> = {
    training: 'Be careful with skipping recovery in the pursuit of progress.',
    recovery: 'Be careful with guilt about resting when rest is what you need.',
    wellbeing: 'Be careful with dismissing how you feel as unimportant.',
    planning: 'Be careful with overthinking at the expense of action.',
    mixed: 'Be careful with spreading yourself too thin across too many priorities.',
  };
  return cautionDefaults[category] || cautionDefaults.mixed;
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
            category: 'mixed' as const,
            hasData: false,
          };
        }

        const contextData = briefing.context_used as any;
        const dailyBriefing = contextData?.dailyBriefing;

        const summary = dailyBriefing?.summary || briefing.content || null;
        const keyChanges = dailyBriefing?.keyChanges || [];
        const riskHighlights = dailyBriefing?.riskHighlights || [];
        const category = categorizeContent(summary || '', keyChanges, riskHighlights);

        return {
          date: dateStr,
          dayName: format(date, 'EEEE'),
          summary,
          keyChanges,
          riskHighlights,
          category,
          hasData: true,
        };
      });

      const themes = synthesizeThemes(days);
      const { focus: overallFocus, tone: overallTone } = determineOverallFocus(days);
      const intent = generateWeekIntent(days, themes);

      setOverview({
        weekStart,
        weekEnd,
        days,
        themes,
        intent,
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
