import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PatternTone = 'coach' | 'warm';

export interface ObservedPattern {
  id: string;
  observation: string;
  tone: PatternTone;
  category: 'training' | 'recovery' | 'sleep' | 'stress' | 'symptoms';
}

interface PatternVariation {
  id: string;
  variations: string[];
  tone: PatternTone;
  category: 'training' | 'recovery' | 'sleep' | 'stress' | 'symptoms';
  condition: (data: PatternAnalysisData) => boolean;
}

interface PatternAnalysisData {
  sessions: WearableSession[];
  symptoms: SymptomCheckIn[];
  recovery: RecoveryProfile | null;
  lifestyle: LifestyleProfile | null;
}

interface WearableSession {
  sleep_score: number | null;
  readiness_score: number | null;
  activity_score: number | null;
  hrv_avg: number | null;
  date: string;
}

interface SymptomCheckIn {
  symptom_type: string;
  severity: string;
  created_at: string;
}

interface RecoveryProfile {
  sleep_quality: string | null;
  sleep_hours: number | null;
}

interface LifestyleProfile {
  stress_level: string | null;
}

// Pattern definitions with multiple variations
const PATTERN_DEFINITIONS: PatternVariation[] = [
  {
    id: 'sleep-readiness',
    variations: [
      "When your sleep quality dips below your usual range, your readiness scores tend to follow within a day or two. Prioritizing rest during these periods often helps you bounce back more quickly.",
      "We've noticed a pattern where lower sleep scores are followed by dips in your readiness. Your body seems to need that recovery time to rebound effectively.",
      "Your readiness tends to track closely with sleep quality. When sleep drops, giving yourself permission to rest the next day typically speeds up your recovery."
    ],
    tone: 'warm',
    category: 'sleep',
    condition: (data) => {
      const lowSleepDays = data.sessions.filter(s => s.sleep_score !== null && s.sleep_score < 70);
      return lowSleepDays.length >= 1;
    }
  },
  {
    id: 'high-readiness',
    variations: [
      "Your readiness tends to stay elevated when you maintain consistent sleep timing. Days with better alignment often show in your next morning's scores.",
      "Consistent sleep patterns seem to be your sweet spot. Your readiness metrics respond particularly well to regular sleep-wake cycles.",
      "We've observed that your body rewards sleep consistency. When your timing is stable, your readiness stays strong throughout the week."
    ],
    tone: 'coach',
    category: 'recovery',
    condition: (data) => {
      const readinessScores = data.sessions.filter(s => s.readiness_score !== null).map(s => s.readiness_score!);
      if (readinessScores.length < 2) return false;
      const avgReadiness = readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length;
      return avgReadiness > 70;
    }
  },
  {
    id: 'hrv-variability',
    variations: [
      "Your heart rate variability shows natural fluctuation throughout the week. Higher values often appear after lighter activity days, suggesting your body responds well to balanced effort and rest.",
      "HRV patterns reveal how your nervous system adapts to training. The variation we're seeing is healthy and indicates good recovery capacity.",
      "Your HRV tells an interesting story of adaptation. The ups and downs align with your activity load, showing your body is responding appropriately to training stress."
    ],
    tone: 'coach',
    category: 'training',
    condition: (data) => {
      const hrvValues = data.sessions.filter(s => s.hrv_avg !== null).map(s => s.hrv_avg!);
      if (hrvValues.length < 3) return false;
      const avgHrv = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
      const hrvVariance = hrvValues.reduce((sum, v) => sum + Math.pow(v - avgHrv, 2), 0) / hrvValues.length;
      return hrvVariance > 50;
    }
  },
  {
    id: 'activity-recovery',
    variations: [
      "After days with higher activity levels, your metrics sometimes need an extra day to stabilize. This is a normal part of how your body adapts to training demands.",
      "Your recovery pattern after intense training is quite consistent. Allowing for that extra recovery day tends to bring your metrics back stronger.",
      "We've noticed your body communicates clearly after harder efforts. The metrics dip is temporary and part of healthy adaptation."
    ],
    tone: 'coach',
    category: 'training',
    condition: (data) => {
      const activityScores = data.sessions.filter(s => s.activity_score !== null).map(s => s.activity_score!);
      if (activityScores.length < 2) return false;
      const highActivityDays = activityScores.filter(s => s > 75).length;
      return highActivityDays >= 1;
    }
  },
  {
    id: 'pain-awareness',
    variations: [
      "You've noted discomfort a few times recently. These check-ins help us understand what activities or conditions might be contributing, so we can adjust recommendations accordingly.",
      "The discomfort you've been tracking is valuable information. It helps us identify patterns and suggest modifications that work better for your body.",
      "Your symptom tracking reveals important signals. We're using these insights to fine-tune guidance around activities that may need adjustment."
    ],
    tone: 'warm',
    category: 'symptoms',
    condition: (data) => {
      const painSymptoms = data.symptoms.filter(s =>
        s.symptom_type.toLowerCase().includes('pain') ||
        s.symptom_type.toLowerCase().includes('soreness')
      );
      return painSymptoms.length >= 2;
    }
  },
  {
    id: 'fatigue-pattern',
    variations: [
      "Fatigue has come up in your recent notes. When this happens, your body may be asking for more recovery time. We factor this into your guidance to help you feel more balanced.",
      "Energy levels have been flagging lately based on your check-ins. This feedback helps us recommend lighter approaches until you're feeling recharged.",
      "The fatigue you're experiencing is a clear signal. We're adjusting expectations to support better recovery during this period."
    ],
    tone: 'warm',
    category: 'symptoms',
    condition: (data) => {
      const fatigueSymptoms = data.symptoms.filter(s =>
        s.symptom_type.toLowerCase().includes('fatigue') ||
        s.symptom_type.toLowerCase().includes('tired')
      );
      return fatigueSymptoms.length >= 2;
    }
  },
  {
    id: 'stress-recovery',
    variations: [
      "During busier or more demanding periods, your recovery metrics sometimes reflect the extra load. This is your body's way of communicating, and we adjust expectations to support you through these times.",
      "Life stress shows up in your physical metrics. We're accounting for this in our recommendations to help you navigate demanding periods without burning out.",
      "Your metrics are painting a picture of a busy phase. We're factoring this into guidance to ensure recovery keeps pace with demands."
    ],
    tone: 'warm',
    category: 'stress',
    condition: (data) => {
      if (!data.lifestyle?.stress_level) return false;
      const stressLevel = data.lifestyle.stress_level.toLowerCase();
      return stressLevel === 'high' || stressLevel === 'very high';
    }
  },
  {
    id: 'sleep-quality-work',
    variations: [
      "Your sleep profile suggests rest has been a work in progress. Small improvements in sleep consistency often show up in your daytime energy and readiness within a few days.",
      "Sleep quality has been variable lately. Even minor adjustments to your routine can create meaningful shifts in how you feel day-to-day.",
      "Rest optimization is a journey we're on together. The data shows that when sleep improves even slightly, your other metrics benefit noticeably."
    ],
    tone: 'warm',
    category: 'sleep',
    condition: (data) => {
      if (!data.recovery?.sleep_quality) return false;
      const quality = data.recovery.sleep_quality.toLowerCase();
      return quality === 'poor' || quality === 'fair';
    }
  },
  {
    id: 'consistent-performer',
    variations: [
      "Your metrics show remarkable consistency over the past week. This stability suggests your current routine is serving you well.",
      "Week-to-week, your numbers stay impressively steady. Whatever you're doing is working effectively for your body.",
      "The consistency in your data indicates you've found a sustainable rhythm. Your body responds positively to this regularity."
    ],
    tone: 'coach',
    category: 'recovery',
    condition: (data) => {
      const recentScores = data.sessions.slice(0, 7).filter(s => s.readiness_score !== null);
      if (recentScores.length < 5) return false;
      const scores = recentScores.map(s => s.readiness_score!);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
      return variance < 50 && avg > 70;
    }
  }
];

// Helper function to get recently shown pattern IDs for a user
async function getRecentlyShownPatterns(userId: string, daysCooldown: number = 7): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_shown_patterns')
    .select('pattern_id')
    .eq('user_id', userId)
    .gte('shown_at', new Date(Date.now() - daysCooldown * 24 * 60 * 60 * 1000).toISOString());

  return new Set(data?.map(p => p.pattern_id) || []);
}

// Helper function to select a random variation
function selectRandomVariation(variations: string[], patternId: string, userId: string): string {
  // Use a deterministic random selection based on user ID and current date
  // This ensures the same user sees the same variation on the same day
  const dateStr = new Date().toISOString().split('T')[0];
  const seed = `${userId}-${patternId}-${dateStr}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = seed % variations.length;
  return variations[index];
}

// Helper function to record shown patterns
async function recordShownPatterns(userId: string, patterns: ObservedPattern[]): Promise<void> {
  if (patterns.length === 0) return;

  const records = patterns.map(p => ({
    user_id: userId,
    pattern_id: p.id,
    pattern_text: p.observation,
    category: p.category,
    tone: p.tone,
    shown_at: new Date().toISOString()
  }));

  await supabase.from('user_shown_patterns').insert(records);
}

export function useObservedPatterns() {
  const [patterns, setPatterns] = useState<ObservedPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function analyzePatterns() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch data for pattern analysis
        const [sessionsRes, symptomsRes, recoveryRes, lifestyleRes] = await Promise.all([
          supabase
            .from('wearable_sessions')
            .select('sleep_score, readiness_score, activity_score, hrv_avg, date')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(14),
          supabase
            .from('symptom_check_ins')
            .select('symptom_type, severity, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('user_recovery')
            .select('sleep_quality, sleep_hours')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('user_lifestyle')
            .select('stress_level')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        const analysisData: PatternAnalysisData = {
          sessions: (sessionsRes.data || []) as WearableSession[],
          symptoms: (symptomsRes.data || []) as SymptomCheckIn[],
          recovery: recoveryRes.data as RecoveryProfile | null,
          lifestyle: lifestyleRes.data as LifestyleProfile | null,
        };

        // Get patterns that were shown recently (within 7 days cooldown)
        const recentPatterns = await getRecentlyShownPatterns(user.id, 7);

        // Find all valid patterns based on current data
        const validPatterns = PATTERN_DEFINITIONS.filter(def => {
          // Skip patterns that were shown recently
          if (recentPatterns.has(def.id)) return false;
          // Check if the condition is met
          return def.condition(analysisData);
        });

        // If we have valid patterns, select up to 4
        const selectedPatterns: ObservedPattern[] = [];

        if (validPatterns.length > 0) {
          // Shuffle to add variety (but deterministically based on date)
          const dateStr = new Date().toISOString().split('T')[0];
          const dateSeed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

          const shuffled = [...validPatterns].sort((a, b) => {
            const seedA = `${a.id}-${dateSeed}`.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            const seedB = `${b.id}-${dateSeed}`.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            return seedA - seedB;
          });

          // Take up to 4 patterns
          const patternsToShow = shuffled.slice(0, 4);

          // Create pattern objects with randomly selected variations
          for (const def of patternsToShow) {
            selectedPatterns.push({
              id: def.id,
              observation: selectRandomVariation(def.variations, def.id, user.id),
              tone: def.tone,
              category: def.category,
            });
          }

          // Record that we've shown these patterns
          await recordShownPatterns(user.id, selectedPatterns);
        }

        setPatterns(selectedPatterns);
      } catch (error) {
        console.error('Error analyzing patterns:', error);
      } finally {
        setIsLoading(false);
      }
    }

    analyzePatterns();

    // Refresh patterns daily
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const refreshTimer = setTimeout(() => {
      analyzePatterns();
    }, msUntilMidnight);

    return () => clearTimeout(refreshTimer);
  }, []);

  return { patterns, isLoading, hasPatterns: patterns.length > 0 };
}
