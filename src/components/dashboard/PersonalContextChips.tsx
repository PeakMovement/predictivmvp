import { usePersonalContext, PersonalContextChip } from '@/hooks/usePersonalContext';
import { cn } from '@/lib/utils';
import { Heart, Target, Activity, Moon, Briefcase, User } from 'lucide-react';

const categoryIcons: Record<PersonalContextChip['category'], React.ReactNode> = {
  injury: <Activity className="h-3 w-3" />,
  lifestyle: <User className="h-3 w-3" />,
  stress: <Heart className="h-3 w-3" />,
  sleep: <Moon className="h-3 w-3" />,
  medical: <Heart className="h-3 w-3" />,
  workload: <Briefcase className="h-3 w-3" />,
  goal: <Target className="h-3 w-3" />,
};

const toneStyles: Record<PersonalContextChip['tone'], string> = {
  coach: 'bg-primary/10 text-primary border-primary/20',
  warm: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  strategic: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
};

interface PersonalContextChipsProps {
  className?: string;
}

export function PersonalContextChips({ className }: PersonalContextChipsProps) {
  const { chips, isLoading } = usePersonalContext();

  if (isLoading || chips.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Your context today
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <div
            key={chip.id}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              toneStyles[chip.tone]
            )}
          >
            {categoryIcons[chip.category]}
            <span>{chip.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
