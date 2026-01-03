import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type InsightTone = 'coach' | 'warm' | 'strategic';

export interface PersonalizedExplanation {
  text: string;
  tone: InsightTone;
}

interface UserContext {
  injuries: string[];
  conditions: string[];
  goals: string[];
  stressLevel: string | null;
  sleepQuality: string | null;
  activityLevel: string | null;
  recentSymptoms: string[];
  hasSleepDebt: boolean;
}

// Detect the category of an insight to determine tone
function detectInsightCategory(text: string): InsightTone {
  const lowerText = text.toLowerCase();
  
  // Training/performance keywords -> coach tone
  const coachKeywords = [
    'training', 'load', 'workout', 'exercise', 'activity', 'steps', 
    'calories', 'intensity', 'performance', 'readiness', 'hrv', 
    'heart rate', 'strain', 'recovery score', 'physical'
  ];
  
  // Wellbeing keywords -> warm tone
  const warmKeywords = [
    'sleep', 'rest', 'fatigue', 'tired', 'stress', 'pain', 
    'soreness', 'discomfort', 'recovery', 'energy', 'mood',
    'anxiety', 'overwhelm', 'burnout'
  ];
  
  // Goal/planning keywords -> strategic tone
  const strategicKeywords = [
    'goal', 'target', 'plan', 'progress', 'milestone', 'objective',
    'schedule', 'timeline', 'priority', 'focus', 'direction'
  ];
  
  const hasCoach = coachKeywords.some(k => lowerText.includes(k));
  const hasWarm = warmKeywords.some(k => lowerText.includes(k));
  const hasStrategic = strategicKeywords.some(k => lowerText.includes(k));
  
  // Prioritize warm tone for wellbeing, then strategic, then coach
  if (hasWarm) return 'warm';
  if (hasStrategic) return 'strategic';
  if (hasCoach) return 'coach';
  
  return 'warm'; // Default to warm for reassurance
}

// Generate personalized explanation based on user context and insight category
function generateExplanation(
  insightText: string,
  context: UserContext,
  tone: InsightTone
): string {
  const lowerText = insightText.toLowerCase();
  
  // Build context aware explanation fragments
  const hasInjuryContext = context.injuries.length > 0;
  const hasStressContext = context.stressLevel === 'high' || context.stressLevel === 'very high';
  const hasSleepContext = context.sleepQuality === 'poor' || context.sleepQuality === 'fair' || context.hasSleepDebt;
  const hasGoalContext = context.goals.length > 0;
  const hasRecentSymptoms = context.recentSymptoms.length > 0;
  
  // Coach tone explanations (training, performance, physical)
  if (tone === 'coach') {
    if (hasInjuryContext && (lowerText.includes('load') || lowerText.includes('activity'))) {
      return "Given your current physical considerations, we're keeping an eye on how your body responds to training demands. This helps us adjust intensity to support your progress without overreaching.";
    }
    if (hasSleepContext && lowerText.includes('readiness')) {
      return "Your recent rest patterns suggest your body may benefit from a more measured approach today. This insight helps calibrate expectations so you can perform at your best when it counts.";
    }
    if (lowerText.includes('hrv') || lowerText.includes('heart rate')) {
      return "These markers reflect how your nervous system is adapting to recent demands. Understanding this helps us time your harder efforts for when you're most prepared.";
    }
    if (lowerText.includes('activity') || lowerText.includes('steps')) {
      return "Your movement patterns tell us about your daily load and readiness. This context helps balance active days with the recovery your body needs.";
    }
    return "This insight reflects your body's current capacity. We use this to fine tune recommendations so your training stays productive and sustainable.";
  }
  
  // Warm tone explanations (wellbeing, recovery, stress)
  if (tone === 'warm') {
    if (hasStressContext && (lowerText.includes('sleep') || lowerText.includes('rest'))) {
      return "We know you've been navigating higher demands lately. This is simply a gentle reminder that your rest matters, and small improvements here can make your days feel more manageable.";
    }
    if (hasRecentSymptoms && lowerText.includes('fatigue')) {
      return "Based on what you've shared recently, this pattern makes sense. Your body is communicating, and we're here to help you respond with kindness rather than pressure.";
    }
    if (hasSleepContext) {
      return "Rest has been a focus area for you, and this insight helps us understand the bigger picture. Even small shifts in your sleep can create meaningful changes in how you feel.";
    }
    if (lowerText.includes('stress') || lowerText.includes('overwhelm')) {
      return "Life brings its share of demands, and noticing this is the first step. This isn't about adding pressure—it's about giving you information to make choices that support your wellbeing.";
    }
    if (lowerText.includes('recovery') || lowerText.includes('energy')) {
      return "Your energy is worth protecting. This insight helps us understand what your body needs so we can offer suggestions that feel supportive rather than demanding.";
    }
    return "This is about understanding your whole picture, not just the numbers. We're here to support you in making choices that feel right for where you are today.";
  }
  
  // Strategic tone explanations (goals, planning, direction)
  if (tone === 'strategic') {
    if (hasGoalContext) {
      return "This connects to the objectives you're working toward. Understanding these patterns helps us align daily choices with your longer term direction.";
    }
    if (lowerText.includes('progress') || lowerText.includes('trend')) {
      return "Tracking patterns over time reveals what's working and what might need adjustment. This data point adds clarity to your overall trajectory.";
    }
    if (lowerText.includes('plan') || lowerText.includes('schedule')) {
      return "Your time and energy are finite resources. This insight helps inform how to allocate them in ways that serve your priorities.";
    }
    return "This information contributes to a clearer picture of where you are and where you're heading. It helps inform decisions without adding complexity.";
  }
  
  return "This insight is part of your personalized picture. We consider your unique context when making recommendations.";
}

export function usePersonalizedInsights() {
  const [context, setContext] = useState<UserContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContext() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const [profileRes, lifestyleRes, recoveryRes, symptomsRes, sessionsRes] = await Promise.all([
          supabase.from('user_profile').select('injuries, conditions, goals, activity_level').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_lifestyle').select('stress_level').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_recovery').select('sleep_quality').eq('user_id', user.id).maybeSingle(),
          supabase.from('symptom_check_ins').select('symptom_type').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('wearable_sessions').select('sleep_score').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
        ]);

        const profile = profileRes.data;
        const lifestyle = lifestyleRes.data;
        const recovery = recoveryRes.data;
        const symptoms = symptomsRes.data || [];
        const sessions = sessionsRes.data || [];

        // Calculate sleep debt
        const avgSleepScore = sessions.length > 0
          ? sessions.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / sessions.length
          : null;
        const hasSleepDebt = avgSleepScore !== null && avgSleepScore < 70;

        setContext({
          injuries: profile?.injuries || [],
          conditions: profile?.conditions || [],
          goals: profile?.goals || [],
          stressLevel: lifestyle?.stress_level || null,
          sleepQuality: recovery?.sleep_quality || null,
          activityLevel: profile?.activity_level || null,
          recentSymptoms: symptoms.map(s => s.symptom_type),
          hasSleepDebt,
        });
      } catch (error) {
        console.error('Error fetching user context for insights:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContext();
  }, []);

  const getExplanation = useMemo(() => {
    return (insightText: string): PersonalizedExplanation | null => {
      if (!context) return null;
      
      const tone = detectInsightCategory(insightText);
      const text = generateExplanation(insightText, context, tone);
      
      return { text, tone };
    };
  }, [context]);

  return { getExplanation, isLoading, hasContext: context !== null };
}
