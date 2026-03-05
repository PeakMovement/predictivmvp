import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PersonalContextChip {
  id: string;
  label: string;
  category: 'injury' | 'lifestyle' | 'stress' | 'sleep' | 'medical' | 'workload' | 'goal';
  tone: 'coach' | 'warm' | 'strategic';
}

interface ProfileData {
  injuries: string[] | null;
  conditions: string[] | null;
  goals: string[] | null;
  activity_level: string | null;
}

interface LifestyleData {
  stress_level: string | null;
  work_schedule: string | null;
}

interface RecoveryData {
  sleep_quality: string | null;
  sleep_hours: number | null;
}

interface RecentSymptom {
  symptom_type: string;
  severity: string;
  created_at: string;
}

interface RecentSession {
  sleep_score: number | null;
  readiness_score: number | null;
}

export function usePersonalContext() {
  const [chips, setChips] = useState<PersonalContextChip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContext() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch all relevant profile data in parallel
        const [profileRes, lifestyleRes, recoveryRes, symptomsRes, sessionsRes] = await Promise.all([
          supabase.from('user_profile').select('injuries, conditions, goals, activity_level').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_lifestyle').select('stress_level, work_schedule').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_recovery').select('sleep_quality, sleep_hours').eq('user_id', user.id).maybeSingle(),
          supabase.from('symptom_check_ins').select('symptom_type, severity, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('wearable_sessions').select('sleep_score, readiness_score').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
        ]);

        const profile = profileRes.data as ProfileData | null;
        const lifestyle = lifestyleRes.data as LifestyleData | null;
        const recovery = recoveryRes.data as RecoveryData | null;
        const recentSymptoms = (symptomsRes.data || []) as RecentSymptom[];
        const recentSessions = (sessionsRes.data || []) as RecentSession[];

        const contextChips: PersonalContextChip[] = [];

        // Injury context (coach tone)
        if (profile?.injuries && profile.injuries.length > 0) {
          const injuryCount = profile.injuries.length;
          contextChips.push({
            id: 'injury-history',
            label: injuryCount === 1 
              ? 'Managing one area of concern' 
              : `Working around ${injuryCount} physical considerations`,
            category: 'injury',
            tone: 'coach',
          });
        }

        // Medical conditions (warm tone)
        if (profile?.conditions && profile.conditions.length > 0) {
          contextChips.push({
            id: 'medical-context',
            label: 'Health profile considered',
            category: 'medical',
            tone: 'warm',
          });
        }

        // Stress level (warm tone)
        if (lifestyle?.stress_level) {
          const level = lifestyle.stress_level.toLowerCase();
          if (level === 'high' || level === 'very high') {
            contextChips.push({
              id: 'stress-level',
              label: 'Currently navigating higher demands',
              category: 'stress',
              tone: 'warm',
            });
          }
        }

        // Work schedule context (strategic tone)
        if (lifestyle?.work_schedule) {
          const schedule = lifestyle.work_schedule.toLowerCase();
          if (schedule.includes('demanding') || schedule.includes('busy') || schedule.includes('full')) {
            contextChips.push({
              id: 'work-context',
              label: 'Busy professional schedule',
              category: 'workload',
              tone: 'strategic',
            });
          }
        }

        // Sleep context (warm tone)
        if (recovery?.sleep_quality) {
          const quality = recovery.sleep_quality.toLowerCase();
          if (quality === 'poor' || quality === 'fair') {
            contextChips.push({
              id: 'sleep-quality',
              label: 'Rest optimization in focus',
              category: 'sleep',
              tone: 'warm',
            });
          }
        }

        // Check for sleep debt from recent sessions
        if (recentSessions.length >= 3) {
          const avgSleepScore = recentSessions
            .filter(s => s.sleep_score !== null)
            .reduce((sum, s) => sum + (s.sleep_score || 0), 0) / 
            recentSessions.filter(s => s.sleep_score !== null).length;
          
          if (avgSleepScore && avgSleepScore < 70) {
            contextChips.push({
              id: 'sleep-debt',
              label: 'Recovery is a priority this week',
              category: 'sleep',
              tone: 'warm',
            });
          }
        }

        // Recent symptoms context (warm tone)
        const recentPainSymptoms = recentSymptoms.filter(s => {
          const daysSince = (Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 7 && (s.symptom_type.toLowerCase().includes('pain') || s.symptom_type.toLowerCase().includes('fatigue'));
        });

        if (recentPainSymptoms.length > 0) {
          contextChips.push({
            id: 'recent-symptoms',
            label: 'Recent feedback noted',
            category: 'lifestyle',
            tone: 'warm',
          });
        }

        // Goals context (strategic tone)
        if (profile?.goals && profile.goals.length > 0) {
          const goalCount = profile.goals.length;
          contextChips.push({
            id: 'active-goals',
            label: goalCount === 1 
              ? 'One active objective' 
              : `${goalCount} objectives in view`,
            category: 'goal',
            tone: 'strategic',
          });
        }

        // Activity level context (coach tone)
        if (profile?.activity_level) {
          const level = profile.activity_level.toLowerCase();
          if (level === 'elite' || level === 'competitive') {
            contextChips.push({
              id: 'activity-level',
              label: 'Performance focused',
              category: 'lifestyle',
              tone: 'coach',
            });
          } else if (level === 'beginner' || level === 'returning') {
            contextChips.push({
              id: 'activity-level',
              label: 'Building foundation phase',
              category: 'lifestyle',
              tone: 'coach',
            });
          }
        }

        // Limit to most relevant chips (max 4)
        setChips(contextChips.slice(0, 4));
      } catch (error) {
        console.error('Error fetching personal context:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContext();
  }, []);

  return { chips, isLoading };
}
