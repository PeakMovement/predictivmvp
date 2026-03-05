import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Target } from 'lucide-react';
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
            performance: "Improve Athletic Performance",
            recovery: "Optimize Recovery",
            health: "General Health & Wellness",
            weight: "Weight Management",
            sleep: "Better Sleep Quality",
            stress: "Reduce Stress",
          };
          const raw = data.goals[0];
          setPrimaryGoal(goalLabels[raw] ?? raw);
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
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Active Goal
        </p>
      </div>
      <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
          {primaryGoal}
        </p>
        <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-1.5 leading-relaxed">
          Today's insights are framed to protect this priority. Recommendations consider how current choices affect your longer term trajectory.
        </p>
      </div>
    </div>
  );
}
