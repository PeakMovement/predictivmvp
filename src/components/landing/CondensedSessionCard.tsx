import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dumbbell, Clock, Activity, ChevronRight } from 'lucide-react';
import { TodaysDecision } from '@/hooks/useTodaysDecision';
import { Link } from 'react-router-dom';

interface CondensedSessionCardProps {
  decision: TodaysDecision | null;
  isLoading?: boolean;
}

export function CondensedSessionCard({ decision, isLoading }: CondensedSessionCardProps) {
  if (isLoading) {
    return (
      <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const structuredSession = decision?.riskDrivers?.correctiveAction?.session;
  const riskLevel = decision?.riskDrivers?.riskLevel;

  if (!decision || !structuredSession) {
    return null;
  }

  const getRiskLevelColor = (level: string | undefined) => {
    switch (level) {
      case 'high': return 'text-destructive';
      case 'moderate': return 'text-amber-600 dark:text-amber-500';
      default: return 'text-primary';
    }
  };

  return (
    <Card className="border border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recommended Session
            </span>
          </div>
          {riskLevel && riskLevel !== 'low' && (
            <span className={`text-xs font-medium capitalize ${getRiskLevelColor(riskLevel)}`}>
              {riskLevel} priority
            </span>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">
            {structuredSession.title}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{structuredSession.duration}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <span>RPE {structuredSession.intensity.rpe}</span>
            </div>
          </div>

          {structuredSession.sessionGoal && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {structuredSession.sessionGoal}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button asChild variant="default" size="sm" className="flex-1">
            <Link to="/dashboard">
              View Full Session
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
