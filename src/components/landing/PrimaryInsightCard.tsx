import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, AlertCircle } from 'lucide-react';

interface PrimaryInsightCardProps {
  focus: string | undefined;
  summary: string | undefined;
  isLoading?: boolean;
  error?: string | null;
}

export function PrimaryInsightCard({ focus, summary, isLoading, error }: PrimaryInsightCardProps) {
  if (isLoading) {
    return (
      <Card className="border border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-destructive/30 bg-destructive/5 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">Unable to load insights</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!focus && !summary) {
    return (
      <Card className="border border-border/50 bg-muted/30 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Your insight is being prepared</p>
              <p className="text-sm text-muted-foreground">
                Connect your wearable or check back later for personalized guidance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Today's Focus
          </span>
        </div>
        
        {focus && (
          <p className="text-lg font-medium text-foreground leading-relaxed">
            {focus}
          </p>
        )}
        
        {summary && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {summary}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
