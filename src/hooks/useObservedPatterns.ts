import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PatternTone = 'coach' | 'warm';

export interface ObservedPattern {
  id: string;
  observation: string;
  tone: PatternTone;
  category: 'training' | 'recovery' | 'sleep' | 'stress' | 'symptoms';
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

        const sessions = (sessionsRes.data || []) as WearableSession[];
        const symptoms = (symptomsRes.data || []) as SymptomCheckIn[];
        const recovery = recoveryRes.data as RecoveryProfile | null;
        const lifestyle = lifestyleRes.data as LifestyleProfile | null;

        const observedPatterns: ObservedPattern[] = [];

        // Analyze sleep and readiness correlation
        if (sessions.length >= 5) {
          const sleepScores = sessions.filter(s => s.sleep_score !== null).map(s => s.sleep_score!);
          const readinessScores = sessions.filter(s => s.readiness_score !== null).map(s => s.readiness_score!);
          
          if (sleepScores.length >= 3 && readinessScores.length >= 3) {
            const avgSleep = sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length;
            const avgReadiness = readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length;
            
            // Check for low sleep affecting readiness pattern
            const lowSleepDays = sessions.filter(s => s.sleep_score !== null && s.sleep_score < 70);
            if (lowSleepDays.length >= 2) {
              observedPatterns.push({
                id: 'sleep-readiness',
                observation: "When your sleep quality dips below your usual range, your readiness scores tend to follow within a day or two. Prioritizing rest during these periods often helps you bounce back more quickly.",
                tone: 'warm',
                category: 'sleep',
              });
            }
            
            // Strong readiness pattern
            if (avgReadiness > 75) {
              observedPatterns.push({
                id: 'high-readiness',
                observation: "Your readiness tends to stay elevated when you maintain consistent sleep timing. Days with better alignment often show in your next morning's scores.",
                tone: 'coach',
                category: 'recovery',
              });
            }
          }
        }

        // Analyze HRV patterns
        if (sessions.length >= 7) {
          const hrvValues = sessions.filter(s => s.hrv_avg !== null).map(s => s.hrv_avg!);
          if (hrvValues.length >= 5) {
            const avgHrv = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
            const hrvVariance = hrvValues.reduce((sum, v) => sum + Math.pow(v - avgHrv, 2), 0) / hrvValues.length;
            
            if (hrvVariance > 100) {
              observedPatterns.push({
                id: 'hrv-variability',
                observation: "Your heart rate variability shows natural fluctuation throughout the week. Higher values often appear after lighter activity days, suggesting your body responds well to balanced effort and rest.",
                tone: 'coach',
                category: 'training',
              });
            }
          }
        }

        // Analyze activity and recovery
        if (sessions.length >= 5) {
          const activityScores = sessions.filter(s => s.activity_score !== null).map(s => s.activity_score!);
          if (activityScores.length >= 3) {
            const highActivityDays = activityScores.filter(s => s > 80).length;
            if (highActivityDays >= 2) {
              observedPatterns.push({
                id: 'activity-pattern',
                observation: "After days with higher activity levels, your metrics sometimes need an extra day to stabilize. This is a normal part of how your body adapts to training demands.",
                tone: 'coach',
                category: 'training',
              });
            }
          }
        }

        // Analyze symptom patterns
        if (symptoms.length >= 2) {
          const painSymptoms = symptoms.filter(s => 
            s.symptom_type.toLowerCase().includes('pain') || 
            s.symptom_type.toLowerCase().includes('soreness')
          );
          const fatigueSymptoms = symptoms.filter(s => 
            s.symptom_type.toLowerCase().includes('fatigue') || 
            s.symptom_type.toLowerCase().includes('tired')
          );

          if (painSymptoms.length >= 2) {
            observedPatterns.push({
              id: 'pain-pattern',
              observation: "You've noted discomfort a few times recently. These check ins help us understand what activities or conditions might be contributing, so we can adjust recommendations accordingly.",
              tone: 'warm',
              category: 'symptoms',
            });
          }

          if (fatigueSymptoms.length >= 2) {
            observedPatterns.push({
              id: 'fatigue-pattern',
              observation: "Fatigue has come up in your recent notes. When this happens, your body may be asking for more recovery time. We factor this into your guidance to help you feel more balanced.",
              tone: 'warm',
              category: 'symptoms',
            });
          }
        }

        // Stress and recovery connection
        if (lifestyle?.stress_level) {
          const stressLevel = lifestyle.stress_level.toLowerCase();
          if (stressLevel === 'high' || stressLevel === 'very high') {
            observedPatterns.push({
              id: 'stress-recovery',
              observation: "During busier or more demanding periods, your recovery metrics sometimes reflect the extra load. This is your body's way of communicating, and we adjust expectations to support you through these times.",
              tone: 'warm',
              category: 'stress',
            });
          }
        }

        // Sleep quality observations
        if (recovery?.sleep_quality) {
          const quality = recovery.sleep_quality.toLowerCase();
          if (quality === 'poor' || quality === 'fair') {
            observedPatterns.push({
              id: 'sleep-quality',
              observation: "Your sleep profile suggests rest has been a work in progress. Small improvements in sleep consistency often show up in your daytime energy and readiness within a few days.",
              tone: 'warm',
              category: 'sleep',
            });
          }
        }

        // Limit to most relevant patterns (max 4)
        setPatterns(observedPatterns.slice(0, 4));
      } catch (error) {
        console.error('Error analyzing patterns:', error);
      } finally {
        setIsLoading(false);
      }
    }

    analyzePatterns();
  }, []);

  return { patterns, isLoading, hasPatterns: patterns.length > 0 };
}
