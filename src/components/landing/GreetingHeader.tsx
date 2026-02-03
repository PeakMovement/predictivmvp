import { PersonalContextChips } from '@/components/dashboard/PersonalContextChips';
import { Skeleton } from '@/components/ui/skeleton';

interface GreetingHeaderProps {
  userName: string | null;
  isLoading?: boolean;
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function GreetingHeader({ userName, isLoading }: GreetingHeaderProps) {
  const greeting = getTimeBasedGreeting();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {isLoading ? (
          <Skeleton className="h-8 w-48" />
        ) : (
          <h1 className="text-2xl font-semibold text-foreground">
            {greeting}{userName ? `, ${userName}` : ''}
          </h1>
        )}
      </div>
      <PersonalContextChips />
    </div>
  );
}
