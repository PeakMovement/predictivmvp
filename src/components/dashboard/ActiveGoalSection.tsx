import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ActiveGoalSectionProps {
  className?: string;
}

export function ActiveGoalSection({ className }: ActiveGoalSectionProps) {
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGoal() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from('user_profile')
          .select('goals')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.goals && data.goals.length > 0) {
          const goalLabels: Record<string, string> = {
            injury_prevention: "Injury Prevention",
            performance: "Performance",
            recovery: "Better Recovery",
            stress: "Stress Management",
            longevity: "Longevity",
            rehab: "Rehab / Healing",
            health_fitness: "Health & Fitness",
            injury_recovery: "Injury Recovery",
            weight_management: "Weight Management",
            general_wellness: "General Wellness",
            health: "General Health & Wellness",
            weight: "Weight Management",
            sleep: "Better Sleep Quality",
          };
          const raw = data.goals[0];
          setPrimaryGoal(goalLabels[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
        }
      } catch (error) {
        console.error('Error fetching user goal:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGoal();
  }, []);

  if (isLoading || !primaryGoal) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="font-mono text-[8px] tracking-[0.4em] uppercase text-coldBlue/40">
        Active Goal
      </p>
      <div className="border border-coldBlue/15 bg-coldBlue/[0.03] p-4">
        <p className="font-sans text-sm font-medium text-coldBlue tracking-wide">
          {primaryGoal}
        </p>
        <p className="font-sans text-xs text-marble1/40 mt-1.5 leading-relaxed tracking-wide">
          Insights are framed around this priority. Recommendations consider how current choices affect your trajectory.
        </p>
      </div>
    </div>
  );
}
